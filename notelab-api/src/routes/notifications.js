const express = require('express');
const router = express.Router();
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  generateSmartNotifications
} = require('../services/notifications');

// GET /api/notifications
router.get('/', async (req, res) => {
  try {
    const list = await getNotifications(req.userId);
    res.json(list);

    // Trigger smart notifications asynchronously in background so response returns instantly
    setImmediate(() => {
      generateSmartNotifications(req.userId).catch(err => console.warn('Smart notifications generation error:', err.message));
    });
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
