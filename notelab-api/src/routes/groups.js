const express = require('express');
const router = express.Router();
const { readDB, writeDB } = require('../services/database');

const DEFAULT_USER_ID = '0d3da195-1d0e-458b-9f88-2879561e0da6';
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
    let groups = (db.note_groups || []).filter(g => (g.user_id || DEFAULT_USER_ID) === userId);
    
    if (note_id) {
      groups = groups.filter(g => g.note_id === parseInt(note_id));
    }
    
    groups.sort((a, b) => a.position - b.position);
    res.json(groups);
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
