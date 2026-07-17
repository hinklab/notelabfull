const https = require('https')
const path = require('path')
const fs = require('fs')
const { app } = require('electron')
const { resolveMovieMetadata } = require('../services/omdbService')
const { resolveFuturedMetadata } = require('../services/tmdbService')
const { searchContent } = require('../services/contentService')

function readDB() {
  try {
    const dbPath = path.join(app.getPath('userData'), 'notelab.json')
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'))
    if (fixMovieSections(db)) writeDB(db)
    return db
  } catch (e) {
    return { movies: [], settings: {}, agent_memory: [] }
  }
}

function writeDB(db) {
  const dbPath = path.join(app.getPath('userData'), 'notelab.json')
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8')
  try {
    console.log(`Wrote DB to ${dbPath} (movies=${(db.movies||[]).length})`)
  } catch (e) {}
}

function nextId(movies) {
  const ids = movies.map(m => m.id)
  return ids.length ? Math.max(...ids) + 1 : 1
}

function formatHistoryForPrompt(history) {
  if (!Array.isArray(history) || !history.length) return '(bosh)'
  return history
    .map(m => {
      const who = m.role === 'user' ? 'Foydalanuvchi' : 'Agent'
      return `${who}: ${m.text}`
    })
    .join('\n')
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function geminiRequest(messages, apiKey, model = 'gemini-2.5-flash') {
  return new Promise((resolve, reject) => {
    const systemMsg = messages.find(m => m.role === 'system')
    const chatMsgs = messages.filter(m => m.role !== 'system')

    const bodyObj = {
      contents: chatMsgs.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      })),
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 1000,
      },
    }
    if (systemMsg) {
      bodyObj.systemInstruction = { parts: [{ text: systemMsg.content }] }
    }

    const body = JSON.stringify(bodyObj)
    const options = {
      hostname: 'generativelanguage.googleapis.com',
      path: `/v1beta/models/${model}:generateContent?key=` + encodeURIComponent(apiKey),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }
    const req = https.request(options, (res) => {
      const statusCode = res.statusCode
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        console.log(`Gemini response status: ${statusCode} ${res.statusMessage} (${model})`)
        if (statusCode !== 200) {
          console.error('Gemini error body:', data)
          let errMsg = `Gemini request failed with status ${statusCode}`
          if (statusCode === 401 || statusCode === 403) {
            errMsg = 'Gemini API kaliti noto\'g\'ri yoki muddati o\'tgan. Sozlamalarda yangi kalit kiriting.'
          } else if (statusCode === 429) {
            try {
              const errBody = JSON.parse(data)
              const msg = errBody?.error?.message || ''
              if (/quota|limit:\s*0/i.test(msg)) {
                errMsg = 'Gemini bepul kvota tugagan yoki bu model uchun limit yo\'q. Bir necha daqiqa kuting yoki aistudio.google.com da billing/kvotani tekshiring.'
              } else {
                errMsg = 'Gemini so\'rovlar limiti oshdi (429). Bir oz kuting.'
              }
            } catch {
              errMsg = 'Gemini so\'rovlar limiti oshdi (429). Bir oz kuting.'
            }
          } else if (statusCode === 400) {
            errMsg = `Gemini so\'rov xatosi (400): ${data}`
          } else if (statusCode === 503 || statusCode === 502 || statusCode === 504) {
            errMsg = 'Gemini vaqtincha ishlamayapti (503). Bir necha soniyadan keyin qayta uriniladi.'
          }
          const err = new Error(errMsg)
          err.statusCode = statusCode
          return reject(err)
        }
        try {
          resolve(JSON.parse(data))
        } catch (e) {
          console.error('Gemini parse failed:', e.message)
          console.error('Gemini raw body:', data)
          reject(e)
        }
      })
    })
    req.on('error', (err) => {
      console.error('Gemini request error:', err.message)
      reject(err)
    })
    req.write(body)
    req.end()
  })
}

const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash-lite', 'gemini-flash-latest']

async function geminiRequestWithRetry(messages, apiKey) {
  const retryDelays = [1500, 3000, 5000]
  let lastErr

  for (const model of GEMINI_MODELS) {
    for (let attempt = 0; attempt <= retryDelays.length; attempt++) {
      try {
        return await geminiRequest(messages, apiKey, model)
      } catch (e) {
        lastErr = e
        const retryable = [503, 502, 504].includes(e.statusCode)
        if (retryable && attempt < retryDelays.length) {
          console.log(`Gemini ${model} ${e.statusCode}, retry ${attempt + 1}/${retryDelays.length}`)
          await sleep(retryDelays[attempt])
          continue
        }
        if ([503, 502, 504].includes(e.statusCode)) break
        throw e
      }
    }
  }

  throw lastErr || new Error('Gemini javob bermadi.')
}

function extractJSON(text) {
  try { return JSON.parse(text) } catch {}
  const clean = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  try { return JSON.parse(clean) } catch {}
  const match = text.match(/\{[\s\S]*\}/)
  if (match) {
    try { return JSON.parse(match[0]) } catch {}
  }
  return null
}

