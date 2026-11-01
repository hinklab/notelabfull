const express = require('express');
const router = express.Router();
const { readDB, writeDB } = require('../services/database');

const DEFAULT_USER_ID = '0d3da195-1d0e-458b-9f88-2879561e0da6';
function getSupabase() {
  try { return require('../services/supabase'); } catch { return null; }
}

const GROUP_COLORS = [
  '#a78bfa', '#fbbf24', '#34d399', '#60a5fa',
  '#f472b6', '#fb923c', '#4ade80', '#38bdf8',
];

// GET /api/groups?note_id=123
router.get('/', async (req, res) => {
  try {
    const db = readDB();
    const userId = req.userId || DEFAULT_USER_ID;
    const { note_id } = req.query;

    // 1. Resolve targetNoteId safely
    let targetNoteId = null;
    if (note_id && note_id !== 'null' && note_id !== 'undefined') {
      const parsed = parseInt(note_id, 10);
      if (!isNaN(parsed) && parsed > 0) targetNoteId = parsed;
    }

    if (!targetNoteId) {
      const movieNote = (db.notes || []).find(n => (n.is_movie || n.type === 'movie') && (n.user_id || DEFAULT_USER_ID) === userId);
      targetNoteId = movieNote ? movieNote.id : ((db.notes || [])[0]?.id || 6);
    }

    // 2. Fetch groups STRICTLY for targetNoteId
    let groups = (db.note_groups || []).filter(g =>
      (g.user_id || DEFAULT_USER_ID) === userId &&
      Number(g.note_id) === Number(targetNoteId)
    );

    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data: cloudGroups } = await supabase
          .from('note_groups')
          .select('*')
          .eq('user_id', userId)
          .eq('note_id', targetNoteId)
          .order('position');
        if (Array.isArray(cloudGroups) && cloudGroups.length > 0) {
          groups = cloudGroups;
        }
      } catch (e) {}
    }

    const currentNote = (db.notes || []).find(n => n.id === targetNoteId);
    const isMovie = targetNoteId === 6 || (currentNote && (currentNote.is_movie || currentNote.type === 'movie'));

    if (isMovie) {
      const canonicalSections = [
        { name: 'Futured', section_key: 'futured', color: '#a78bfa', position: 0 },
        { name: 'To Do', section_key: 'todo', color: '#fbbf24', position: 1 },
        { name: 'Going', section_key: 'doing', color: '#34d399', position: 2 },
        { name: 'Done', section_key: 'done', color: '#60a5fa', position: 3 },
      ];

      const canonicalMap = new Map();
      for (const g of groups) {
        let secKey = g.section_key;
        if (!secKey) {
          const lowerName = (g.name || '').toLowerCase().trim();
          if (lowerName === 'futured' || lowerName === 'future') secKey = 'futured';
          else if (lowerName === 'to do' || lowerName === 'todo') secKey = 'todo';
          else if (lowerName === 'going' || lowerName === 'doing') secKey = 'doing';
          else if (lowerName === 'done') secKey = 'done';
        }
        if (secKey && ['futured', 'todo', 'doing', 'done'].includes(secKey)) {
          if (!canonicalMap.has(secKey)) {
            const canon = canonicalSections.find(c => c.section_key === secKey);
            canonicalMap.set(secKey, {
              ...g,
              section_key: secKey,
              name: canon.name,
              color: canon.color,
              position: canon.position,
            });
          }
        }
      }

      for (const canon of canonicalSections) {
        if (!canonicalMap.has(canon.section_key)) {
          canonicalMap.set(canon.section_key, {
            id: `g_${canon.section_key}`,
            note_id: targetNoteId,
            user_id: userId,
            name: canon.name,
            color: canon.color,
            section_key: canon.section_key,
            position: canon.position,
          });
        }
      }

      const result = Array.from(canonicalMap.values()).sort((a, b) => a.position - b.position);
      return res.json(result);
    }

    groups.sort((a, b) => a.position - b.position);

    // Deduplicate by section_key or name
    const seenKeys = new Set();
    const deduped = [];
    for (const g of groups) {
      const key = g.section_key || g.name;
      if (key) {
        if (seenKeys.has(key)) continue;
        seenKeys.add(key);
      }
      deduped.push(g);
    }

    res.json(deduped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/groups
router.post('/', async (req, res) => {
  try {
    const db = readDB();
    if (!db.note_groups) db.note_groups = [];
    const userId = req.userId || DEFAULT_USER_ID;
    
    const { note_id, name } = req.body;
    const existing = db.note_groups.filter(g => (g.user_id || DEFAULT_USER_ID) === userId && g.note_id === note_id);
    
    if (existing.length >= 5) {
      return res.status(400).json({ error: 'Max 5 ta group yaratish mumkin' });
    }
    
    const usedColors = existing.map(g => g.color);
    const color = GROUP_COLORS.find(c => !usedColors.includes(c)) || GROUP_COLORS[existing.length % GROUP_COLORS.length];
    
    const group = {
      id: db.note_groups.length ? Math.max(...db.note_groups.map(g => g.id)) + 1 : 1,
      user_id: userId,
      note_id: note_id ?? null,
      name: name || 'Group',
      color,
      section_key: `group_${Date.now()}`,
      position: existing.length,
    };
    
    db.note_groups.push(group);
    writeDB(db);
    res.json(group);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/groups/:id
router.put('/:id', async (req, res) => {
  try {
    const db = readDB();
    const userId = req.userId || DEFAULT_USER_ID;
    const idx = (db.note_groups || []).findIndex(g => g.id === parseInt(req.params.id) && (g.user_id || DEFAULT_USER_ID) === userId);
    if (idx === -1) return res.status(404).json({ error: 'Group not found' });
    
    const safe = { ...req.body };
    delete safe.id;
    delete safe.user_id;
    delete safe.note_id;
    delete safe.section_key;
    
    db.note_groups[idx] = { ...db.note_groups[idx], ...safe };
    writeDB(db);
    res.json(db.note_groups[idx]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/groups/:id
router.delete('/:id', async (req, res) => {
  try {
    const db = readDB();
    const userId = req.userId || DEFAULT_USER_ID;
    const id = parseInt(req.params.id);
    const group = (db.note_groups || []).find(g => g.id === id && (g.user_id || DEFAULT_USER_ID) === userId);
    
    if (!group) return res.status(404).json({ error: 'Topilmadi' });
    
    const note = (db.notes || []).find(n => n.id === group.note_id && (n.user_id || DEFAULT_USER_ID) === userId);
    const remaining = (db.note_groups || []).filter(g => (g.user_id || DEFAULT_USER_ID) === userId && g.note_id === group.note_id && g.id !== id);
    
    if (note?.is_movie && remaining.length === 0) {
      return res.status(400).json({ error: 'Kamida 1 ta guruh bo\'lishi kerak' });
    }
    
    db.note_groups = (db.note_groups || []).filter(g => !(g.id === id && (g.user_id || DEFAULT_USER_ID) === userId));
    
    if (note?.is_movie) {
      db.movies = (db.movies || []).filter(m => !((m.user_id || DEFAULT_USER_ID) === userId && m.section === group.section_key && m.note_id === group.note_id));
    }
    
    db.note_items = (db.note_items || []).filter(i => !((i.user_id || DEFAULT_USER_ID) === userId && i.group_id === id));
    
    db.note_groups
      .filter(g => (g.user_id || DEFAULT_USER_ID) === userId && g.note_id === group.note_id && g.position > group.position)
      .forEach(g => { g.position-- });
    
    writeDB(db);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/groups/reorder
router.post('/reorder', async (req, res) => {
  try {
    const db = readDB();
    const userId = req.userId || DEFAULT_USER_ID;
    const { note_id, ids } = req.body;
    
    ids.forEach((id, idx) => {
      const g = (db.note_groups || []).find(g => g.id === id && (g.user_id || DEFAULT_USER_ID) === userId && g.note_id === parseInt(note_id));
      if (g) g.position = idx;
    });
    
    writeDB(db);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
