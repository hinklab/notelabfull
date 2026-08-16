const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { readDB, getUserSettings } = require('../services/database');

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

// GET /api/franchises/:tmdbMovieId
router.get('/:tmdbMovieId', async (req, res) => {
  try {
    const { tmdbMovieId } = req.params;
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

    // 1. Fetch movie details from TMDB to find belongs_to_collection
    let movieDetail = null;
    let isTv = false;
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

    if (!movieDetail) {
      return res.status(404).json({ error: 'Movie not found on TMDB.' });
    }

    const collection = movieDetail.belongs_to_collection || null;
    const universes = loadFranchiseUniverses();

    let universeKey = null;
    let universeConfig = null;

    if (collection && collection.id) {
      const collId = collection.id;
      for (const [uKey, cfg] of Object.entries(universes)) {
        if (Array.isArray(cfg.collection_ids) && cfg.collection_ids.includes(collId)) {
          universeKey = uKey;
          universeConfig = cfg;
          break;
        }
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

      const chronoOrderIds = universeConfig.chronological_order;
      const movieDetails = await Promise.all(
        chronoOrderIds.map(async (id) => {
          try {
            const url = `https://api.themoviedb.org/3/movie/${id}?api_key=${encodeURIComponent(tmdbKey)}&language=en-US`;
            const r = await fetch(url);
            if (r.ok) return await r.json();
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
