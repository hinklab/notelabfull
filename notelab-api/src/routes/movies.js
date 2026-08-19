const express = require('express');
const router = express.Router();
const { readDB, writeDB, getUserSettings, saveUserSettings } = require('../services/database');
const { createReleaseAlert, generateRecommendations, deleteRecommendationForMovie } = require('../services/notifications');

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

function getSupabase() {
  try {
    return require('../services/supabase');
  } catch {
    return null;
  }
}

function formatDurationUz(totalMinutes, isEstimated = false) {
  if (!totalMinutes || totalMinutes <= 0) return '-';
  const prefix = isEstimated ? '~' : '';

  const minutesInDay = 24 * 60;
  const minutesInHour = 60;

  if (totalMinutes >= minutesInDay) {
    const days = Math.floor(totalMinutes / minutesInDay);
    const rem = totalMinutes % minutesInDay;
    const hours = Math.floor(rem / minutesInHour);
    const mins = rem % minutesInHour;

    const parts = [`${days} kun`];
    if (hours > 0) parts.push(`${hours} soat`);
    if (mins > 0) parts.push(`${mins} daqiqa`);
    return `${prefix}${parts.join(' ')}`;
  }

  if (totalMinutes >= minutesInHour) {
    const hours = Math.floor(totalMinutes / minutesInHour);
    const mins = totalMinutes % minutesInHour;

    const parts = [`${hours} soat`];
    if (mins > 0) parts.push(`${mins} daqiqa`);
    return `${prefix}${parts.join(' ')}`;
  }

  return `${prefix}${totalMinutes} daqiqa`;
}

async function resolveTvRuntime(tmdbId, tmdbKey, tvDetail) {
  const seasonsList = (tvDetail.seasons || []).filter(s => s.season_number > 0);
  const numberOfSeasons = tvDetail.number_of_seasons || seasonsList.length || 1;
  const numberOfEpisodes = tvDetail.number_of_episodes || seasonsList.reduce((sum, s) => sum + (s.episode_count || 0), 0) || 1;

  let totalMinutes = 0;
  let exactCount = 0;
  let hasMissing = false;

  if (seasonsList.length > 0 && tmdbId && tmdbKey) {
    try {
      const seasonPromises = seasonsList.map(s =>
        fetch(`https://api.themoviedb.org/3/tv/${encodeURIComponent(tmdbId)}/season/${s.season_number}?api_key=${encodeURIComponent(tmdbKey)}`, { signal: AbortSignal.timeout(3500) })
          .then(r => r.ok ? r.json() : null)
          .catch(() => null)
      );
      const seasonsData = await Promise.all(seasonPromises);
      seasonsData.forEach(sData => {
        if (sData && Array.isArray(sData.episodes)) {
          sData.episodes.forEach(ep => {
            if (ep.runtime && ep.runtime > 0) {
              totalMinutes += ep.runtime;
              exactCount++;
            } else {
              hasMissing = true;
            }
          });
        }
      });
    } catch (e) {
      console.warn('Season fetch error:', e.message);
    }
  }

  const avgEpRt = (tvDetail.episode_run_time && tvDetail.episode_run_time.length > 0) ? tvDetail.episode_run_time[0] : null;
  const isEstimated = exactCount === 0 || hasMissing || exactCount < numberOfEpisodes;

  if (exactCount === 0) {
    const fallbackPerEp = avgEpRt || 45;
    totalMinutes = numberOfEpisodes * fallbackPerEp;
  } else if (hasMissing && exactCount < numberOfEpisodes) {
    const missingCount = numberOfEpisodes - exactCount;
    const avgCalculated = Math.round(totalMinutes / exactCount) || avgEpRt || 45;
    totalMinutes += missingCount * avgCalculated;
  }

  const humanStr = formatDurationUz(totalMinutes, isEstimated);
  const parts = [];
  parts.push(`${numberOfSeasons} season${numberOfSeasons > 1 ? 's' : ''}`);
  parts.push(`${numberOfEpisodes} ep`);
  parts.push(`${humanStr} (${totalMinutes} min)`);
  return parts.join(' · ');
}

