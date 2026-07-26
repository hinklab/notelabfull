const express = require('express');
const router = express.Router();
const { readDB, writeDB, getUserSettings, saveUserSettings } = require('../services/database');
const { createReleaseAlert, generateRecommendations } = require('../services/notifications');

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

const DEFAULT_USER_ID = '0d3da195-1d0e-458b-9f88-2879561e0da6';

// GET /api/movies?note_id=123
router.get('/', async (req, res) => {
  try {
    const db = readDB();
    const { note_id } = req.query;
    const userId = req.userId || DEFAULT_USER_ID;
    let movies = (db.movies || []).filter(m => (m.user_id || DEFAULT_USER_ID) === userId);
    
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
    
    const userId = req.userId || DEFAULT_USER_ID;
    const data = req.body;
    const section = data.section || 'todo';
    let note_id = data.note_id ?? null;
    if (!note_id) {
      const userNotes = (db.notes || []).filter(n => (n.user_id || DEFAULT_USER_ID) === userId);
      const movieNote = userNotes.find(n => n.is_movie || n.type === 'movie');
      if (movieNote) note_id = movieNote.id;
    }
    
    let position;
    if (section === 'futured') {
      position = db.movies.filter(m => (m.user_id || DEFAULT_USER_ID) === userId && m.section === 'futured' && (m.note_id ?? null) === note_id).length;
    } else {
      db.movies
        .filter(m => (m.user_id || DEFAULT_USER_ID) === userId && m.section === section && (m.note_id ?? null) === note_id)
        .forEach(m => { m.position = (m.position || 0) + 1 });
      position = 0;
    }
    
    const settings = getUserSettings(userId, db);
    const tmdbKey = settings.tmdb_key;
    const omdbKey = settings.omdb_key;

    let genre = data.genre || '-';
    let director = data.director || '-';
    let overview = data.overview || '';
    let poster_path = data.poster_path || null;
    let release_date = data.release_date || null;
    let release_year = data.release_year || '-';
    let rating = data.rating || null;
    let vote_count = data.vote_count || null;

    const isTv = data.media_type === 'tv';
    let media_type = data.media_type || (isTv ? 'tv' : 'movie');

    if (data.tmdb_id && tmdbKey) {
      try {
        let primaryUrl = isTv
          ? `https://api.themoviedb.org/3/tv/${encodeURIComponent(data.tmdb_id)}?api_key=${encodeURIComponent(tmdbKey)}&append_to_response=credits&language=en-US`
          : `https://api.themoviedb.org/3/movie/${encodeURIComponent(data.tmdb_id)}?api_key=${encodeURIComponent(tmdbKey)}&append_to_response=credits&language=en-US`;
        let fallbackUrl = isTv
          ? `https://api.themoviedb.org/3/movie/${encodeURIComponent(data.tmdb_id)}?api_key=${encodeURIComponent(tmdbKey)}&append_to_response=credits&language=en-US`
          : `https://api.themoviedb.org/3/tv/${encodeURIComponent(data.tmdb_id)}?api_key=${encodeURIComponent(tmdbKey)}&append_to_response=credits&language=en-US`;

        let res = await fetch(primaryUrl);
        if (!res.ok && res.status === 404) {
          res = await fetch(fallbackUrl);
        }
        if (res.ok) {
          const detail = await res.json();
          if (detail.first_air_date || detail.number_of_seasons) media_type = 'tv';
          else if (detail.release_date || detail.runtime) media_type = 'movie';

          release_date = detail.release_date || detail.first_air_date || release_date;
          release_year = release_date ? release_date.split('-')[0] : release_year;
          rating = detail.vote_average ? Number(detail.vote_average.toFixed(1)) : rating;
          vote_count = detail.vote_count ?? vote_count;
          if (detail.poster_path) poster_path = `https://image.tmdb.org/t/p/w500${detail.poster_path}`;
          if (detail.genres && detail.genres.length) genre = detail.genres.map(g => g.name).join(', ');
          if (detail.credits && detail.credits.crew) {
            const dirObj = detail.credits.crew.find(c => c.job === 'Director');
            if (dirObj) director = dirObj.name;
          }
          if (detail.created_by && detail.created_by.length && (director === '-' || !director)) {
            director = detail.created_by.map(c => c.name).join(', ');
          }
          if (detail.overview) overview = detail.overview;
        }
      } catch (err) {
        console.error('TMDB Enrich Error on Add:', err.message);
      }
    } else if (data.imdb_id && omdbKey) {
      try {
        const url = `http://www.omdbapi.com/?apikey=${encodeURIComponent(omdbKey)}&i=${encodeURIComponent(data.imdb_id)}`;
        const res = await fetch(url);
        if (res.ok) {
          const detail = await res.json();
          if (detail.Response !== 'False') {
            if (detail.Genre && detail.Genre !== 'N/A') genre = detail.Genre;
            if (detail.Director && detail.Director !== 'N/A') director = detail.Director;
            if (detail.Plot && detail.Plot !== 'N/A') overview = detail.Plot;
            if (detail.Poster && detail.Poster !== 'N/A') poster_path = detail.Poster;
            if (detail.Year && detail.Year !== 'N/A') release_year = detail.Year;
            if (detail.imdbRating && detail.imdbRating !== 'N/A') rating = parseFloat(detail.imdbRating);
            if (detail.imdbVotes && detail.imdbVotes !== 'N/A') vote_count = parseInt(detail.imdbVotes.replace(/,/g, ''));
          }
        }
      } catch (err) {
        console.error('OMDB Enrich Error on Add:', err.message);
      }
    }

    const movie = {
      id: nextId(db.movies),
      user_id: userId,
      tmdb_id: data.tmdb_id || null,
      imdb_id: data.imdb_id || null,
      media_type,
      title: data.title,
      release_date,
      release_year,
      rating,
      vote_count,
      genre,
      director,
      overview,
      seasons: data.seasons || '-',
      poster_path,
      section,
      position,
      note_id,
      note: (data.note && data.note !== overview && data.note.trim() !== (overview || '').trim()) ? data.note : '',
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
    const userId = req.userId || DEFAULT_USER_ID;
    const idx = (db.movies || []).findIndex(m => m.id === parseInt(req.params.id) && (m.user_id || DEFAULT_USER_ID) === userId);
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
    const userId = req.userId || DEFAULT_USER_ID;
    db.movies = (db.movies || []).filter(m => !(m.id === parseInt(req.params.id) && (m.user_id || DEFAULT_USER_ID) === userId));
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
    const userId = req.userId || DEFAULT_USER_ID;
    const { id, section, position } = req.body;
    const idx = (db.movies || []).findIndex(m => m.id === id && (m.user_id || DEFAULT_USER_ID) === userId);
    
    if (idx === -1) return res.status(404).json({ error: 'Movie not found' });
    
    db.movies[idx].section = section;
    
    if (position !== null) {
      db.movies
        .filter(m => (m.user_id || DEFAULT_USER_ID) === userId && m.section === section && m.id !== id)
        .filter(m => m.position >= position)
        .forEach(m => { m.position = (m.position || 0) + 1 });
      db.movies[idx].position = position;
    } else {
      db.movies[idx].position = db.movies.filter(m => (m.user_id || DEFAULT_USER_ID) === userId && m.section === section && m.id !== id).length;
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
    const userId = req.userId || DEFAULT_USER_ID;
    const { section, ids } = req.body;
    
    ids.forEach((id, position) => {
      const idx = (db.movies || []).findIndex(m => m.id === id && (m.user_id || DEFAULT_USER_ID) === userId);
      if (idx !== -1) db.movies[idx].position = position;
    });
    
    writeDB(db);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function autoMigrateFuturedMovies(db) {
  let migratedCount = 0;
  const today = new Date().toISOString().slice(0, 10);
  const movies = db.movies || [];

  for (const m of movies) {
    if (m.section === 'futured' && m.release_date) {
      if (m.release_date <= today) {
        const todoMovies = movies.filter(
          x => (x.user_id || DEFAULT_USER_ID) === (m.user_id || DEFAULT_USER_ID) && x.section === 'todo' && (x.note_id ?? null) === (m.note_id ?? null)
        );
        m.section = 'todo';
        m.position = todoMovies.length;
        migratedCount++;
        console.log(`[AUTO-MIGRATE] Movie "${m.title}" (release: ${m.release_date}) moved from 'futured' to 'todo'`);
        try {
          createReleaseAlert(m.user_id || '0d3da195-1d0e-458b-9f88-2879561e0da6', m);
        } catch (e) {
          console.error('Error creating release alert:', e.message);
        }
      }
    }
  }

  if (migratedCount > 0) {
    writeDB(db);
    console.log(`[AUTO-MIGRATE] Total ${migratedCount} movie(s) migrated from 'futured' to 'todo'`);
  }
  return migratedCount;
}

// POST /api/movies/refresh-all
router.post('/refresh-all', async (req, res) => {
  try {
    const db = readDB();
    const userId = req.userId || DEFAULT_USER_ID;
    const settings = getUserSettings(userId, db);
    const tmdbKey = settings.tmdb_key;
    const omdbKey = settings.omdb_key;

    const isAuto = req.query.auto === 'true' || req.body?.auto === true;
    const lastRefreshKey = `last_refresh_all_${userId}`;
    const lastRefreshStr = settings[lastRefreshKey];

    if (isAuto && lastRefreshStr) {
      const lastTime = new Date(lastRefreshStr).getTime();
      const now = Date.now();
      if (now - lastTime < 24 * 60 * 60 * 1000) {
        console.log(`[REFRESH-ALL] Auto refresh skipped for userId ${userId}: < 24h passed since ${lastRefreshStr}`);
        return res.json({ success: true, skipped: true, message: 'Auto refresh skipped (< 24h)' });
      }
    }

    saveUserSettings(userId, { [lastRefreshKey]: new Date().toISOString() });

    let updatedCount = 0;
    let mismatchesCorrected = 0;
    let failedTitles = [];
    const movies = (db.movies || []).filter(m => (m.user_id || DEFAULT_USER_ID) === userId);

    for (const m of movies) {
      let changed = false;

      // Prefer OMDB when imdb_id is available
      if (m.imdb_id && omdbKey) {
        try {
          const url = `http://www.omdbapi.com/?apikey=${encodeURIComponent(omdbKey)}&i=${encodeURIComponent(m.imdb_id)}`;
          const omdbRes = await fetch(url);
          console.log(`  -> OMDB API response status for "${m.title}": ${omdbRes.status}`);
          if (omdbRes.ok) {
            const data = await omdbRes.json();
            console.log(`  -> OMDB data fetched:`, data);
            if (data.Response !== 'False') {
              const newTitle = data.Title;
              const newRating = data.imdbRating && data.imdbRating !== 'N/A' ? parseFloat(data.imdbRating) : m.rating;
              const newVoteCount = data.imdbVotes && data.imdbVotes !== 'N/A' ? parseInt(data.imdbVotes.replace(/,/g, '').replace(/\./g, '')) : m.vote_count;
              const newPosterPath = data.Poster && data.Poster !== 'N/A' ? data.Poster : m.poster_path;
              const newGenre = data.Genre && data.Genre !== 'N/A' ? data.Genre : (m.genre || '-');
              const newDirector = data.Director && data.Director !== 'N/A' ? data.Director : (m.director || '-');
              const newReleaseYear = data.Year && data.Year !== 'N/A' ? data.Year : (m.release_year || '-');

              if (newTitle && newTitle !== m.title) { mismatchesCorrected++; m.title = newTitle; changed = true; }
              if (newRating !== m.rating) { m.rating = newRating; changed = true; }
              if (newVoteCount !== m.vote_count) { m.vote_count = newVoteCount; changed = true; }
              if (newPosterPath !== m.poster_path) { m.poster_path = newPosterPath; changed = true; }
              if (newGenre !== m.genre) { m.genre = newGenre; changed = true; }
              if (newDirector !== m.director) { m.director = newDirector; changed = true; }
              if (newReleaseYear !== m.release_year) { m.release_year = newReleaseYear; changed = true; }

              console.log(`  -> OMDB data applied for "${m.title}"`);
            } else {
              failedTitles.push(m.title);
            }
          } else {
            failedTitles.push(m.title);
          }
        } catch (e) {
          failedTitles.push(m.title);
        }
      } else if (m.tmdb_id && tmdbKey) {
        // Fallback to TMDB when no imdb_id
        try {
          const primaryUrl = `https://api.themoviedb.org/3/movie/${encodeURIComponent(m.tmdb_id)}?api_key=${encodeURIComponent(tmdbKey)}`;
          const fallbackUrl = `https://api.themoviedb.org/3/tv/${encodeURIComponent(m.tmdb_id)}?api_key=${encodeURIComponent(tmdbKey)}`;
          let tmdbRes = await fetch(primaryUrl);
          if (!tmdbRes.ok && tmdbRes.status === 404) {
            tmdbRes = await fetch(fallbackUrl);
          }
          if (tmdbRes.ok) {
            const data = await tmdbRes.json();
            const newReleaseDate = data.release_date || data.first_air_date || m.release_date || null;
            const newReleaseYear = newReleaseDate ? newReleaseDate.split('-')[0] : (m.release_year || '-');
            const newTitle = data.title || data.name;
            const newRating = data.vote_average ? Number(data.vote_average.toFixed(1)) : m.rating;
            const newVoteCount = data.vote_count ?? m.vote_count;
            const newPosterPath = data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : m.poster_path;
            const newGenre = data.genres && data.genres.length ? data.genres.map(g => g.name).join(', ') : (m.genre || '-');

            if (newTitle && newTitle !== m.title) { mismatchesCorrected++; m.title = newTitle; changed = true; }
            if (newReleaseDate !== m.release_date) { m.release_date = newReleaseDate; changed = true; }
            if (newReleaseYear !== m.release_year) { m.release_year = newReleaseYear; changed = true; }
            if (newRating !== m.rating) { m.rating = newRating; changed = true; }
            if (newVoteCount !== m.vote_count) { m.vote_count = newVoteCount; changed = true; }
            if (newPosterPath !== m.poster_path) { m.poster_path = newPosterPath; changed = true; }
            if (newGenre !== m.genre) { m.genre = newGenre; changed = true; }

            console.log(`  -> TMDB data applied for "${m.title}"`);
          } else {
            failedTitles.push(m.title);
          }
        } catch (e) {
          failedTitles.push(m.title);
        }
      } else {
        console.log(`  -> Skipped movie "${m.title}" (no identifiers)`);
      }

      if (changed) {
        updatedCount++;
      }
    }

    // Auto-migrate futured movies whose release dates have passed
    const autoMigratedCount = autoMigrateFuturedMovies(db);
    const totalChanges = updatedCount + autoMigratedCount;

    if (updatedCount > 0 && autoMigratedCount === 0) {
      writeDB(db);
    }

    console.log(`[REFRESH-ALL] Calling generateRecommendations for userId: ${userId}`);
    try {
      const notifs = await generateRecommendations(userId);
      console.log(`[REFRESH-ALL] generateRecommendations completed. Generated ${notifs ? notifs.length : 0} notification(s).`);
    } catch (e) {
      console.error('[REFRESH-ALL] Error generating recommendations:', e.stack || e.message);
    }

    res.json({
      success: true,
      updated: totalChanges,
      mismatchesCorrected,
      failedTitles,
      message: `${totalChanges} ta kino ma'lumotlari yangilandi va ko'chirildi`,
    });
  } catch (err) {
    console.error('[REFRESH-ALL] Global route error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
module.exports.autoMigrateFuturedMovies = autoMigrateFuturedMovies;
