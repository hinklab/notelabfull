require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS - allow web frontend
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://notelab.vercel.app'
];

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(require('./middleware/authMiddleware'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/notes', require('./routes/notes'));
app.use('/api/groups', require('./routes/groups'));
app.use('/api/items', require('./routes/items'));
app.use('/api/movies', require('./routes/movies'));
app.use('/api/agent', require('./routes/agent'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/content', require('./routes/content'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/user-preferences', require('./routes/userPreferences'));
app.use('/api/notifications', require('./routes/notifications'));

// Error handler
app.use((err, req, res, next) => {
  console.error('API Error:', err);
  res.status(500).json({ error: err.message });
});

const { readDB } = require('./services/database');
const { autoMigrateFuturedMovies } = require('./routes/movies');

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Notelab API running on http://localhost:${PORT}`);
    try {
      const db = readDB();
      autoMigrateFuturedMovies(db);
    } catch (err) {
      console.error('Error running startup movie migration:', err.message);
    }
  });
}

module.exports = app;
