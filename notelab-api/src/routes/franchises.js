const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { readDB, getUserSettings, saveUserSettings } = require('../services/database');

// Global in-memory cache for TMDB movie/TV details to ensure instant sub-50ms responses
const tmdbDetailsCache = new Map();

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

// Helper to strictly deduplicate and save viewed franchises
function recordFranchiseView(userId, payload) {
  const settings = getUserSettings(userId);
  let list = Array.isArray(settings.viewed_franchises) ? [...settings.viewed_franchises] : [];

  const { tmdb_id, universe_key, name, is_universe, total_movies } = payload;
  const targetUniverseKey = universe_key || null;
  const targetTmdbId = tmdb_id ? Number(tmdb_id) : null;
  const targetName = name || 'Franchise';

  // 1. Match by universe_key if present, else by tmdb_id, else by name
  const existingIndex = list.findIndex(item => {
    if (targetUniverseKey && (item.universe_key === targetUniverseKey || item.key === targetUniverseKey)) {
      return true;
    }
    if (targetTmdbId && Number(item.tmdb_id) === targetTmdbId) {
      return true;
    }
    if (item.name && item.name.toLowerCase().trim() === targetName.toLowerCase().trim()) {
      return true;
    }
    return false;
  });

  const updatedItem = {
    key: targetUniverseKey || (targetTmdbId ? `movie_${targetTmdbId}` : targetName),
    universe_key: targetUniverseKey,
    tmdb_id: targetTmdbId,
    name: targetName,
    is_universe: !!is_universe,
    total_movies: total_movies || 0,
    last_viewed_at: new Date().toISOString()
  };

  if (existingIndex >= 0) {
    list[existingIndex] = { ...list[existingIndex], ...updatedItem };
  } else {
    list.unshift(updatedItem);
  }

  // 2. Perform deep cleaning to strip any historical duplicate entries
  const seenKeys = new Set();
  const cleanList = [];
  for (const item of list) {
    const k = item.universe_key || item.key || (item.tmdb_id ? `movie_${item.tmdb_id}` : item.name);
    if (!seenKeys.has(k)) {
      seenKeys.add(k);
      cleanList.push(item);
    }
  }

  cleanList.sort((a, b) => new Date(b.last_viewed_at || 0) - new Date(a.last_viewed_at || 0));
  const finalResult = cleanList.slice(0, 50);

  saveUserSettings(userId, { viewed_franchises: finalResult });
  return finalResult;
}

