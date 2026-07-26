const express = require('express');
const router = express.Router();
const { readDB, writeDB, normalizeNoteIcon } = require('../services/database');

const DEFAULT_USER_ID = '0d3da195-1d0e-458b-9f88-2879561e0da6';

// GET /api/notes - with groups summary
router.get('/', async (req, res) => {
  try {
    const db = readDB();
    const userId = req.userId || DEFAULT_USER_ID;
    let notes = (db.notes || []).filter(n => (n.user_id || DEFAULT_USER_ID) === userId);
    let groups = (db.note_groups || []).filter(g => (g.user_id || DEFAULT_USER_ID) === userId);
    let items = (db.note_items || []).filter(i => (i.user_id || DEFAULT_USER_ID) === userId);
    let movies = (db.movies || []).filter(m => (m.user_id || DEFAULT_USER_ID) === userId);
    
    // Auto-create Movies note for user if not exists
    let movieNote = notes.find(n => n.is_movie || n.type === 'movie');
    let dbChanged = false;

    if (!movieNote) {
      const nextNoteId = db.notes && db.notes.length ? Math.max(...db.notes.map(n => n.id)) + 1 : 1;
      movieNote = {
        id: nextNoteId,
        user_id: userId,
        name: 'Movies',
        icon: '🎬',
        type: 'movie',
        is_movie: true,
        created_at: new Date().toISOString(),
      };
      if (!db.notes) db.notes = [];
      db.notes.push(movieNote);
      notes.push(movieNote);
      dbChanged = true;
    }

    // Auto-create 4 default movie groups if user has a Movies note with 0 groups
    if (!db.note_groups) db.note_groups = [];
    const userMovieGroups = db.note_groups.filter(g => (g.user_id || DEFAULT_USER_ID) === userId && g.note_id === movieNote.id);
    if (userMovieGroups.length === 0) {
      const defaultGroups = [
        { name: 'Futured', section_key: 'futured', color: '#a78bfa', position: 0 },
        { name: 'To Do', section_key: 'todo', color: '#fbbf24', position: 1 },
        { name: 'Going', section_key: 'doing', color: '#34d399', position: 2 },
        { name: 'Done', section_key: 'done', color: '#60a5fa', position: 3 },
      ];

      for (const dg of defaultGroups) {
        const nextGroupId = db.note_groups.length ? Math.max(...db.note_groups.map(g => g.id)) + 1 : 1;
        const newG = {
          id: nextGroupId,
          note_id: movieNote.id,
          user_id: userId,
          name: dg.name,
          color: dg.color,
          section_key: dg.section_key,
          position: dg.position,
        };
        db.note_groups.push(newG);
        groups.push(newG);
      }
      dbChanged = true;
    }

    if (dbChanged) {
      writeDB(db);
    }

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
      user_id: req.userId || DEFAULT_USER_ID,
      name: req.body.name || 'Note',
      icon: normalizeNoteIcon(req.body.icon),
      type: req.body.type || 'custom',
      is_movie: req.body.type === 'movie' || req.body.is_movie || false,
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
    const userId = req.userId || DEFAULT_USER_ID;
    const idx = (db.notes || []).findIndex(n => n.id === parseInt(req.params.id) && (n.user_id || DEFAULT_USER_ID) === userId);
    if (idx === -1) return res.status(404).json({ error: 'Note not found' });
    
    const safeBody = { ...req.body };
    delete safeBody.user_id;
    if (safeBody.icon !== undefined) {
      safeBody.icon = normalizeNoteIcon(safeBody.icon, db.notes[idx]?.is_movie ? '🎬' : '📝');
    }
    db.notes[idx] = { ...db.notes[idx], ...safeBody };
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
    const userId = req.userId || DEFAULT_USER_ID;
    const id = parseInt(req.params.id);
    const note = (db.notes || []).find(n => n.id === id && (n.user_id || DEFAULT_USER_ID) === userId);
    
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    if (note?.is_movie) {
      return res.status(400).json({ error: 'Movie note o\'chirilmaydi' });
    }
    
    db.notes = (db.notes || []).filter(n => !(n.id === id && (n.user_id || DEFAULT_USER_ID) === userId));
    db.movies = (db.movies || []).filter(m => !(m.note_id === id && (m.user_id || DEFAULT_USER_ID) === userId));
    
    const deletedGroups = (db.note_groups || []).filter(g => g.note_id === id && (g.user_id || DEFAULT_USER_ID) === userId).map(g => g.id);
    db.note_groups = (db.note_groups || []).filter(g => !(g.note_id === id && (g.user_id || DEFAULT_USER_ID) === userId));
    db.note_items = (db.note_items || []).filter(i => !(i.group_id && deletedGroups.includes(i.group_id) && (i.user_id || DEFAULT_USER_ID) === userId));
    
    writeDB(db);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
