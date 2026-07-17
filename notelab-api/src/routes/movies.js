const express = require('express');
const router = express.Router();
const { readDB, writeDB } = require('../services/database');

function nextId(movies) {
  const ids = movies.map(m => m.id);
  return ids.length ? Math.max(...ids) + 1 : 1;
}

function normalizeSection(section) {
  if (!section) return 'todo';
  const s = String(section).toLowerCase().trim();
  const map = {
    futured: 'futured', 'to do': 'todo', todo: 'todo',
    going: 'doing', doing: 'doing', done: 'done', watched: 'done',
  };
  if (map[s]) return map[s];
  if (/futured|chiqadigan|upcoming/.test(s)) return 'futured';
  if (/^to\s*do|todo|ko['']rmoqchi/.test(s)) return 'todo';
  if (/going|doing|ko['']rayotgan/.test(s)) return 'doing';
  if (/^done$|ko['']rib|watched|tugat/.test(s)) return 'done';
  return ['futured', 'todo', 'doing', 'done'].includes(s) ? s : 'todo';
}

// GET /api/movies?note_id=123
router.get('/', async (req, res) => {
  try {
    const db = readDB();
    const { note_id } = req.query;
    let movies = db.movies || [];
    
    if (note_id) {
      movies = movies.filter(m => (m.note_id ?? null) === (note_id ? parseInt(note_id) : null));
    }
    
    movies.sort((a, b) => a.position - b.position);
    res.json(movies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/movies
router.post('/', async (req, res) => {
  try {
    const db = readDB();
    if (!db.movies) db.movies = [];
    
    const data = req.body;
    const section = data.section || 'todo';
    const note_id = data.note_id ?? null;
    
    let position;
    if (section === 'futured') {
      position = db.movies.filter(m => m.section === 'futured' && (m.note_id ?? null) === note_id).length;
    } else {
      db.movies
        .filter(m => m.section === section && (m.note_id ?? null) === note_id)
        .forEach(m => { m.position = (m.position || 0) + 1 });
      position = 0;
    }
    
    const movie = {
      id: nextId(db.movies),
      tmdb_id: data.tmdb_id || null,
      imdb_id: data.imdb_id || null,
      title: data.title,
      release_date: data.release_date || null,
      release_year: data.release_year || '-',
      rating: data.rating || null,
      vote_count: data.vote_count || null,
      genre: data.genre || '-',
      director: data.director || '-',
      seasons: data.seasons || '-',
      poster_path: data.poster_path || null,
      section,
      position,
      note_id,
      note: data.note || '',
    };
    
    db.movies.push(movie);
    writeDB(db);
    res.json(movie);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/movies/:id
router.put('/:id', async (req, res) => {
  try {
    const db = readDB();
    const idx = (db.movies || []).findIndex(m => m.id === parseInt(req.params.id));
    if (idx === -1) return res.status(404).json({ error: 'Movie not found' });
    
    db.movies[idx] = { ...db.movies[idx], ...req.body };
    writeDB(db);
    res.json(db.movies[idx]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/movies/:id
router.delete('/:id', async (req, res) => {
  try {
    const db = readDB();
    db.movies = (db.movies || []).filter(m => m.id !== parseInt(req.params.id));
    writeDB(db);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/movies/move
router.post('/move', async (req, res) => {
  try {
    const db = readDB();
    const { id, section, position } = req.body;
    const idx = (db.movies || []).findIndex(m => m.id === id);
    
    if (idx === -1) return res.status(404).json({ error: 'Movie not found' });
    
    db.movies[idx].section = section;
    
    if (position !== null) {
      db.movies
        .filter(m => m.section === section && m.id !== id)
        .filter(m => m.position >= position)
        .forEach(m => { m.position = (m.position || 0) + 1 });
      db.movies[idx].position = position;
    } else {
      db.movies[idx].position = db.movies.filter(m => m.section === section && m.id !== id).length;
    }
    
    writeDB(db);
    res.json(db.movies[idx]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/movies/reorder
router.post('/reorder', async (req, res) => {
  try {
    const db = readDB();
    const { section, ids } = req.body;
    
    ids.forEach((id, position) => {
      const idx = (db.movies || []).findIndex(m => m.id === id);
      if (idx !== -1) db.movies[idx].position = position;
    });
    
    writeDB(db);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/movies/refresh-all
router.post('/refresh-all', async (req, res) => {
  try {
    // TODO: Implement TMDB/OMDB refresh logic
    res.json({ success: true, updated: 0, message: 'Refresh not implemented yet' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