function normalizeText(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\u0400-\u04FF\u00C0-\u017F ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const VALID_SECTIONS = new Set(['futured', 'todo', 'doing', 'done'])

function normalizeSection(section) {
  if (!section) return null
  const s = String(section).toLowerCase().trim()
  const map = {
    futured: 'futured',
    'to do': 'todo',
    todo: 'todo',
    going: 'doing',
    doing: 'doing',
    done: 'done',
    watched: 'done',
  }
  if (map[s]) return map[s]
  if (/futured|chiqadigan|upcoming/.test(s)) return 'futured'
  if (/^to\s*do|todo|ko['']rmoqchi|watch\s*list/.test(s)) return 'todo'
  if (/going|doing|ko['']rayotgan|watching/.test(s)) return 'doing'
  if (/^done$|ko['']rib|watched|tugat/.test(s)) return 'done'
  return VALID_SECTIONS.has(s) ? s : null
}

function fixMovieSections(db) {
  let changed = false
  for (const m of db.movies || []) {
    const norm = normalizeSection(m.section) || 'todo'
    if (m.section !== norm) {
      m.section = norm
      changed = true
    }
  }
  return changed
}

function normalizeMovieTitle(title) {
  return String(title || '')
    .replace(/^(?:DC|Marvel)\s+studios?(?:ning)?\s+/gi, '')
    .replace(/\s+filmi$/gi, '')
    .replace(/^["'«]|["'»]$/g, '')
    .trim()
}

function inferSectionFromMessage(msg) {
  const m = String(msg || '').toLowerCase()
  if (/futured|chiqadigan|upcoming|kelajak/.test(m)) return 'futured'
  if (/ko['']rib\s*bo['']l|done|tugat/.test(m)) return 'done'
  if (/ko['']rayotgan|going|doing|hozir/.test(m)) return 'doing'
  if (/ko['']rmoqchi|todo|watch\s*list/.test(m)) return 'todo'
  return null
}

function looksLikeAddRequest(msg) {
  return /(qo'sh|qosh|qo‘sh|qo'shing|добав|add)/i.test(msg)
}

function looksLikeEnrichRequest(msg) {
  return /(to'?ldir|to'ldirish|ma'?lumotlar|ma'?lumot|yangila|yangilash|enrich|update|reyting|rejissor|director|rating|janr|genre|poster|posterni)/i.test(msg)
}

function extractMovieTitleFromMessage(msg) {
  const text = String(msg || '').trim()
  if (!text) return null

  const patterns = [
    /(.+?)\s+haqidagi\b/i,
    /(.+?)\s+filmini?(?:\s+n(?:i|ing))?\s+(?:ma'?lumot|to'?ldir|barcha)/i,
    /(?:studios?ning|studios)\s+(.+?)\s+filmi/i,
    /(.+?)\s+filmini?\s+(?:ga|bo['']lim|futured|todo|doing|done|chiqadigan)/i,
    /(?:qo'sh|qosh|add)[^.]*?["'«]([^"'»]+)["'»]/i,
    /(?:qo'sh|qosh|add)\s+(?:.*?)([A-Z][\w\s:'-]{2,50}?)(?:\s+filmini?)?\s+(?:ga|to|into)/i,
  ]

  for (const re of patterns) {
    const m = text.match(re)
    if (m?.[1]) {
      const cleaned = normalizeMovieTitle(m[1])
      if (cleaned.length >= 2) return cleaned
    }
  }

  const named = text.match(/\b(Supergirl|Avengers(?::\s*[\w\s]+)?|Batman(?::\s*[\w\s]+)?|Superman(?::\s*[\w\s]+)?)\b/i)
  if (named) return normalizeMovieTitle(named[1])

  return null
}

function isLikelyTitleOnly(msg) {
  const t = String(msg || '').trim()
  if (t.length < 3 || t.length > 90) return false
  if (/\?/.test(t)) return false
  if (/(qaysi|qanday|nima|uchun|iltimos|salom|yordam|topa olmay)/i.test(t)) return false
  if (/^(reyting|rejissor|janr|ha|yo['']q)\b/i.test(t)) return false
  return true
}

function findMovieInConversation(userMsg, history, movies) {
  const titleFromMsg = extractMovieTitleFromMessage(userMsg)
  if (titleFromMsg) {
    const found = findMovieByName(movies, titleFromMsg)
    if (found) return found
  }

  const sources = [...(history || []), { role: 'user', text: userMsg }]
  for (let i = sources.length - 1; i >= 0; i--) {
    const t = extractMovieTitleFromMessage(sources[i].text)
    if (t) {
      const found = findMovieByName(movies, t)
      if (found) return found
    }
  }

  for (let i = sources.length - 1; i >= 0; i--) {
    const normMsg = normalizeText(sources[i].text)
    if (!normMsg) continue
    const matches = movies.filter(m => {
      const nt = normalizeText(m.title)
      return nt.length >= 4 && (normMsg.includes(nt) || nt.includes(normMsg))
    })
    if (matches.length === 1) return matches[0]
    if (matches.length > 1) {
      matches.sort((a, b) => normalizeText(a.title).length - normalizeText(b.title).length)
      return matches[0]
    }
  }

  if (isLikelyTitleOnly(userMsg)) {
    const found = findMovieByName(movies, userMsg.trim())
    if (found) return found
  }

  return null
}

function findMovieForEnrich(userMsg, history, movies) {
  let target = findMovieInConversation(userMsg, history, movies)
  if (target) return target

  const parsedTitle = extractMovieTitleFromMessage(userMsg)
  if (parsedTitle) {
    target = findMovieByName(movies, parsedTitle)
    if (target) return target
  }

  const section = inferSectionFromMessage(userMsg)
  if (section) {
    const sectionMovies = movies.filter(m => m.section === section)
    const sources = [...(history || []), { text: userMsg }]
    for (let i = sources.length - 1; i >= 0; i--) {
      const normMsg = normalizeText(sources[i].text)
      if (!normMsg) continue
      const hits = sectionMovies.filter(m => {
        const nt = normalizeText(m.title)
        return nt.length >= 4 && normMsg.includes(nt)
      })
      if (hits.length === 1) return hits[0]
    }
  }

  return null
}

function findMovieByName(movies, title) {
  const desired = normalizeText(title)
  if (!desired) return null

  const exact = movies.find(m => normalizeText(m.title) === desired)
  if (exact) return exact

  const matches = movies
    .map(m => ({ movie: m, norm: normalizeText(m.title) }))
    .filter(item => item.norm.includes(desired) || desired.includes(item.norm))

  if (matches.length === 1) return matches[0].movie

  const startsWith = matches.filter(item => item.norm.startsWith(desired) || desired.startsWith(item.norm))
  if (startsWith.length === 1) return startsWith[0].movie

  if (matches.length > 1) {
    matches.sort((a, b) => {
      const aExtra = Math.abs(a.norm.length - desired.length)
      const bExtra = Math.abs(b.norm.length - desired.length)
      if (aExtra !== bExtra) return aExtra - bExtra
      return a.norm.length - b.norm.length
    })
    return matches[0].movie
  }

  return null
}

async function addSingleMovie(title, section, omdbKey, db, keywords = [], note_id = null) {
  const preferFuture = section === 'futured'
  const tmdbKey = db.settings?.tmdb_key || ''

  // Faqat aniq bir xil nom dublikat hisoblanadi (franshiza qismlari alohida)
  const normTitle = normalizeText(title)
  const existing = db.movies.find(m => normalizeText(m.title) === normTitle && (m.note_id ?? null) === note_id)
  if (existing) return { _duplicate: true, movie: existing }

  // Futured: avval TMDB
  if (preferFuture && tmdbKey) {
    try {
      const tmdb = await resolveFuturedMetadata(title, tmdbKey, keywords)
      if (tmdb) {
        let positionTmdb
        if (section === 'futured') {
          positionTmdb = db.movies.filter(m => m.section === 'futured' && (m.note_id ?? null) === note_id).length
        } else {
          db.movies
            .filter(m => m.section === section && (m.note_id ?? null) === note_id)
            .forEach(m => { m.position = (m.position || 0) + 1 })
          positionTmdb = 0
        }
        const newMovie = {
          id:           nextId(db.movies),
          tmdb_id:      tmdb.tmdb_id      || null,
          imdb_id:      null,
          title:        tmdb.title        || title,
          release_year: tmdb.year         || '-',
          rating:       null,
          vote_count:   null,
          genre:        tmdb.genre        || '-',
          director:     tmdb.director     || '-',
          seasons:      tmdb.seasons      || '-',
          poster_path:  tmdb.poster       || null,
          release_date: tmdb.release_date || null,
          section,
          position:     positionTmdb,
          note_id,
          note:         '',
        }
        db.movies.push(newMovie)
        return newMovie
      }
    } catch (e) {
      console.error('TMDB addSingleMovie error:', e.message)
    }
  }

  // OMDB fallback (barcha bo'limlar + futured da TMDB topilmasa)
  const resolved = await resolveMovieMetadata(title, { omdbKey, preferFuture, keywords })
  const movieData = resolved || { title, year: '-' }

  let positionOmdb
  if (section === 'futured') {
    positionOmdb = db.movies.filter(m => m.section === 'futured' && (m.note_id ?? null) === note_id).length
  } else {
    db.movies
      .filter(m => m.section === section && (m.note_id ?? null) === note_id)
      .forEach(m => { m.position = (m.position || 0) + 1 })
    positionOmdb = 0
  }
  const newMovie = {
    id:           nextId(db.movies),
    imdb_id:      movieData.imdb_id      || null,
    title:        movieData.title        || title,
    release_year: movieData.year         || movieData.release_year || '-',
    rating:       movieData.rating       ?? null,
    vote_count:   movieData.vote_count   ?? null,
    genre:        movieData.genre        || '-',
    director:     movieData.director     || '-',
    seasons:      movieData.seasons      || '-',
    poster_path:  movieData.poster       || null,
    release_date: movieData.release_date || null,
    section,
    position:     positionOmdb,
    note_id,
    note:         '',
  }
  db.movies.push(newMovie)
  return newMovie
}

async function enrichMovie(movie, omdbKey, db, keywords = []) {
  const preferFuture = movie.section === 'futured'
  const tmdbKey = db.settings?.tmdb_key || ''

  // Futured bo'limi uchun TMDB dan yangilash
  if (preferFuture && tmdbKey) {
    try {
      const tmdb = await resolveFuturedMetadata(movie.title, tmdbKey, keywords)
      if (tmdb) {
        const idx = db.movies.findIndex(m => m.id === movie.id)
        if (idx === -1) return movie
        const updated = {
          ...db.movies[idx],
          title:        tmdb.title        || db.movies[idx].title,
          release_year: tmdb.year         || db.movies[idx].release_year,
          genre:        tmdb.genre && tmdb.genre !== '-'       ? tmdb.genre     : db.movies[idx].genre,
          director:     tmdb.director && tmdb.director !== '-' ? tmdb.director  : db.movies[idx].director,
          seasons:      tmdb.seasons && tmdb.seasons !== '-'   ? tmdb.seasons   : db.movies[idx].seasons,
          poster_path:  tmdb.poster       || db.movies[idx].poster_path,
          tmdb_id:      tmdb.tmdb_id      || db.movies[idx].tmdb_id,
          release_date: tmdb.release_date || db.movies[idx].release_date,
          rating:       null,
          vote_count:   null,
        }
        db.movies[idx] = updated
        return updated
      }
    } catch (e) {
      console.error('TMDB enrichMovie error:', e.message)
    }
  }

  // OMDB fallback
  const resolved = await resolveMovieMetadata(movie.title, {
    omdbKey,
    preferFuture,
    release_year: movie.release_year,
    imdb_id: movie.imdb_id,
  })
  if (!resolved) return movie

  const idx = db.movies.findIndex(m => m.id === movie.id)
  if (idx === -1) return movie

  const updated = {
    ...db.movies[idx],
    title:        resolved.title    || db.movies[idx].title,
    release_year: resolved.year && resolved.year !== '-' ? resolved.year : db.movies[idx].release_year,
    rating:       resolved.rating       ?? db.movies[idx].rating,
    vote_count:   resolved.vote_count   ?? db.movies[idx].vote_count,
    genre:        resolved.genre && resolved.genre !== '-'       ? resolved.genre    : db.movies[idx].genre,
    director:     resolved.director && resolved.director !== '-' ? resolved.director : db.movies[idx].director,
    seasons:      resolved.seasons && resolved.seasons !== '-'   ? resolved.seasons  : db.movies[idx].seasons,
    poster_path:  resolved.poster   || db.movies[idx].poster_path,
    imdb_id:      resolved.imdb_id  || db.movies[idx].imdb_id,
    release_date: resolved.release_date || db.movies[idx].release_date,
  }
  db.movies[idx] = updated
  return updated
}

const AGENT_SYSTEM = `You are agelab, a movie tracker assistant. User writes in Uzbek. You MUST use the full conversation history to resolve follow-up messages. If the user previously named a film and now says "reytinglar, rejissor", "posteri to'g'rilash", or "to'ldir", they mean THAT same film — do not ask which film again.

All movie data (poster, rating, genre, director) comes from IMDb via enrich/add actions. Never claim you fixed something without action=enrich. Never promise "10 daqiqada" — use enrich immediately.

You MUST respond with exactly one JSON object and nothing else. Use double quotes for all strings. Do not include markdown, backticks, commentary, or extra text around the JSON. If the user message is not a movie command, return action:"chat" with a helpful Uzbek reply.

Respond ONLY with valid JSON, no markdown.`

const AGENT_PROMPT = `Sections (section and to_section MUST be lowercase): futured=upcoming, todo=want to watch, doing=watching, done=watched. Never use "Done", "Going", "To Do" — only futured|todo|doing|done.

Franchise / sequel rule: different entries in a series are separate movies (e.g. "Kurtlar Vadisi: Pusu" vs "Kurtlar Vadisi: Bir Mafiya Tarixi" / "Valley of the Wolves" vs "Valley of the Wolves: Ambush") — add each with its exact distinct title unless that exact title already exists.

Current movies (ID, title, section):
{{MOVIES}}

Recent conversation:
{{HISTORY}}

Latest user message: "{{USER_MSG}}"

Actions:
- add — new movie (title, section, keywords: optional array of studio/genre/director hints for disambiguation)
- bulk_add — multiple titles
- move — movie_id + to_section
- delete — movie_id
- enrich — fill/update metadata from IMDb (OMDB): poster, rating, director, genre. Use movie_id from list. Use for "to'ldir", "ma'lumot", "reyting", "posteri to'g'rilash".
- list — list section
- chat — only if truly unclear AND no film in conversation

Context rules:
- Follow-ups without a new film name refer to the film discussed in recent messages.
- "Kurdlar Vadisi: Pusu filmini to'ldir" then "reytinglar, rejissor" → enrich that same movie (find ID in list).
- Never ask "which film?" if the film was named in the last few turns.
- keywords: if user mentions studio ("DC", "Marvel", "Warner"), director, genre, or year — add them to keywords array for better search disambiguation.
  Examples:
  - "Christopher Nolanning Odyssey filmi" → title="Odyssey", keywords=["Christopher Nolan"]
  - "DC studiyasining Supergirl filmi" → title="Supergirl", keywords=["DC", "Warner Bros"]
  - "2026-yil chiqadigan Odyssey" → title="Odyssey", keywords=["2026"]
  - "Marvel Avengers" → title="Avengers", keywords=["Marvel"]

Futured: strip "DC studiosning" etc.; title="Supergirl" from "DC studiosning Supergirl filmi".
Use chat only when no film name in entire conversation.

JSON only:
{"action":"add|bulk_add|move|delete|enrich|list|chat","title":null,"titles":[],"section":null,"to_section":null,"movie_id":null,"keywords":[],"reply":"Uzbek reply"}`

function formatMoviesForPrompt(movies) {
  if (!movies?.length) return '(bo\'sh — foydalanuvchi ekranda film ko\'rmayapti)'
  return movies.map(m => `ID:${m.id} "${m.title}" [${m.section}]`).join('\n')
}

const UI_LIST_RULE = `

UI LIST RULE: The movie list below is EXACTLY what the user currently sees on screen (same columns and search filter). When saying a film exists or listing films, ONLY use this list. If the user asks about a film not listed here, say it is not in their current visible list (they may need to clear search or add it). You may still add/move/delete/enrich via actions — those use the full database.`

const CUSTOM_NOTE_SYSTEM = `You are agelab, a note assistant. User writes in Uzbek. You manage items (books, games, travel places, etc.) in note groups (columns). Respond with exactly one JSON object, no markdown.`

const CUSTOM_NOTE_PROMPT = `Note type: {{NOTE_TYPE}}. Note name: "{{NOTE_NAME}}".

Groups (columns) in this note:
{{GROUPS}}

Items currently in this note:
{{ITEMS}}

Recent conversation:
{{HISTORY}}

User message: "{{USER_MSG}}"

Actions:
- add — add new item (title required, group_id required — pick best matching group)
- update — update existing item title/info (item_id required, new title in "title", new search_query for API)
- move — move item to another group (item_id, to_group_id)
- delete — delete item (item_id)
- add_group — create new group (title = group name, position = optional 0-based index where to insert, e.g. 1 = after first group). Max 5 groups allowed.
- rename_group — rename a group (group_id required, title = new name)
- delete_group — delete a group and all its items (group_id required)
- reorder_groups — reorder groups by new order (group_ids: array of group IDs in new order)
- list — list items
- chat — general reply

JSON format:
{"action":"add|update|move|delete|add_group|rename_group|delete_group|reorder_groups|list|chat","title":null,"search_query":null,"group_id":null,"item_id":null,"to_group_id":null,"group_ids":null,"position":null,"reply":"Uzbek reply"}

Rules:
- For "add": pick the most fitting group_id from the groups list based on context. If unclear, pick first group.
- For "update": use when user says item name was wrong, wants to rename, or correct a mistake. Find item_id from items list by the old name. Set new "title" and "search_query".
- "title": the display name (can be in Uzbek as user said it).
- "search_query": REQUIRED for books/games/travel types. Always the English or original-language name for API search. Translate Uzbek names to English. Examples: "Qo'zichoqlar sukunati"→"The Silence of the Lambs", "Parijga sayohat"→"Paris", "nwc"→"New York City". If already English, copy to search_query. Never leave search_query null for books/games/travel.
- For "move": find item by name from items list.
- For "add_group": title is the group name. Max 5 groups total. If user says "between X and Y" or "after X" or "before Y", set position accordingly (0=first, 1=after first group, etc). Look at groups list to determine the index.
- For "rename_group": find group_id from groups list by name.
- For "delete_group": find group_id from groups list. Warn this deletes all items inside.
- For "reorder_groups": group_ids must be an array of all group IDs in the desired order. Use the groups list to find IDs by name.
- Always reply in Uzbek.
- action=chat only if truly no command.
- IMPORTANT: If user says something like "men X ni nazarda tutgan edim" or "X aslida Y edi" — use action=update to fix the most recently added item.`

async function handleCustomNoteAgent(userMsg, history, noteId, noteType, noteName, db) {
  const geminiKey = db.settings?.gemini_key || ''
  if (!geminiKey) return { reply: "Gemini API kaliti yo'q. Sozlamalarda kiriting.", action: null }

  const groups = (db.note_groups || []).filter(g => (g.note_id ?? null) === noteId)
  const items = (db.note_items || []).filter(i => groups.some(g => g.id === i.group_id))

  const groupsList = groups.length
    ? groups.map(g => `ID:${g.id} "${g.name}"`).join('\n')
    : '(guruhlar yo\'q — avval guruh yarating)'

  const itemsList = items.length
    ? items.map(i => {
        const grp = groups.find(g => g.id === i.group_id)
        return `ID:${i.id} "${i.title}" [${grp?.name || i.group_id}]`
      }).join('\n')
    : '(bo\'sh)'

  const chatHistory = Array.isArray(history) ? history.slice(-10) : []

  const prompt = CUSTOM_NOTE_PROMPT
    .replace('{{NOTE_TYPE}}', noteType)
    .replace('{{NOTE_NAME}}', noteName || '')
    .replace('{{GROUPS}}', groupsList)
    .replace('{{ITEMS}}', itemsList)
    .replace('{{HISTORY}}', formatHistoryForPrompt(chatHistory))
    .replace('{{USER_MSG}}', userMsg)

  const geminiMessages = [
    { role: 'system', content: CUSTOM_NOTE_SYSTEM },
    ...chatHistory.slice(-8).map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text })),
    { role: 'user', content: prompt },
  ]

  try {
    const resp = await geminiRequestWithRetry(geminiMessages, geminiKey)
    const text = resp?.candidates?.[0]?.content?.parts?.[0]?.text || ''
    console.log('Custom agent raw:', text)
    const parsed = extractJSON(text)
    if (!parsed) return { reply: 'Tushunmadim, qayta yozing.', action: null }

    if (parsed.action === 'add' && parsed.title) {
      if (!groups.length) return { reply: "Avval guruh yarating (masalan: Playing, Played, To Do).", action: 'chat' }

      const parsedGroupId = parsed.group_id != null ? parseInt(parsed.group_id) : null
      const groupId = parsedGroupId && groups.find(g => g.id === parsedGroupId)
        ? parsedGroupId
        : groups[0].id

      if (!db.note_items) db.note_items = []

      // contentService dan cover qidirish
      // 1. search_query (inglizcha tarjima) bilan qidirish
      // 2. Topilmasa title (asl nom) bilan fallback
      let cover_url = null
      let subtitle = ''
      const displayTitle = parsed.title
      const tryQueries = []
      if (parsed.search_query?.trim() && parsed.search_query.trim() !== parsed.title) {
        tryQueries.push(parsed.search_query.trim())
      }
      tryQueries.push(parsed.title)

      for (const q of tryQueries) {
        try {
          const results = await searchContent(noteType, q, db.settings || {})
          if (Array.isArray(results) && results.length > 0 && results[0].cover_url) {
            cover_url = results[0].cover_url
            subtitle = results[0].subtitle || ''
            break
          } else if (Array.isArray(results) && results.length > 0 && !subtitle) {
            subtitle = results[0].subtitle || ''
          }
        } catch (e) {
          console.error('contentService error in agent:', e.message)
        }
      }

      const ids = db.note_items.map(i => i.id)
      const newId = ids.length ? Math.max(...ids) + 1 : 1
      const groupItems = db.note_items.filter(i => i.group_id === groupId)
      groupItems.forEach(i => { i.position = (i.position || 0) + 1 })

      const newItem = {
        id: newId,
        group_id: groupId,
        title: displayTitle,
        subtitle,
        cover_url,
        note: '',
        position: 0,
        created_at: new Date().toISOString(),
      }
      db.note_items.push(newItem)
      writeDB(db)

      const grpName = groups.find(g => g.id === groupId)?.name || ''
      const coverNote = cover_url ? ' (rasm topildi)' : ''
      return {
        reply: parsed.reply || `"${parsed.title}" ${grpName} guruhiga qo'shildi.${coverNote}`,
        action: 'add',
        item: newItem,
      }
    }

    if (parsed.action === 'update' && parsed.item_id) {
      if (!db.note_items) return { reply: 'Itemlar topilmadi.', action: 'chat' }
      const updItemId = parseInt(parsed.item_id)
      const updIdx = db.note_items.findIndex(i => i.id === updItemId)
      if (updIdx === -1) return { reply: 'Item topilmadi.', action: 'chat' }

      const oldTitle = db.note_items[updIdx].title
      if (parsed.title) db.note_items[updIdx].title = parsed.title

      // cover va subtitle qayta qidirish
      const updQueries = []
      if (parsed.search_query?.trim() && parsed.search_query.trim() !== parsed.title) {
        updQueries.push(parsed.search_query.trim())
      }
      if (parsed.title) updQueries.push(parsed.title)

      for (const q of updQueries) {
        try {
          const results = await searchContent(noteType, q, db.settings || {})
          if (Array.isArray(results) && results.length > 0 && results[0].cover_url) {
            db.note_items[updIdx].cover_url = results[0].cover_url
            db.note_items[updIdx].subtitle = results[0].subtitle || db.note_items[updIdx].subtitle
            break
          } else if (Array.isArray(results) && results.length > 0 && !db.note_items[updIdx].subtitle) {
            db.note_items[updIdx].subtitle = results[0].subtitle || ''
          }
        } catch (e) { console.error('contentService update error:', e.message) }
      }

      writeDB(db)
      const updatedItem = db.note_items[updIdx]
      const coverNote = updatedItem.cover_url ? ' (rasm ham yangilandi)' : ''
      return {
        reply: parsed.reply || `"${oldTitle}" → "${updatedItem.title}" ga o'zgartirildi.${coverNote}`,
        action: 'update',
        item: updatedItem,
      }
    }

    if (parsed.action === 'move' && parsed.item_id && parsed.to_group_id) {
      if (!db.note_items) return { reply: 'Itemlar topilmadi.', action: 'chat' }
      const moveItemId = parseInt(parsed.item_id)
      const moveToGroupId = parseInt(parsed.to_group_id)
      const idx = db.note_items.findIndex(i => i.id === moveItemId)
      if (idx === -1) return { reply: 'Item topilmadi.', action: 'chat' }
      db.note_items[idx].group_id = moveToGroupId
      writeDB(db)
      const toGrp = groups.find(g => g.id === moveToGroupId)?.name || ''
      return {
        reply: parsed.reply || `"${db.note_items[idx].title}" ${toGrp} guruhiga ko'chirildi.`,
        action: 'move',
        item: db.note_items[idx],
      }
    }

    if (parsed.action === 'delete' && parsed.item_id) {
      if (!db.note_items) return { reply: 'Itemlar topilmadi.', action: 'chat' }
      const delItemId = parseInt(parsed.item_id)
      const item = db.note_items.find(i => i.id === delItemId)
      db.note_items = db.note_items.filter(i => i.id !== delItemId)
      writeDB(db)
      return {
        reply: parsed.reply || `"${item?.title || 'Item'}" o'chirildi.`,
        action: 'delete',
        deletedId: delItemId,
      }
    }

    if (parsed.action === 'add_group' && parsed.title) {
      const existing = groups.length
      if (existing >= 5) return { reply: "Maksimal 5 ta guruh yaratish mumkin.", action: 'chat' }
      const colors = ['#a78bfa','#fbbf24','#34d399','#60a5fa','#f472b6']
      const usedColors = groups.map(g => g.color)
      const color = colors.find(c => !usedColors.includes(c)) || colors[existing % 5]
      const insertPos = parsed.position != null ? Math.max(0, Math.min(parseInt(parsed.position), existing)) : existing
      if (!db.note_groups) db.note_groups = []
      // Shu note guruhlarini insertPos dan keyin surish
      db.note_groups.forEach(g => {
        if ((g.note_id ?? null) === noteId && g.position >= insertPos) {
          g.position = g.position + 1
        }
      })
      const newGroup = {
        id: db.note_groups.length ? Math.max(...db.note_groups.map(g => g.id)) + 1 : 1,
        note_id: noteId,
        name: parsed.title,
        color,
        section_key: `group_${Date.now()}`,
        position: insertPos,
      }
      db.note_groups.push(newGroup)
      writeDB(db)
      return { reply: parsed.reply || `"${parsed.title}" guruhi yaratildi.`, action: 'add_group', group: newGroup }
    }

    if (parsed.action === 'rename_group' && parsed.group_id && parsed.title) {
      const grpId = parseInt(parsed.group_id)
      const gIdx = (db.note_groups || []).findIndex(g => g.id === grpId)
      if (gIdx === -1) return { reply: 'Guruh topilmadi.', action: 'chat' }
      const oldName = db.note_groups[gIdx].name
      db.note_groups[gIdx].name = parsed.title
      writeDB(db)
      return { reply: parsed.reply || `"${oldName}" → "${parsed.title}" ga o'zgartirildi.`, action: 'rename_group' }
    }

    if (parsed.action === 'delete_group' && parsed.group_id) {
      const grpId = parseInt(parsed.group_id)
      const group = (db.note_groups || []).find(g => g.id === grpId)
      if (!group) return { reply: 'Guruh topilmadi.', action: 'chat' }
      if ((group.note_id ?? null) === null) return { reply: "Asosiy Movie guruhlari o'chirilmaydi.", action: 'chat' }
      db.note_items = (db.note_items || []).filter(i => i.group_id !== grpId)
      db.note_groups = db.note_groups.filter(g => g.id !== grpId)
      writeDB(db)
      return { reply: parsed.reply || `"${group.name}" guruhi o'chirildi.`, action: 'delete_group' }
    }

    if (parsed.action === 'reorder_groups' && Array.isArray(parsed.group_ids) && parsed.group_ids.length) {
      const ids = parsed.group_ids.map(id => parseInt(id))
      const valid = ids.every(id => groups.some(g => g.id === id))
      if (!valid) return { reply: "Guruh IDlari noto'g'ri.", action: 'chat' }
      await (async () => {
        const dbW = readDB()
        ids.forEach((id, idx) => {
          const g = (dbW.note_groups || []).find(g => g.id === id)
          if (g) g.position = idx
        })
        writeDB(dbW)
      })()
      const newOrder = ids.map(id => groups.find(g => g.id === id)?.name).filter(Boolean).join(' → ')
      return { reply: parsed.reply || `Guruhlar yangi tartibda: ${newOrder}`, action: 'reorder_groups' }
    }

    if (parsed.action === 'list') {
      if (!items.length) return { reply: "Hozircha hech narsa qo'shilmagan.", action: 'chat' }
      const byGroup = {}
      for (const g of groups) byGroup[g.id] = { name: g.name, items: [] }
      for (const i of items) { if (byGroup[i.group_id]) byGroup[i.group_id].items.push(i.title) }
      const lines = Object.values(byGroup)
        .filter(g => g.items.length)
        .map(g => `${g.name}:\n${g.items.map(t => `  - ${t}`).join('\n')}`)
        .join('\n\n')
      return { reply: lines || "Hozircha bo'sh.", action: 'chat' }
    }

    return { reply: parsed.reply || 'Bajarildi.', action: parsed.action }
  } catch (e) {
    console.error('Custom agent error:', e)
    return { reply: `Xato: ${e.message}`, action: null }
  }
}

module.exports = function agentHandlers(ipcMain) {
  ipcMain.handle('agent:chat', async (_, userMsg, history = [], uiMovies = null, noteCtx = null) => {
    const db = readDB()
    const geminiKey = db.settings?.gemini_key || ''
    const omdbKey = db.settings?.omdb_key || ''
    const activeNoteId = noteCtx?.note_id ?? null
    const activeNoteName = noteCtx?.note_name ?? null
    const activeNoteType = noteCtx?.note_type ?? null

    if (!geminiKey) {
      return { reply: "Gemini API kaliti yo'q. Sozlamalarda kiriting.", action: null }
    }

    const allMovies = db.movies || []
    const movies = allMovies.filter(m => (m.note_id ?? null) === activeNoteId)
    const chatHistory = Array.isArray(history) ? history.slice(-14) : []
    const useUiList = Array.isArray(uiMovies)
    const movieList = useUiList
      ? formatMoviesForPrompt(uiMovies)
      : formatMoviesForPrompt(movies)
    const isCustomNote = activeNoteType && activeNoteType !== 'movies'

    // Custom note uchun alohida agent logic (note_items CRUD)
    if (isCustomNote) {
      return await handleCustomNoteAgent(userMsg, history, activeNoteId, activeNoteType, activeNoteName, db)
    }

    const noteCtxLine = activeNoteName
      ? `\nActive note: "${activeNoteName}" (note_id=${activeNoteId}). All add/move/delete actions apply to this note only.\n`
      : ''
    const prompt = (useUiList ? AGENT_PROMPT + UI_LIST_RULE : AGENT_PROMPT)
      .replace('{{MOVIES}}', movieList)
      .replace('{{HISTORY}}', formatHistoryForPrompt(chatHistory))
      .replace('{{USER_MSG}}', userMsg) + noteCtxLine

    const geminiMessages = [
      { role: 'system', content: AGENT_SYSTEM },
      ...chatHistory.slice(-10).map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.text,
      })),
      { role: 'user', content: prompt },
    ]

    try {
      const resp = await geminiRequestWithRetry(geminiMessages, geminiKey)
      const text = resp?.candidates?.[0]?.content?.parts?.[0]?.text || ''
      console.log('Gemini raw:', text)

      const parsed = extractJSON(text)
      console.log('Gemini parsed:', parsed)
      if (!parsed) return { reply: "Tushunmadim, qayta yozing.", action: null }

      db.agent_memory = db.agent_memory || []
      db.agent_memory.push({
        user_message: userMsg,
        agent_response: parsed.reply || '',
        created_at: new Date().toISOString(),
      })
      if (db.agent_memory.length > 20) db.agent_memory = db.agent_memory.slice(-20)

      let addTitle = parsed.title ? normalizeMovieTitle(parsed.title) : null
      let addSection = normalizeSection(parsed.section)
        || inferSectionFromMessage(userMsg)
        || 'todo'

      if (parsed.action === 'chat' && looksLikeAddRequest(userMsg) && !addTitle) {
        addTitle = extractMovieTitleFromMessage(userMsg)
        if (addTitle) parsed.action = 'add'
      }

      const enrichIntent = parsed.action === 'enrich'
        || looksLikeEnrichRequest(userMsg)
        || (parsed.action === 'chat' && (isLikelyTitleOnly(userMsg) || findMovieInConversation(userMsg, chatHistory, db.movies)))

      if (enrichIntent) {
        let target = parsed.movie_id ? db.movies.find(m => m.id === parsed.movie_id) : null
        if (!target && parsed.title) target = findMovieByName(db.movies, parsed.title)
        if (!target) target = findMovieForEnrich(userMsg, chatHistory, db.movies)

        if (target) {
          const before = { ...target }
          if (!omdbKey) {
            return {
              reply: "OMDB API kaliti yo'q. Sozlamalarda IMDb (OMDB) kalitini kiriting.",
              action: 'chat',
            }
          }

          const updated = await enrichMovie(target, omdbKey, db, Array.isArray(parsed.keywords) ? parsed.keywords : [])
          writeDB(db)
          const parts = []
          if (updated.poster_path) parts.push('poster')
          if (updated.rating) parts.push(`reyting ${updated.rating}`)
          if (updated.director && updated.director !== '-') parts.push(`rejissyor ${updated.director}`)
          if (updated.genre && updated.genre !== '-') parts.push(updated.genre)
          const detail = parts.length ? ` (${parts.join(', ')})` : ''
          const posterFixed = updated.poster_path && updated.poster_path !== before.poster_path
          const metaFixed = updated.rating || (updated.director && updated.director !== '-')
          const reply = !posterFixed && !metaFixed
            ? `"${updated.title}" IMDb dan topilmadi. Aniq nom yoki OMDB kalitini tekshiring.`
            : (parsed.reply || `"${updated.title}" IMDb ma'lumotlari yangilandi${detail}.`)
          return {
            reply,
            action: 'enrich',
            movie: updated,
          }
        }
        return {
          reply: 'Qaysi film? Roʻyxatdan aniq nomini yozing yoki avval film nomini aytib oʻting.',
          action: 'chat',
        }
      }

      if (parsed.action === 'add' && addTitle) {
        const keywords = Array.isArray(parsed.keywords) ? parsed.keywords : []
        const result = await addSingleMovie(addTitle, addSection, omdbKey, db, keywords, activeNoteId)

        // Duplicate tekshiruvi
        if (result?._duplicate) {
          const existing = result.movie
          const sectionNames = { futured: 'Futured', todo: 'To Do', doing: 'Going', done: 'Done' }
          return {
            reply: `"${existing.title}" allaqachon ${sectionNames[existing.section] || existing.section} bo'limida bor. Qayta qo'shilmadi.`,
            action: 'chat',
          }
        }

        writeDB(db)
        const dateHint = result.release_date ? ` Chiqish: ${result.release_date}.` : ''
        const metaNote = (!result.poster_path && !result.rating && result.genre === '-')
          ? ' (metadata keyinroq to\'ldiriladi)'
          : ''
        return {
          reply: (parsed.reply || `"${result.title}" qo'shildi.`) + dateHint + metaNote,
          action: 'add',
          movie: result,
        }
      }

      if (parsed.action === 'bulk_add' && parsed.titles?.length) {
        const section  = normalizeSection(parsed.section) || 'todo'
        const keywords = Array.isArray(parsed.keywords) ? parsed.keywords : []
        const added    = []
        const skipped  = []
        const dupes    = []
        for (const title of parsed.titles) {
          const result = await addSingleMovie(title, section, omdbKey, db, keywords, activeNoteId)
          if (result?._duplicate) dupes.push(result.movie.title)
          else if (result) added.push(result)
          else skipped.push(title)
        }
        writeDB(db)
        let reply = parsed.reply || `${added.length} ta film qo'shildi.`
        if (dupes.length)   reply += ` (Allaqachon bor: ${dupes.join(', ')})`
        if (skipped.length) reply += ` (Topilmadi: ${skipped.join(', ')})`
        return { reply, action: 'bulk_add', movies: added }
      }

      if (parsed.action === 'move') {
        const toSection = normalizeSection(parsed.to_section || parsed.section)
        let id = parsed.movie_id
        if (!id && parsed.title) {
          const found = findMovieByName(db.movies, parsed.title)
          if (found) id = found.id
        }
        if (id && toSection) {
          const idx = db.movies.findIndex(m => m.id === id)
          if (idx !== -1) {
            db.movies[idx].section = toSection
            const nid = db.movies[idx].note_id ?? null
            if (toSection === 'futured') {
              db.movies[idx].position = db.movies.filter(m => m.section === 'futured' && m.id !== id && (m.note_id ?? null) === nid).length
            } else {
              db.movies
                .filter(m => m.section === toSection && m.id !== id && (m.note_id ?? null) === nid)
                .forEach(m => { m.position = (m.position || 0) + 1 })
              db.movies[idx].position = 0
            }
            writeDB(db)
            return { reply: parsed.reply, action: 'move', movie: db.movies[idx] }
          }
        }
        return { reply: 'Nom noaniq edi. Iltimos aniq sarlavha yoki ID kiriting.', action: 'chat' }
      }

      if (parsed.action === 'delete') {
        let id = parsed.movie_id
        if (!id && parsed.title) {
          const found = findMovieByName(db.movies, parsed.title)
          if (found) id = found.id
        }
        if (id) {
          db.movies = db.movies.filter(m => m.id !== id)
          writeDB(db)
          return { reply: parsed.reply, action: 'delete', deletedId: id }
        }
        return { reply: 'Nom noaniq edi. Iltimos aniq sarlavha yoki ID kiriting.', action: 'chat' }
      }

      writeDB(db)
      return { reply: parsed.reply || 'Bajarildi!', action: parsed.action }
    } catch (e) {
      console.error('Agent error:', e)
      return { reply: `Xato: ${e.message}`, action: null }
    }
  })
}
