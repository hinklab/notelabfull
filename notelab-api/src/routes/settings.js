const express = require('express');
const router = express.Router();
const { readDB, writeDB, getUserSettings, saveUserSettings } = require('../services/database');
const supabase = require('../services/supabase');

// GET /api/settings
router.get('/', async (req, res) => {
  try {
    const userId = req.userId;
    let settings = null;

    if (supabase && userId) {
      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (!error && data) {
          settings = data;
        }
      } catch (e) {
        console.warn('Supabase user_settings fetch warning:', e.message);
      }
    }

    if (!settings) {
      const db = readDB();
      settings = getUserSettings(userId, db);
    }

    res.json(settings || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/settings
router.put('/', async (req, res) => {
  try {
    const userId = req.userId;
    const payload = req.body || {};

    if (supabase && userId) {
      try {
        await supabase
          .from('user_settings')
          .upsert({
            user_id: userId,
            ...payload,
            updated_at: new Date().toISOString()
          });
      } catch (e) {
        console.warn('Supabase user_settings upsert warning:', e.message);
      }
    }

    const db = readDB();
    saveUserSettings(userId, payload, db);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
