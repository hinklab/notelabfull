const express = require('express');
const router = express.Router();
const { readDB, writeDB } = require('../services/database');

// GET /api/notes - with groups summary
router.get('/', async (req, res) => {
  try {
    const db = readDB();
    const notes = db.notes || [];
    const groups = db.note_groups || [];
    const items = db.note_items || [];
    const movies = db.movies || [];
    
    const result = notes.map(n => {
      const noteGroups = groups.filter(g => g.note_id === n.id).sort((a, b) => a.position - b.position);
      const groupIds = noteGroups.map(g => g.id);
      let item_count, groups_summary;
      
      if (n.is_movie) {
        item_count = movies.filter(m => m.note_id === n.id).length;
        groups_summary = noteGroups.map(g => ({
          id: g.id, name: g.name, color: g.color,
          count: movies.filter(m => m.note_id === n.id && m.section === g.section_key).length,
        }));
      } else {
        item_count = items.filter(i => groupIds.includes(i.group_id)).length;
        groups_summary = noteGroups.map(g => ({
          id: g.id, name: g.name, color: g.color,
          count: items.filter(i => i.group_id === g.id).length,
        }));
      }
      
      return { ...n, group_count: noteGroups.length, item_count, groups_summary };
    });
    
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/notes
router.post('/', async (req, res) => {
  try {
    const db = readDB();
    if (!db.notes) db.notes = [];
    
    const note = {
      id: db.notes.length ? Math.max(...db.notes.map(n => n.id)) + 1 : 1,
      name: req.body.name || 'Note',
      icon: req.body.icon || '📝',
      type: req.body.type || 'custom',
      created_at: new Date().toISOString(),
    };
    
    db.notes.push(note);
    writeDB(db);
    res.json(note);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/notes/:id
router.put('/:id', async (req, res) => {
  try {
    const db = readDB();
    const idx = (db.notes || []).findIndex(n => n.id === parseInt(req.params.id));
    if (idx === -1) return res.status(404).json({ error: 'Note not found' });
    
    db.notes[idx] = { ...db.notes[idx], ...req.body };
    writeDB(db);
    res.json(db.notes[idx]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/notes/:id
router.delete('/:id', async (req, res) => {
  try {
    const db = readDB();
    const id = parseInt(req.params.id);
    const note = (db.notes || []).find(n => n.id === id);
    
    if (note?.is_movie) {
      return res.status(400).json({ error: 'Movie note o\'chirilmaydi' });
    }
    
    db.notes = (db.notes || []).filter(n => n.id !== id);
    db.movies = (db.movies || []).filter(m => m.note_id !== id);
    
    const deletedGroups = (db.note_groups || []).filter(g => g.note_id === id).map(g => g.id);
    db.note_groups = (db.note_groups || []).filter(g => g.note_id !== id);
    db.note_items = (db.note_items || []).filter(i => !deletedGroups.includes(i.group_id));
    
    writeDB(db);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