// GET /api/franchises/viewed — Return list of user's viewed franchises (most recent first)
router.get('/viewed', (req, res) => {
  try {
    const userId = req.userId || DEFAULT_USER_ID;
    const settings = getUserSettings(userId);
    let list = Array.isArray(settings.viewed_franchises) ? [...settings.viewed_franchises] : [];

    // Deduplicate on read
    const seenKeys = new Set();
    const cleanList = [];
    for (const item of list) {
      const k = item.universe_key || item.key || (item.tmdb_id ? `movie_${item.tmdb_id}` : item.name);
      if (!seenKeys.has(k)) {
        seenKeys.add(k);
        cleanList.push(item);
      }
    }
    cleanList.sort((a, b) => new Date(b.last_viewed_at || 0) - new Date(a.last_viewed_at || 0));
    res.json(cleanList);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/franchises/record-view — Explicitly touch/save a viewed franchise
router.post('/record-view', (req, res) => {
  try {
    const userId = req.userId || DEFAULT_USER_ID;
    const { tmdb_id, universe_key } = req.body;
    if (!tmdb_id && !universe_key) {
      return res.status(400).json({ error: 'tmdb_id or universe_key is required.' });
    }

    const result = recordFranchiseView(userId, req.body);
    res.json({ success: true, viewed_franchises: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/franchises/viewed — Remove a franchise from history
router.delete('/viewed', (req, res) => {
  try {
    const userId = req.userId || DEFAULT_USER_ID;
    const rawKey = req.body?.key || req.body?.universe_key || req.body?.tmdb_id || req.query?.key || req.query?.tmdb_id;
    const targetKey = String(rawKey || '').trim();

    const settings = getUserSettings(userId);
    let list = Array.isArray(settings.viewed_franchises) ? [...settings.viewed_franchises] : [];

    list = list.filter(item => {
      const itemK = String(item.key || '').trim();
      const itemU = String(item.universe_key || '').trim();
      const itemT = String(item.tmdb_id || '').trim();
      const itemN = String(item.name || '').trim();

      if (itemK && (itemK === targetKey || itemK === `movie_${targetKey}`)) return false;
      if (itemU && itemU === targetKey) return false;
      if (itemT && (itemT === targetKey || `movie_${itemT}` === targetKey)) return false;
      if (itemN && itemN.toLowerCase() === targetKey.toLowerCase()) return false;
      return true;
    });

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
      moviesResult = await Promise.all(
        chronoOrderItems.map(async (item, index) => {
          const rawId = typeof item === 'object' ? item.id : item;
          const isStringId = typeof rawId === 'string' && rawId.includes('_s');
          const baseTmdbId = (typeof item === 'object' && item.tmdb_id) ? item.tmdb_id : (isStringId ? parseInt(rawId.split('_s')[0], 10) : Number(rawId));
          const seasonNumber = (typeof item === 'object' && item.season_number) ? item.season_number : (isStringId ? parseInt(rawId.split('_s')[1], 10) : null);
          const itemType = typeof item === 'object' ? (item.type || 'movie') : 'movie';
          const stage = (typeof item === 'object' && item.stage !== undefined) ? item.stage : null;
          const lane = (typeof item === 'object' && item.lane !== undefined) ? item.lane : null;
          const connects_to = (typeof item === 'object' && Array.isArray(item.connects_to)) ? item.connects_to : [];
          const userM = userMovieMap.get(String(baseTmdbId));

          if (userM) {
            return {
              id: rawId,
              tmdb_id: baseTmdbId,
              season_number: seasonNumber,
              media_type: userM.media_type || itemType,
              title: (typeof item === 'object' && item.title) ? item.title : (userM.title || `Movie ${baseTmdbId}`),
              release_date: userM.release_date || (typeof item === 'object' ? item.release_date : null),
              release_year: userM.release_year || (typeof item === 'object' ? item.release_year : '-'),
              rating: userM.rating || (typeof item === 'object' ? item.rating : null),
              poster_path: userM.poster_path || (typeof item === 'object' ? item.poster_path : null),
              overview: userM.overview || (typeof item === 'object' ? item.overview : ''),
              chronology_index: index + 1,
              stage,
              lane,
              connects_to,
              in_board: true,
              user_movie: {
                id: userM.id,
                section: userM.section,
                user_rating: userM.user_rating || null,
              }
            };
          }

          // If item already has pre-baked TMDB metadata, return instantly in 0ms!
          if (typeof item === 'object' && item.poster_path && item.title) {
            return {
              id: rawId,
              tmdb_id: baseTmdbId,
              season_number: seasonNumber,
              media_type: itemType,
              title: item.title,
              release_date: item.release_date || null,
              release_year: item.release_year || (item.release_date ? item.release_date.split('-')[0] : '-'),
              rating: item.rating || null,
              vote_count: item.vote_count || 0,
              poster_path: item.poster_path,
              overview: item.overview || '',
              chronology_index: index + 1,
              stage,
              lane,
              connects_to,
              in_board: false,
              user_movie: null
            };
          }

          const cacheKey = (itemType === 'tv' && seasonNumber) ? `tv_${baseTmdbId}_s${seasonNumber}` : `${itemType}_${baseTmdbId}`;
          if (tmdbDetailsCache.has(cacheKey)) {
            const cached = tmdbDetailsCache.get(cacheKey);
            return {
              id: rawId,
              tmdb_id: baseTmdbId,
              season_number: seasonNumber,
              media_type: itemType,
              ...cached,
              chronology_index: index + 1,
              stage,
              lane,
              connects_to,
              in_board: false,
              user_movie: null
            };
          }

          try {
            if (itemType === 'tv' && seasonNumber) {
              const url = `https://api.themoviedb.org/3/tv/${baseTmdbId}/season/${seasonNumber}?api_key=${encodeURIComponent(tmdbKey)}&language=en-US`;
              const r = await fetch(url, { signal: AbortSignal.timeout(2500) });
              if (r.ok) {
                const sd = await r.json();
                const releaseDate = sd.air_date || (typeof item === 'object' ? item.release_date : null);
                const posterPath = sd.poster_path ? `https://image.tmdb.org/t/p/w500${sd.poster_path}` : (typeof item === 'object' ? item.poster_path : null);
                const overview = (sd.overview && sd.overview.trim().length > 0) ? sd.overview : (typeof item === 'object' ? item.overview || '' : '');
                
                const itemInfo = {
                  title: (typeof item === 'object' && item.title) ? item.title : `Season ${seasonNumber}`,
                  release_date: releaseDate,
                  release_year: releaseDate ? releaseDate.split('-')[0] : (typeof item === 'object' ? item.release_year || '-' : '-'),
                  rating: sd.vote_average ? Number(sd.vote_average.toFixed(1)) : (typeof item === 'object' ? item.rating || null : null),
                  vote_count: sd.vote_count || 0,
                  poster_path: posterPath,
                  overview
                };

                tmdbDetailsCache.set(cacheKey, itemInfo);

                return {
                  id: rawId,
                  tmdb_id: baseTmdbId,
                  season_number: seasonNumber,
                  media_type: itemType,
                  ...itemInfo,
                  chronology_index: index + 1,
                  stage,
                  lane,
                  connects_to,
                  in_board: false,
                  user_movie: null
                };
              }
            } else {
              const endpoint = itemType === 'tv' ? 'tv' : 'movie';
              const url = `https://api.themoviedb.org/3/${endpoint}/${baseTmdbId}?api_key=${encodeURIComponent(tmdbKey)}&language=en-US`;
              const r = await fetch(url, { signal: AbortSignal.timeout(2500) });
              if (r.ok) {
                const resData = await r.json();
                const releaseDate = resData.release_date || resData.first_air_date || (typeof item === 'object' ? item.release_date : null);
                const posterPath = resData.poster_path ? `https://image.tmdb.org/t/p/w500${resData.poster_path}` : (typeof item === 'object' ? item.poster_path : null);
                const overview = (resData.overview && resData.overview.trim().length > 0) ? resData.overview : (typeof item === 'object' ? item.overview || '' : '');
                
                const itemInfo = {
                  title: (typeof item === 'object' && item.title) ? item.title : (resData.title || resData.name || `Movie ${baseTmdbId}`),
                  release_date: releaseDate,
                  release_year: releaseDate ? releaseDate.split('-')[0] : (typeof item === 'object' ? item.release_year || '-' : '-'),
                  rating: resData.vote_average ? Number(resData.vote_average.toFixed(1)) : (typeof item === 'object' ? item.rating || null : null),
                  vote_count: resData.vote_count || 0,
                  poster_path: posterPath,
                  overview
                };

                tmdbDetailsCache.set(cacheKey, itemInfo);

                return {
                  id: rawId,
                  tmdb_id: baseTmdbId,
                  season_number: seasonNumber,
                  media_type: itemType,
                  ...itemInfo,
                  chronology_index: index + 1,
                  stage,
                  lane,
                  connects_to,
                  in_board: false,
                  user_movie: null
                };
              }
            }
          } catch (e) {}

          return {
            id: rawId,
            tmdb_id: baseTmdbId,
            season_number: seasonNumber,
            media_type: itemType,
            title: (typeof item === 'object' && item.title) ? item.title : `Movie ${baseTmdbId}`,
            release_date: (typeof item === 'object' && item.release_date) ? item.release_date : null,
            release_year: (typeof item === 'object' && item.release_year) ? item.release_year : '-',
            rating: (typeof item === 'object' && item.rating) ? item.rating : null,
            poster_path: (typeof item === 'object' && item.poster_path) ? item.poster_path : null,
            overview: (typeof item === 'object' && item.overview) ? item.overview : '',
            chronology_index: index + 1,
            stage,
            lane,
            connects_to,
            in_board: false,
            user_movie: null
          };
        })
      );

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
      const fname = universeName || collectionName || (movieDetail ? (movieDetail.title || movieDetail.name) : 'Franchise');
      recordFranchiseView(userId, {
        tmdb_id: Number(tmdbMovieId),
        universe_key: universeKey || null,
        name: fname,
        is_universe: !!isUniverse,
        total_movies: moviesResult.length
      });
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
