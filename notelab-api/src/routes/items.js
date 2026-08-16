const express = require('express');
const router = express.Router();
const { readDB, writeDB } = require('../services/database');

function getSupabase() {
  try {
    return require('../services/supabase');
  } catch {
    return null;
  }
}

function sanitizeItemForSupabase(item) {
  const allowed = ['id', 'user_id', 'group_id', 'title', 'subtitle', 'cover_url', 'note', 'position', 'created_at', 'updated_at'];
  const clean = {};
  for (const k of allowed) {
    if (item && item[k] !== undefined) clean[k] = item[k];
  }
  if (clean.id !== undefined && (typeof clean.id === 'string' && (clean.id.startsWith('temp_') || isNaN(Number(clean.id))))) {
    delete clean.id;
  } else if (clean.id !== undefined && clean.id !== null) {
    clean.id = Number(clean.id);
  }
  if (clean.group_id !== undefined && (typeof clean.group_id === 'string' && (clean.group_id.startsWith('temp_') || isNaN(Number(clean.group_id))))) {
    delete clean.group_id;
  } else if (clean.group_id != null) {
    clean.group_id = Number(clean.group_id);
  }
  return clean;
}

const DEFAULT_USER_ID = '0d3da195-1d0e-458b-9f88-2879561e0da6';

// GET /api/items?group_id=123
router.get('/', async (req, res) => {
  try {
    const { group_id } = req.query;
    const userId = req.userId || DEFAULT_USER_ID;
    let items = null;

    const supabase = getSupabase();
    if (supabase) {
      try {
        let query = supabase.from('note_items').select('*').eq('user_id', userId);
        if (group_id) {
          query = query.eq('group_id', parseInt(group_id));
        }
        const { data: cloudItems, error: cloudErr } = await query;
        if (!cloudErr && Array.isArray(cloudItems) && cloudItems.length > 0) {
          items = cloudItems;
        }
      } catch (cloudEx) {
        console.warn('Cloud fetch for note_items failed, falling back to local DB:', cloudEx.message);
      }
    }

    if (!items) {
      const db = readDB();
      items = (db.note_items || []).filter(i => (i.user_id || DEFAULT_USER_ID) === userId);
      if (group_id) {
        items = items.filter(i => String(i.group_id) === String(group_id));
      }
    }

    items.sort((a, b) => (a.position || 0) - (b.position || 0));
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
    const groupItems = db.note_items.filter(i => (i.user_id || DEFAULT_USER_ID) === userId && String(i.group_id) === String(group_id));
    
    groupItems.forEach(i => { i.position = (i.position || 0) + 1 });
    
    const item = {
      id: db.note_items.length ? Math.max(...db.note_items.map(i => Number(i.id) || 0)) + 1 : 1,
      user_id: userId,
      group_id,
      title: title || 'Untitled',
      subtitle: subtitle || '',
      cover_url: cover_url || null,
      note: note || '',
      position: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    db.note_items.push(item);
    await writeDB(db);

    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from('note_items').upsert([sanitizeItemForSupabase(item)], { onConflict: 'id' });
      } catch (e) {}
    }

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
    const targetId = req.params.id;
    const idx = (db.note_items || []).findIndex(i => String(i.id) === String(targetId) && (i.user_id || DEFAULT_USER_ID) === userId);
    
    const safe = { ...req.body, updated_at: new Date().toISOString() };
    delete safe.id;
    delete safe.user_id;

    if (idx !== -1) {
      db.note_items[idx] = { ...db.note_items[idx], ...safe };
      await writeDB(db);
    }

    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from('note_items').update(sanitizeItemForSupabase(safe)).eq('id', targetId);
      } catch (e) {}
    }

    if (idx !== -1) {
      return res.json(db.note_items[idx]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/items/:id
router.delete('/:id', async (req, res) => {
  try {
    const targetId = req.params.id;
    const userId = req.userId || DEFAULT_USER_ID;
    const db = readDB();
    db.note_items = (db.note_items || []).filter(i => !(String(i.id) === String(targetId) && (i.user_id || DEFAULT_USER_ID) === userId));
    await writeDB(db, { deletedItemId: targetId });

    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from('note_items').delete().eq('id', targetId);
      } catch (e) {}
    }

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
    const idx = (db.note_items || []).findIndex(i => String(i.id) === String(id) && (i.user_id || DEFAULT_USER_ID) === userId);
    
    if (idx !== -1) {
      db.note_items[idx].group_id = to_group_id;
      
      if (position !== null && position !== undefined) {
        db.note_items
          .filter(i => (i.user_id || DEFAULT_USER_ID) === userId && String(i.group_id) === String(to_group_id) && String(i.id) !== String(id) && i.position >= position)
          .forEach(i => { i.position = (i.position || 0) + 1 });
        db.note_items[idx].position = position;
      } else {
        db.note_items[idx].position = db.note_items.filter(i => (i.user_id || DEFAULT_USER_ID) === userId && String(i.group_id) === String(to_group_id) && String(i.id) !== String(id)).length;
      }
      
      await writeDB(db);
    }

    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from('note_items').update({
          group_id: to_group_id,
          position: position ?? 0,
          updated_at: new Date().toISOString()
        }).eq('id', id);
      } catch (e) {}
    }

    if (idx !== -1) {
      return res.json(db.note_items[idx]);
    }
    res.json({ success: true });
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
    
    if (Array.isArray(ids)) {
      ids.forEach((id, position) => {
        const idx = (db.note_items || []).findIndex(i => String(i.id) === String(id) && (i.user_id || DEFAULT_USER_ID) === userId);
        if (idx !== -1) db.note_items[idx].position = position;
      });
      await writeDB(db);

      const supabase = getSupabase();
      if (supabase) {
        try {
          for (let pos = 0; pos < ids.length; pos++) {
            await supabase.from('note_items').update({ position: pos }).eq('id', ids[pos]);
          }
        } catch (e) {}
      }
    }
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
