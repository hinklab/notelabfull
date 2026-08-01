const express = require('express');
const router = express.Router();
const { readDB, writeDB } = require('../services/database');

function getSupabase() {
  const supabase = require('../services/supabase');
  if (!supabase) return null;
  return supabase;
}

// GET /api/user-preferences/:userId
router.get('/:userId', async (req, res) => {
  const { userId } = req.params;
  const supabase = getSupabase();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!error) {
        return res.json({
          completed: !!data,
          preferences: data || null
        });
      }
      console.warn('Supabase user_preferences query error (falling back):', error.message);
    } catch (err) {
      console.error('Supabase user_preferences check exception:', err.message);
    }
  }

  // Fallback to local JSON DB
  const db = readDB();
  const prefs = (db.user_preferences || []).find(p => p.id === userId || p.user_id === userId);
  res.json({
    completed: !!prefs,
    preferences: prefs || null
  });
});

// POST /api/user-preferences
router.post('/', async (req, res) => {
  const { user_id, favorite_genres, priority_factor, mood_preference, movie_length_preference, era_preference } = req.body;

  if (!user_id) {
    return res.status(400).json({ error: 'User ID talab qilinadi.' });
  }

  const formatField = (val) => {
    if (Array.isArray(val)) return val.join(', ');
    return val ? String(val) : '';
  };

  const record = {
    id: user_id,
    user_id: user_id,
    favorite_genres: Array.isArray(favorite_genres) ? favorite_genres : [favorite_genres].filter(Boolean),
    priority_factor: formatField(priority_factor),
    mood_preference: formatField(mood_preference),
    movie_length_preference: formatField(movie_length_preference),
    era_preference: formatField(era_preference),
    completed_at: new Date().toISOString()
  };

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .upsert(record)
        .select()
        .single();

      if (!error) {
        return res.status(201).json({ success: true, preferences: data });
      }
      console.warn('Supabase user_preferences upsert error (falling back to JSON DB):', error.message);
    } catch (err) {
      console.error('Supabase user_preferences save exception:', err.message);
    }
  }

  // Fallback to local JSON DB
  const db = readDB();
  if (!db.user_preferences) db.user_preferences = [];
  const idx = db.user_preferences.findIndex(p => p.id === user_id || p.user_id === user_id);
  if (idx >= 0) {
    db.user_preferences[idx] = record;
  } else {
    db.user_preferences.push(record);
  }
  writeDB(db);

  res.status(201).json({ success: true, preferences: record });
});

module.exports = router;
