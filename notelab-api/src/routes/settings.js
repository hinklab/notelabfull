const express = require('express');
const router = express.Router();
const { readDB, writeDB } = require('../services/database');

// GET /api/settings
router.get('/', async (req, res) => {
  try {
    const db = readDB();
    res.json(db.settings || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/settings
router.put('/', async (req, res) => {
  try {
    const db = readDB();
    db.settings = { ...db.settings, ...req.body };
    writeDB(db);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