function sanitizeForSupabase(obj) {
  const allowed = [
    'id', 'user_id', 'note_id', 'title', 'section', 'position',
    'tmdb_id', 'imdb_id', 'media_type', 'poster_path', 'rating',
    'vote_count', 'genre', 'director', 'overview', 'release_date',
    'release_year', 'seasons', 'note', 'updated_at'
  ];
  const clean = {};
  for (const k of allowed) {
    if (obj && obj[k] !== undefined) clean[k] = obj[k];
  }

  // Guard against temporary optimistic string IDs (e.g. 'temp_1786077778023') being sent to Supabase bigint columns
  if (clean.id !== undefined && (typeof clean.id === 'string' && (clean.id.startsWith('temp_') || isNaN(Number(clean.id))))) {
    delete clean.id;
  } else if (clean.id !== undefined && clean.id !== null) {
    clean.id = Number(clean.id);
  }

  if (clean.note_id !== undefined && (typeof clean.note_id === 'string' && (clean.note_id.startsWith('temp_') || isNaN(Number(clean.note_id))))) {
    delete clean.note_id;
  } else if (clean.note_id != null) {
    clean.note_id = Number(clean.note_id);
  }

  if (clean.tmdb_id !== undefined && clean.tmdb_id !== null) {
    if (typeof clean.tmdb_id === 'string' && (clean.tmdb_id.startsWith('temp_') || isNaN(Number(clean.tmdb_id)))) {
      delete clean.tmdb_id;
    } else {
      clean.tmdb_id = Number(clean.tmdb_id);
    }
  }

  if (clean.position !== undefined && (clean.position === null || isNaN(Number(clean.position)))) {
    clean.position = 0;
  } else if (clean.position !== undefined) {
    clean.position = Number(clean.position);
  }

  return clean;
}

function withTimeout(promise, ms = 2500) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Supabase query timed out')), ms))
  ]);
}

