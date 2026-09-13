const express = require('express');
const router = express.Router();
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  generateSmartNotifications
} = require('../services/notifications');
const { readDB, saveUserSettings, getUserSettings } = require('../services/database');

// GET /api/notifications
router.get('/', async (req, res) => {
  try {
    const userId = req.userId;
    const db = readDB();
    const settings = getUserSettings(userId, db);
    const lastActiveStr = settings.last_active_at;
    const now = Date.now();
    const lastActive = lastActiveStr ? new Date(lastActiveStr).getTime() : 0;
    const wasInactiveOver24h = (now - lastActive) >= (24 * 60 * 60 * 1000);

    // If user was inactive for > 24 hours, perform instant catch-up BEFORE returning notifications
    if (wasInactiveOver24h && lastActive > 0) {
      console.log(`[LOGIN CATCH-UP] User ${userId} returned after > 24h of inactivity. Generating missed notifications...`);
      await generateSmartNotifications(userId, { force: true }).catch(err => {
        console.warn('Instant catch-up error:', err.message);
      });
    }

    // Save current time as last_active_at
    saveUserSettings(userId, { last_active_at: new Date().toISOString() }, db);

    const list = await getNotifications(userId);
    res.json(list);

    // If not returning after > 24h, trigger standard background generation (debounced 10 min)
    if (!wasInactiveOver24h) {
      setImmediate(() => {
        generateSmartNotifications(userId).catch(err => console.warn('Smart notifications generation error:', err.message));
      });
    }
  } catch (err) {
    console.error('GET /api/notifications error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', async (req, res) => {
  try {
    await markAsRead(req.userId, req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('PATCH /api/notifications/:id/read error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/notifications/read-all
router.post('/read-all', async (req, res) => {
  try {
    await markAllAsRead(req.userId);
    res.json({ success: true });
  } catch (err) {
    console.error('POST /api/notifications/read-all error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/notifications/:id
router.delete('/:id', async (req, res) => {
  try {
    await deleteNotification(req.userId, req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/notifications/:id error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
