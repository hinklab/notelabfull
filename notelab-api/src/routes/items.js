const express = require('express');
const router = express.Router();
const { readDB, writeDB } = require('../services/database');

const DEFAULT_USER_ID = '0d3da195-1d0e-458b-9f88-2879561e0da6';

// GET /api/items?group_id=123
router.get('/', async (req, res) => {
  try {
    const db = readDB();
    const userId = req.userId || DEFAULT_USER_ID;
    const { group_id } = req.query;
    let items = (db.note_items || []).filter(i => (i.user_id || DEFAULT_USER_ID) === userId);
    
    if (group_id) {
      items = items.filter(i => i.group_id === parseInt(group_id));
    }
    
    items.sort((a, b) => a.position - b.position);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/items
router.post('/', async (req, res) => {
  try {
    const db = readDB();
    if (!db.note_items) db.note_items = [];
    const userId = req.userId || DEFAULT_USER_ID;
    
    const { group_id, title, subtitle, cover_url, note } = req.body;
    const groupItems = db.note_items.filter(i => (i.user_id || DEFAULT_USER_ID) === userId && i.group_id === group_id);
    
    groupItems.forEach(i => { i.position = (i.position || 0) + 1 });
    
    const item = {
      id: db.note_items.length ? Math.max(...db.note_items.map(i => i.id)) + 1 : 1,
      user_id: userId,
      group_id,
      title: title || 'Untitled',
      subtitle: subtitle || '',
      cover_url: cover_url || null,
      note: note || '',
      position: 0,
      created_at: new Date().toISOString(),
    };
    
    db.note_items.push(item);
    writeDB(db);
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/items/:id
router.put('/:id', async (req, res) => {
  try {
    const db = readDB();
    const userId = req.userId || DEFAULT_USER_ID;
    const idx = (db.note_items || []).findIndex(i => i.id === parseInt(req.params.id) && (i.user_id || DEFAULT_USER_ID) === userId);
    if (idx === -1) return res.status(404).json({ error: 'Item not found' });
    
    const safe = { ...req.body };
    delete safe.id;
    delete safe.user_id;
    delete safe.group_id;
    
    db.note_items[idx] = { ...db.note_items[idx], ...safe };
    writeDB(db);
    res.json(db.note_items[idx]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/items/:id
router.delete('/:id', async (req, res) => {
  try {
    const db = readDB();
    const userId = req.userId || DEFAULT_USER_ID;
    db.note_items = (db.note_items || []).filter(i => !(i.id === parseInt(req.params.id) && (i.user_id || DEFAULT_USER_ID) === userId));
    writeDB(db);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/items/move
router.post('/move', async (req, res) => {
  try {
    const db = readDB();
    const userId = req.userId || DEFAULT_USER_ID;
    const { id, to_group_id, position } = req.body;
    const idx = (db.note_items || []).findIndex(i => i.id === id && (i.user_id || DEFAULT_USER_ID) === userId);
    
    if (idx === -1) return res.status(404).json({ error: 'Item not found' });
    
    db.note_items[idx].group_id = to_group_id;
    
    if (position !== null) {
      db.note_items
        .filter(i => (i.user_id || DEFAULT_USER_ID) === userId && i.group_id === to_group_id && i.id !== id && i.position >= position)
        .forEach(i => { i.position = (i.position || 0) + 1 });
      db.note_items[idx].position = position;
    } else {
      db.note_items[idx].position = db.note_items.filter(i => (i.user_id || DEFAULT_USER_ID) === userId && i.group_id === to_group_id && i.id !== id).length;
    }
    
    writeDB(db);
    res.json(db.note_items[idx]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/items/reorder
router.post('/reorder', async (req, res) => {
  try {
    const db = readDB();
    const userId = req.userId || DEFAULT_USER_ID;
    const { group_id, ids } = req.body;
    
    ids.forEach((id, position) => {
      const idx = (db.note_items || []).findIndex(i => i.id === id && (i.user_id || DEFAULT_USER_ID) === userId);
      if (idx !== -1) db.note_items[idx].position = position;
    });
    
    writeDB(db);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