// GET /api/movies?note_id=123
router.get('/', async (req, res) => {
  try {
    const { note_id } = req.query;
    const userId = req.userId || DEFAULT_USER_ID;
    let movies = null;
    const db = readDB();

    const supabase = getSupabase();
    if (supabase) {
      try {
        let query = supabase.from('movies').select('*').eq('user_id', userId);
        if (note_id) {
          query = query.eq('note_id', parseInt(note_id));
        }
        const { data: cloudMovies, error: cloudErr } = await withTimeout(query, 2500);
        if (!cloudErr && Array.isArray(cloudMovies) && cloudMovies.length > 0) {
          movies = cloudMovies;
        }
      } catch (cloudEx) {
        console.warn('Cloud fetch for movies failed, falling back to local DB:', cloudEx.message);
      }
    }

    if (!movies) {
      movies = (db.movies || []).filter(m => (m.user_id || DEFAULT_USER_ID) === userId);
      if (note_id) {
        movies = movies.filter(m => (m.note_id ?? null) === (note_id ? parseInt(note_id) : null));
      }
    }

    movies.sort((a, b) => (a.position || 0) - (b.position || 0));

    movies = movies.map(m => {
      const localMovie = (db.movies || []).find(lm => String(lm.id) === String(m.id));
      const localRating = localMovie ? localMovie.user_rating : null;
      const finalUserRating = m.user_rating != null ? Number(m.user_rating) : (localRating != null ? Number(localRating) : null);

      return {
        ...m,
        user_rating: finalUserRating,
        avg_rating: finalUserRating,
        avg_user_rating: finalUserRating
      };
    });

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

    // Server-side deduplication guard: if movie with same tmdb_id, imdb_id, or title already exists, return existing movie!
    const existingMovie = db.movies.find(m =>
      (m.user_id || DEFAULT_USER_ID) === userId && (
        (data.tmdb_id && m.tmdb_id && String(m.tmdb_id) === String(data.tmdb_id)) ||
        (data.imdb_id && m.imdb_id && String(m.imdb_id) === String(data.imdb_id)) ||
        (data.title && m.title && m.title.toLowerCase().trim() === String(data.title).toLowerCase().trim())
      )
    );

    if (existingMovie) {
      console.log(`[POST /api/movies] Skipped duplicate addition for "${data.title}" (existing id: ${existingMovie.id})`);
      deleteRecommendationForMovie(userId, existingMovie).catch(() => {});
      return res.json(existingMovie);
    }

    let note_id = data.note_id ?? null;
    if (!note_id) {
      const userNotes = (db.notes || []).filter(n => (n.user_id || DEFAULT_USER_ID) === userId);
      const movieNote = userNotes.find(n => n.is_movie || n.type === 'movie');
      if (movieNote) note_id = movieNote.id;
    }
    
    let position;
    if (section === 'todo') {
      let existingTodo = (db.movies || []).filter(m => (m.user_id || DEFAULT_USER_ID) === userId && m.section === 'todo' && (m.note_id ?? null) === note_id);
      
      const supabase = getSupabase();
      if (supabase) {
        try {
          let sbQuery = supabase.from('movies').select('position').eq('user_id', userId).eq('section', 'todo');
          if (note_id) sbQuery = sbQuery.eq('note_id', parseInt(note_id));
          const { data: sbTodo } = await sbQuery;
          if (Array.isArray(sbTodo) && sbTodo.length > 0) {
            existingTodo = sbTodo;
          }
        } catch (e) {}
      }

      const minPos = existingTodo.length > 0 ? Math.min(...existingTodo.map(m => m.position ?? 0)) : 0;
      position = minPos <= 0 ? minPos - 1 : -1;
    } else if (section === 'futured') {
      position = (db.movies || []).filter(m => (m.user_id || DEFAULT_USER_ID) === userId && m.section === 'futured' && (m.note_id ?? null) === note_id).length;
    } else {
      const existingInSec = (db.movies || []).filter(m => (m.user_id || DEFAULT_USER_ID) === userId && m.section === section && (m.note_id ?? null) === note_id);
      position = existingInSec.length > 0 ? Math.max(...existingInSec.map(m => m.position ?? 0)) + 1 : 0;
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
    let seasons = data.seasons || '-';

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

          // Extract accurate runtime info into seasons field
          if (media_type === 'tv' || detail.number_of_seasons) {
            seasons = await resolveTvRuntime(data.tmdb_id, tmdbKey, detail);
          } else if (detail.runtime) {
            seasons = `${detail.runtime} min`;
          }
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
      seasons,
      poster_path,
      section,
      position,
      note_id,
      note: (data.note && data.note !== overview && data.note.trim() !== (overview || '').trim()) ? data.note : '',
    };
    
    db.movies.push(movie);
    await writeDB(db);

    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from('movies').upsert([sanitizeForSupabase(movie)], { onConflict: 'id' });
      } catch (e) {}
    }

    // Auto-clean any recommendation notification matching this newly added movie
    deleteRecommendationForMovie(userId, movie).catch(() => {});

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
    const targetId = req.params.id;
    let idx = (db.movies || []).findIndex(m => String(m.id) === String(targetId) && (m.user_id || DEFAULT_USER_ID) === userId);
    
    if (idx !== -1) {
      db.movies[idx] = { ...db.movies[idx], ...req.body };
      await writeDB(db);
    }

    const supabase = getSupabase();
    if (supabase) {
      try {
        const updatePayload = sanitizeForSupabase({ ...req.body, updated_at: new Date().toISOString() });
        delete updatePayload.id;
        if (Object.keys(updatePayload).length > 0) {
          await supabase.from('movies').update(updatePayload).eq('id', targetId);
        }

        if (req.body.user_rating !== undefined) {
          const { data: existingRow } = await supabase
            .from('user_settings')
            .select('*')
            .eq('id', 'movie_ratings')
            .single();

          const ratingsMap = (existingRow && existingRow.settings) ? existingRow.settings : {};
          if (req.body.user_rating === null) {
            delete ratingsMap[String(targetId)];
          } else {
            ratingsMap[String(targetId)] = Number(req.body.user_rating);
          }

          await supabase.from('user_settings').upsert({
            id: 'movie_ratings',
            user_id: userId,
            settings: ratingsMap,
            updated_at: new Date().toISOString()
          });
        }
      } catch (e) {
        console.error('Supabase movie rating upsert error:', e.message);
      }
    }

    if (idx !== -1) {
      return res.json(db.movies[idx]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/movies/:id
router.delete('/:id', async (req, res) => {
  try {
    const targetId = req.params.id;
    const userId = req.userId || DEFAULT_USER_ID;
    const db = readDB();
    db.movies = (db.movies || []).filter(m => !(String(m.id) === String(targetId) && (m.user_id || DEFAULT_USER_ID) === userId));
    await writeDB(db, { deletedMovieId: targetId });

    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from('movies').delete().eq('id', targetId);
      } catch (e) {}
    }

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
    let idx = (db.movies || []).findIndex(m => String(m.id) === String(id) && (m.user_id || DEFAULT_USER_ID) === userId);
    
    if (idx !== -1) {
      db.movies[idx].section = section;
      if (section !== 'done') {
        db.movies[idx].user_rating = null;
      }
      
      if (position !== null && position !== undefined) {
        db.movies
          .filter(m => (m.user_id || DEFAULT_USER_ID) === userId && m.section === section && String(m.id) !== String(id))
          .filter(m => m.position >= position)
          .forEach(m => { m.position = (m.position || 0) + 1 });
        db.movies[idx].position = position;
      } else {
        db.movies[idx].position = db.movies.filter(m => (m.user_id || DEFAULT_USER_ID) === userId && m.section === section && String(m.id) !== String(id)).length;
      }
      
      await writeDB(db);
    }

    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from('movies').update({
          section,
          position: position ?? 0,
          updated_at: new Date().toISOString()
        }).eq('id', id);

        if (section !== 'done') {
          const { data: existingRow } = await supabase
            .from('user_settings')
            .select('*')
            .eq('id', 'movie_ratings')
            .single();

          if (existingRow && existingRow.settings && existingRow.settings[String(id)] !== undefined) {
            delete existingRow.settings[String(id)];
            await supabase.from('user_settings').upsert({
              id: 'movie_ratings',
              user_id: userId,
              settings: existingRow.settings,
              updated_at: new Date().toISOString()
            });
          }
        }
      } catch (e) {
        console.error('Supabase movie move exception:', e.message);
      }
    }

    if (idx !== -1) {
      return res.json(db.movies[idx]);
    }
    res.json({ success: true, id, section, position });
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
    
    if (Array.isArray(ids)) {
      ids.forEach((id, position) => {
        const idx = (db.movies || []).findIndex(m => String(m.id) === String(id) && (m.user_id || DEFAULT_USER_ID) === userId);
        if (idx !== -1) db.movies[idx].position = position;
      });
      await writeDB(db);

      const supabase = getSupabase();
      if (supabase) {
        try {
          for (let pos = 0; pos < ids.length; pos++) {
            await supabase.from('movies').update({ position: pos }).eq('id', ids[pos]);
          }
        } catch (e) {}
      }
    }
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function autoMigrateFuturedMovies(db) {
  // Disabled force auto-migration so user manual section moves are 100% respected and never reverted!
  return 0;
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

    // Respond IMMEDIATELY (< 10ms) to guarantee 0% risk of tunnel or gateway 502 timeouts
    res.json({
      success: true,
      updated: 0,
      message: "Filmlar ma'lumotlarini yangilash fonda boshlandi...",
      started: true
    });

    // Run full refresh batch asynchronously in background worker
    setImmediate(async () => {
      console.log(`[REFRESH-ALL BACKGROUND WORKER] Started for userId: ${userId}`);
      let updatedCount = 0;
      const movies = (db.movies || []).filter(m => (m.user_id || DEFAULT_USER_ID) === userId);

      const BATCH_SIZE = 25;
      for (let i = 0; i < movies.length; i += BATCH_SIZE) {
        const batch = movies.slice(i, i + BATCH_SIZE);
        await Promise.allSettled(batch.map(async (m) => {
          let changed = false;
          let isTv = m.media_type === 'tv';
          let isMovie = m.media_type === 'movie';

          // 1. Fetch TMDB details (SAFE: only updates release_date and runtime/seasons; NEVER touches poster_path, title, or tmdb_id)
          if (m.tmdb_id && tmdbKey) {
            try {
              let movieDetail = null;
              let tvDetail = null;

              if (isTv) {
                const res = await fetch(`https://api.themoviedb.org/3/tv/${encodeURIComponent(m.tmdb_id)}?api_key=${encodeURIComponent(tmdbKey)}`, { signal: AbortSignal.timeout(3500) });
                if (res.ok) tvDetail = await res.json();
              } else if (isMovie) {
                const res = await fetch(`https://api.themoviedb.org/3/movie/${encodeURIComponent(m.tmdb_id)}?api_key=${encodeURIComponent(tmdbKey)}`, { signal: AbortSignal.timeout(3500) });
                if (res.ok) movieDetail = await res.json();
              } else {
                // Unknown media_type: probe movie first then TV
                const res = await fetch(`https://api.themoviedb.org/3/movie/${encodeURIComponent(m.tmdb_id)}?api_key=${encodeURIComponent(tmdbKey)}`, { signal: AbortSignal.timeout(3500) });
                if (res.ok) {
                  movieDetail = await res.json();
                  m.media_type = 'movie';
                  isMovie = true;
                  changed = true;
                } else {
                  const tvRes = await fetch(`https://api.themoviedb.org/3/tv/${encodeURIComponent(m.tmdb_id)}?api_key=${encodeURIComponent(tmdbKey)}`, { signal: AbortSignal.timeout(3500) });
                  if (tvRes.ok) {
                    tvDetail = await tvRes.json();
                    m.media_type = 'tv';
                    isTv = true;
                    changed = true;
                  }
                }
              }

              if (movieDetail) {
                if (movieDetail.release_date && !m.release_date) {
                  m.release_date = movieDetail.release_date;
                  changed = true;
                }
                const newRuntime = movieDetail.runtime ? `${movieDetail.runtime} min` : '-';
                if (m.seasons !== newRuntime && newRuntime !== '-') {
                  m.seasons = newRuntime;
                  changed = true;
                }
              } else if (tvDetail) {
                if (tvDetail.first_air_date && !m.release_date) {
                  m.release_date = tvDetail.first_air_date;
                  changed = true;
                }
                const newSeasons = await resolveTvRuntime(m.tmdb_id, tmdbKey, tvDetail);
                if (newSeasons && m.seasons !== newSeasons) {
                  m.seasons = newSeasons;
                  changed = true;
                }
              }
            } catch (e) {}
          }

          // 2. Fetch Ratings & Metadata from IMDb/OMDb (SAFE: only updates rating, vote_count, genre, director, release_year, overview, imdb_id; NEVER touches poster_path, title, or tmdb_id)
          if (omdbKey && (m.imdb_id || m.title)) {
            try {
              const omdbQuery = m.imdb_id
                ? `i=${encodeURIComponent(m.imdb_id)}`
                : `t=${encodeURIComponent(m.title)}` + (isTv ? '&type=series' : '');
              const omdbUrl = `http://www.omdbapi.com/?apikey=${encodeURIComponent(omdbKey)}&${omdbQuery}`;
              const omdbRes = await fetch(omdbUrl, { signal: AbortSignal.timeout(2500) });
              if (omdbRes.ok) {
                const omdbData = await omdbRes.json();
                if (omdbData.Response !== 'False') {
                  if (omdbData.imdbID && !m.imdb_id) { m.imdb_id = omdbData.imdbID; changed = true; }
                  if (omdbData.imdbRating && omdbData.imdbRating !== 'N/A') {
                    const newRating = parseFloat(omdbData.imdbRating);
                    if (m.rating !== newRating) { m.rating = newRating; changed = true; }
                  }
                  if (omdbData.imdbVotes && omdbData.imdbVotes !== 'N/A') {
                    const newVotes = parseInt(omdbData.imdbVotes.replace(/,/g, '').replace(/\./g, ''));
                    if (m.vote_count !== newVotes) { m.vote_count = newVotes; changed = true; }
                  }
                  if (omdbData.Genre && omdbData.Genre !== 'N/A' && (!m.genre || m.genre === '-')) { m.genre = omdbData.Genre; changed = true; }
                  if (omdbData.Director && omdbData.Director !== 'N/A' && (!m.director || m.director === '-')) { m.director = omdbData.Director; changed = true; }
                  if (omdbData.Year && omdbData.Year !== 'N/A' && (!m.release_year || m.release_year === '-')) { m.release_year = omdbData.Year; changed = true; }
                  if (omdbData.Plot && omdbData.Plot !== 'N/A' && (!m.overview || m.overview.length < omdbData.Plot.length)) { m.overview = omdbData.Plot; changed = true; }
                }
              }
            } catch (e) {}
          }

          if (changed) updatedCount++;
        }));
      }

      if (updatedCount > 0) writeDB(db);

      // 3. Auto re-sort ONLY the "Futured" column's cards by release_date ascending (soonest first)
      const freshDb = readDB();
      const futuredMovies = (freshDb.movies || []).filter(
        m => (m.user_id || DEFAULT_USER_ID) === userId && m.section === 'futured'
      );

      if (futuredMovies.length > 0) {
        futuredMovies.sort((a, b) => {
          const dateA = a.release_date || null;
          const dateB = b.release_date || null;

          if (!dateA && !dateB) return 0;
          if (!dateA) return 1; // null/missing release_date sorts to end
          if (!dateB) return -1;

          return dateA.localeCompare(dateB);
        });

        let positionChanged = false;
        futuredMovies.forEach((m, index) => {
          if (m.position !== index) {
            m.position = index;
            positionChanged = true;
          }
        });

        if (positionChanged) {
          writeDB(freshDb);
          console.log(`[REFRESH-ALL] Auto re-sorted ${futuredMovies.length} Futured movies by release_date ascending.`);

          const supabase = getSupabase();
          if (supabase) {
            try {
              for (const m of futuredMovies) {
                await supabase.from('movies').update({ position: m.position }).eq('id', m.id);
              }
            } catch (e) {
              console.error('[REFRESH-ALL] Error persisting sorted Futured positions to Supabase:', e.message);
            }
          }
        }
      }

      console.log(`[REFRESH-ALL BACKGROUND WORKER] Completed successfully for userId: ${userId}. Updated ${updatedCount} movie(s).`);
      generateRecommendations(userId).catch(err => {
        console.error('[REFRESH-ALL] Background recommendations error:', err.message);
      });
    });

  } catch (err) {
    console.error('[REFRESH-ALL] Global route error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
module.exports.autoMigrateFuturedMovies = autoMigrateFuturedMovies;
