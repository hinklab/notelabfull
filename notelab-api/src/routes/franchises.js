const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { readDB, getUserSettings, saveUserSettings } = require('../services/database');

const DEFAULT_USER_ID = '0d3da195-1d0e-458b-9f88-2879561e0da6';

function getSupabase() {
  try {
    return require('../services/supabase');
  } catch {
    return null;
  }
}

async function getAllUserMovies(userId) {
  const db = readDB();
  const localMovies = (db.movies || []).filter(m => (m.user_id || DEFAULT_USER_ID) === userId);
  const supabase = getSupabase();
  if (!supabase) return localMovies;

  try {
    const { data: cloudMovies } = await supabase.from('movies').select('*').eq('user_id', userId);
    if (Array.isArray(cloudMovies) && cloudMovies.length > 0) {
      const mergedMap = new Map();
      localMovies.forEach(m => mergedMap.set(String(m.id), m));
      cloudMovies.forEach(m => mergedMap.set(String(m.id), { ...mergedMap.get(String(m.id)), ...m }));
      return Array.from(mergedMap.values());
    }
  } catch (e) {}

  return localMovies;
}

function loadFranchiseUniverses() {
  try {
    const filePath = path.join(__dirname, '../../data/franchise-universes.json');
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (e) {
    console.error('Failed reading franchise-universes.json:', e.message);
  }
  return {};
}

// GET /api/franchises/viewed — Return list of user's viewed franchises (most recent first)
router.get('/viewed', (req, res) => {
  try {
    const userId = req.userId || DEFAULT_USER_ID;
    const settings = getUserSettings(userId);
    const list = Array.isArray(settings.viewed_franchises) ? [...settings.viewed_franchises] : [];
    list.sort((a, b) => new Date(b.last_viewed_at || 0) - new Date(a.last_viewed_at || 0));
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/franchises/record-view — Explicitly touch/save a viewed franchise
router.post('/record-view', (req, res) => {
  try {
    const userId = req.userId || DEFAULT_USER_ID;
    const { tmdb_id, universe_key, name, is_universe, total_movies } = req.body;
    if (!tmdb_id && !universe_key) {
      return res.status(400).json({ error: 'tmdb_id or universe_key is required.' });
    }

    const settings = getUserSettings(userId);
    let list = Array.isArray(settings.viewed_franchises) ? [...settings.viewed_franchises] : [];

    const keyToMatch = universe_key || String(tmdb_id);
    const existingIndex = list.findIndex(item => (item.universe_key && item.universe_key === keyToMatch) || String(item.tmdb_id) === String(tmdb_id));

    const updatedItem = {
      key: keyToMatch,
      universe_key: universe_key || null,
      tmdb_id: tmdb_id ? Number(tmdb_id) : null,
      name: name || 'Franchise',
      is_universe: !!is_universe,
      total_movies: total_movies || 0,
      last_viewed_at: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      list[existingIndex] = { ...list[existingIndex], ...updatedItem };
    } else {
      list.unshift(updatedItem);
    }

    list.sort((a, b) => new Date(b.last_viewed_at || 0) - new Date(a.last_viewed_at || 0));
    if (list.length > 50) list = list.slice(0, 50);

    saveUserSettings(userId, { viewed_franchises: list });
    res.json({ success: true, viewed_franchises: list });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/franchises/:tmdbMovieId
router.get('/:tmdbMovieId', async (req, res) => {
  try {
    const { tmdbMovieId } = req.params;
    const mediaType = req.query.media_type || req.body?.media_type || 'movie';

    if (!tmdbMovieId) {
      return res.status(400).json({ error: 'tmdbMovieId is required.' });
    }

    const userId = req.userId || DEFAULT_USER_ID;
    const db = readDB();
    const settings = getUserSettings(userId, db);
    const tmdbKey = settings.tmdb_key;
    if (!tmdbKey) {
      return res.status(400).json({ error: 'TMDB API key is missing in settings.' });
    }

    const userMovies = await getAllUserMovies(userId);
    const userMovieMap = new Map();
    userMovies.forEach(m => {
      if (m.tmdb_id) userMovieMap.set(String(m.tmdb_id), m);
      if (m.imdb_id) userMovieMap.set(String(m.imdb_id), m);
    });

    // 1. Fetch movie or TV details from TMDB (respecting requested mediaType)
    let movieDetail = null;
    let isTv = mediaType === 'tv';

    if (isTv) {
      const tvUrl = `https://api.themoviedb.org/3/tv/${encodeURIComponent(tmdbMovieId)}?api_key=${encodeURIComponent(tmdbKey)}&language=en-US`;
      const tvRes = await fetch(tvUrl);
      if (tvRes.ok) {
        movieDetail = await tvRes.json();
      } else {
        const movieUrl = `https://api.themoviedb.org/3/movie/${encodeURIComponent(tmdbMovieId)}?api_key=${encodeURIComponent(tmdbKey)}&language=en-US`;
        const mRes = await fetch(movieUrl);
        if (mRes.ok) {
          movieDetail = await mRes.json();
          isTv = false;
        }
      }
    } else {
      const movieUrl = `https://api.themoviedb.org/3/movie/${encodeURIComponent(tmdbMovieId)}?api_key=${encodeURIComponent(tmdbKey)}&language=en-US`;
      const mRes = await fetch(movieUrl);
      if (mRes.ok) {
        movieDetail = await mRes.json();
      } else {
        const tvUrl = `https://api.themoviedb.org/3/tv/${encodeURIComponent(tmdbMovieId)}?api_key=${encodeURIComponent(tmdbKey)}&language=en-US`;
        const tvRes = await fetch(tvUrl);
        if (tvRes.ok) {
          movieDetail = await tvRes.json();
          isTv = true;
        }
      }
    }

    if (!movieDetail) {
      return res.status(404).json({ error: 'Movie/Show not found on TMDB.' });
    }

    const collection = movieDetail.belongs_to_collection || null;
    const universes = loadFranchiseUniverses();

    let universeKey = null;
    let universeConfig = null;

    // Check universe match by collection_id OR by direct tmdb_id!
    const targetIdNum = Number(tmdbMovieId);
    for (const [uKey, cfg] of Object.entries(universes)) {
      const matchColl = collection && collection.id && Array.isArray(cfg.collection_ids) && cfg.collection_ids.includes(collection.id);
      const matchKnown = Array.isArray(cfg.known_tmdb_ids) && cfg.known_tmdb_ids.includes(targetIdNum);
      const matchChrono = Array.isArray(cfg.chronological_order) && cfg.chronological_order.some(item => typeof item === 'object' ? item.id === targetIdNum : item === targetIdNum);

      if (matchColl || matchKnown || matchChrono) {
        universeKey = uKey;
        universeConfig = cfg;
        break;
      }
    }

    let moviesResult = [];
    let isUniverse = false;
    let universeName = null;
    let collectionName = collection ? collection.name : null;

    if (universeConfig && Array.isArray(universeConfig.chronological_order)) {
      // CASE A: Mapped Universe (e.g. MCU)
      isUniverse = true;
      universeName = universeConfig.name;

      const chronoOrderItems = universeConfig.chronological_order;
      const movieDetails = await Promise.all(
        chronoOrderItems.map(async (item) => {
          try {
            const itemId = typeof item === 'object' ? item.id : item;
            const itemType = typeof item === 'object' ? (item.type || 'movie') : 'movie';
            const endpoint = itemType === 'tv' ? 'tv' : 'movie';
            const url = `https://api.themoviedb.org/3/${endpoint}/${itemId}?api_key=${encodeURIComponent(tmdbKey)}&language=en-US`;
            const r = await fetch(url);
            if (r.ok) {
              const resData = await r.json();
              return { ...resData, _media_type: itemType };
            }
          } catch (e) {}
          return null;
        })
      );

      const validDetails = movieDetails.filter(Boolean);
      moviesResult = validDetails.map((d, index) => {
        const posterPath = d.poster_path ? `https://image.tmdb.org/t/p/w500${d.poster_path}` : null;
        const releaseDate = d.release_date || d.first_air_date || null;
        const releaseYear = releaseDate ? releaseDate.split('-')[0] : '-';
        const userM = userMovieMap.get(String(d.id));

        return {
          tmdb_id: d.id,
          media_type: d._media_type || (d.first_air_date ? 'tv' : 'movie'),
          title: d.title || d.name,
          release_date: releaseDate,
          release_year: releaseYear,
          rating: d.vote_average ? Number(d.vote_average.toFixed(1)) : null,
          poster_path: posterPath,
          overview: d.overview || '',
          chronology_index: index + 1,
          in_board: !!userM,
          user_movie: userM ? {
            id: userM.id,
            section: userM.section,
            user_rating: userM.user_rating || null,
          } : null
        };
      });

    } else if (collection && collection.id) {
      // CASE B: Unmapped standalone collection (e.g. Dark Knight Trilogy)
      const collUrl = `https://api.themoviedb.org/3/collection/${collection.id}?api_key=${encodeURIComponent(tmdbKey)}&language=en-US`;
      const cRes = await fetch(collUrl);
      if (cRes.ok) {
        const collData = await cRes.json();
        const parts = collData.parts || [];
        
        // Sort collection members by release_date ascending
        parts.sort((a, b) => new Date(a.release_date || '9999-99-99') - new Date(b.release_date || '9999-99-99'));

        moviesResult = parts.map((d, index) => {
          const posterPath = d.poster_path ? `https://image.tmdb.org/t/p/w500${d.poster_path}` : null;
          const releaseDate = d.release_date || null;
          const releaseYear = releaseDate ? releaseDate.split('-')[0] : '-';
          const userM = userMovieMap.get(String(d.id));

          return {
            tmdb_id: d.id,
            title: d.title || d.name,
            release_date: releaseDate,
            release_year: releaseYear,
            rating: d.vote_average ? Number(d.vote_average.toFixed(1)) : null,
            poster_path: posterPath,
            overview: d.overview || '',
            chronology_index: index + 1,
            in_board: !!userM,
            user_movie: userM ? {
              id: userM.id,
              section: userM.section,
              user_rating: userM.user_rating || null,
            } : null
          };
        });
      }
    } else {
      // CASE C: Single movie with no collection
      const posterPath = movieDetail.poster_path ? `https://image.tmdb.org/t/p/w500${movieDetail.poster_path}` : null;
      const releaseDate = movieDetail.release_date || movieDetail.first_air_date || null;
      const releaseYear = releaseDate ? releaseDate.split('-')[0] : '-';
      const userM = userMovieMap.get(String(movieDetail.id));

      moviesResult = [{
        tmdb_id: movieDetail.id,
        title: movieDetail.title || movieDetail.name,
        release_date: releaseDate,
        release_year: releaseYear,
        rating: movieDetail.vote_average ? Number(movieDetail.vote_average.toFixed(1)) : null,
        poster_path: posterPath,
        overview: movieDetail.overview || '',
        chronology_index: 1,
        in_board: !!userM,
        user_movie: userM ? {
          id: userM.id,
          section: userM.section,
          user_rating: userM.user_rating || null,
        } : null
      }];
    }

    const inBoardCount = moviesResult.filter(m => m.in_board).length;

    // Auto-record this franchise view into user's viewed franchises list
    try {
      const settings = getUserSettings(userId);
      let list = Array.isArray(settings.viewed_franchises) ? [...settings.viewed_franchises] : [];
      const keyToMatch = universeKey || String(tmdbMovieId);
      const fname = universeName || collectionName || (movieDetail ? (movieDetail.title || movieDetail.name) : 'Franchise');
      const existingIndex = list.findIndex(item => (item.universe_key && item.universe_key === keyToMatch) || String(item.tmdb_id) === String(tmdbMovieId));

      const updatedItem = {
        key: keyToMatch,
        universe_key: universeKey || null,
        tmdb_id: Number(tmdbMovieId),
        name: fname,
        is_universe: !!isUniverse,
        total_movies: moviesResult.length,
        last_viewed_at: new Date().toISOString()
      };

      if (existingIndex >= 0) {
        list[existingIndex] = { ...list[existingIndex], ...updatedItem };
      } else {
        list.unshift(updatedItem);
      }

      list.sort((a, b) => new Date(b.last_viewed_at || 0) - new Date(a.last_viewed_at || 0));
      if (list.length > 50) list = list.slice(0, 50);

      saveUserSettings(userId, { viewed_franchises: list });
    } catch (e) {
      console.warn('Auto-recording franchise view error:', e.message);
    }

    res.json({
      universe_key: universeKey,
      universe_name: universeName,
      collection_name: collectionName,
      is_universe: isUniverse,
      total_movies: moviesResult.length,
      in_board_count: inBoardCount,
      movies: moviesResult
    });

  } catch (err) {
    console.error('GET /api/franchises Error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
