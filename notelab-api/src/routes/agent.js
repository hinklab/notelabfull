const express = require('express');
const router = express.Router();
const https = require('https');
const { readDB, writeDB, getUserSettings } = require('../services/database');

function geminiRequest(messages, apiKey, model = 'gemini-2.0-flash-exp') {
  return new Promise((resolve, reject) => {
    const systemMsg = messages.find(m => m.role === 'system');
    const chatMsgs = messages.filter(m => m.role !== 'system');

    const bodyObj = {
      contents: chatMsgs.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 1000,
      },
    };
    
    if (systemMsg) {
      bodyObj.systemInstruction = { parts: [{ text: systemMsg.content }] };
    }

    const body = JSON.stringify(bodyObj);
    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/${model}:generateContent?key=` + encodeURIComponent(apiKey),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          console.error('Gemini error:', data);
          return reject(new Error(`Gemini API xato: ${res.statusCode}`));
        }
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function extractJSON(text) {
  try { return JSON.parse(text); } catch {}
  const clean = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  try { return JSON.parse(clean); } catch {}
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch {}
  }
  return null;
}

function formatHistoryForPrompt(history) {
  if (!Array.isArray(history) || !history.length) return '(bosh)';
  return history
    .map(m => {
      const who = m.role === 'user' ? 'Foydalanuvchi' : 'Agent';
      return `${who}: ${m.text}`;
    })
    .join('\n');
}

function formatMoviesForPrompt(movies) {
  if (!movies?.length) return '(bo\'sh)';
  return movies.map(m => `ID:${m.id} "${m.title}" [${m.section}]`).join('\n');
}

const AGENT_SYSTEM = `You are agelab, a movie tracker assistant. User writes in Uzbek. Respond with exactly one JSON object and nothing else. Use double quotes for all strings. Do not include markdown, backticks, commentary, or extra text around the JSON.`;

const AGENT_PROMPT = `Sections: futured=upcoming, todo=want to watch, doing=watching, done=watched.

Current movies:
{{MOVIES}}

Recent conversation:
{{HISTORY}}

User message: "{{USER_MSG}}"

Actions:
- add — new movie (title, section)
- move — movie_id + to_section
- delete — movie_id
- list — list section
- chat — general reply

JSON only:
{"action":"add|move|delete|list|chat","title":null,"section":null,"to_section":null,"movie_id":null,"reply":"Uzbek reply"}`;

router.post('/chat', async (req, res) => {
  try {
    const { message, history, noteCtx } = req.body;
    const db = readDB();
    const settings = getUserSettings(req.userId, db);
    const geminiKey = settings.gemini_key || '';
    if (!geminiKey) {
      return res.json({
        reply: "Gemini API kaliti yo'q. Sozlamalarda kiriting.",
        action: 'chat'
      });
    }

    const note_id = noteCtx?.note_id ?? null;
    const movies = (db.movies || []).filter(m => (m.note_id ?? null) === note_id);
    const chatHistory = Array.isArray(history) ? history.slice(-10) : [];

    const prompt = AGENT_PROMPT
      .replace('{{MOVIES}}', formatMoviesForPrompt(movies))
      .replace('{{HISTORY}}', formatHistoryForPrompt(chatHistory))
      .replace('{{USER_MSG}}', message);

    const geminiMessages = [
      { role: 'system', content: AGENT_SYSTEM },
      ...chatHistory.slice(-8).map(m => ({ 
        role: m.role === 'user' ? 'user' : 'assistant', 
        content: m.text 
      })),
      { role: 'user', content: prompt },
    ];

    const resp = await geminiRequest(geminiMessages, geminiKey);
    const text = resp?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log('Agent raw response:', text);
    
    const parsed = extractJSON(text);
    if (!parsed) {
      return res.json({ 
        reply: 'Tushunmadim, qayta yozing.', 
        action: 'chat' 
      });
    }

    // Handle actions
    if (parsed.action === 'add' && parsed.title) {
      const section = parsed.section || 'todo';
      const title = parsed.title;
      
      // Simple add without API calls for now
      const ids = (db.movies || []).map(m => m.id);
      const newId = ids.length ? Math.max(...ids) + 1 : 1;
      
      const newMovie = {
        id: newId,
        tmdb_id: null,
        imdb_id: null,
        title: title,
        release_date: null,
        release_year: '-',
        rating: null,
        vote_count: null,
        genre: '-',
        director: '-',
        seasons: '-',
        poster_path: null,
        section: section,
        position: 0,
        note_id: note_id,
        note: '',
      };
      
      if (!db.movies) db.movies = [];
      db.movies.push(newMovie);
      writeDB(db);
      
      return res.json({
        reply: parsed.reply || `"${title}" ${section} bo'limiga qo'shildi.`,
        action: 'add',
        movie: newMovie
      });
    }

    if (parsed.action === 'move' && parsed.movie_id && parsed.to_section) {
      const movieId = parseInt(parsed.movie_id);
      const idx = (db.movies || []).findIndex(m => m.id === movieId);
      
      if (idx !== -1) {
        db.movies[idx].section = parsed.to_section;
        writeDB(db);
        
        return res.json({
          reply: parsed.reply || `Film ${parsed.to_section} bo'limiga ko'chirildi.`,
          action: 'move',
          movie: db.movies[idx]
        });
      }
    }

    if (parsed.action === 'delete' && parsed.movie_id) {
      const movieId = parseInt(parsed.movie_id);
      const movie = (db.movies || []).find(m => m.id === movieId);
      
      if (movie) {
        db.movies = db.movies.filter(m => m.id !== movieId);
        writeDB(db);
        
        return res.json({
          reply: parsed.reply || `"${movie.title}" o'chirildi.`,
          action: 'delete'
        });
      }
    }

    // Default: return chat response
    res.json({
      reply: parsed.reply || 'Tushunmadim.',
      action: parsed.action || 'chat'
    });

  } catch (err) {
    console.error('Agent error:', err);
    res.status(500).json({ 
      error: err.message,
      reply: 'Xatolik yuz berdi. Qayta urinib ko\'ring.'
    });
  }
});

module.exports = router;
