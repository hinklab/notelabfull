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

function parseOmdbDate(omdbReleasedStr) {
  if (!omdbReleasedStr || omdbReleasedStr === 'N/A') return null;
  const d = new Date(omdbReleasedStr);
  if (isNaN(d.getTime())) return null;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

    let cloudRatingsMap = {};
    if (supabase) {
      try {
        const { data: ratingRow } = await supabase.from('user_settings').select('settings').eq('id', 'movie_ratings').maybeSingle();
        if (ratingRow && ratingRow.settings) cloudRatingsMap = ratingRow.settings;
      } catch (e) {}
    }

    movies = movies.map(m => {
      const localMovie = (db.movies || []).find(lm => String(lm.id) === String(m.id));
      const localRating = localMovie ? localMovie.user_rating : null;
      const cloudRating = cloudRatingsMap[String(m.id)];
      const finalUserRating = cloudRating != null ? Number(cloudRating) : (m.user_rating != null ? Number(m.user_rating) : (localRating != null ? Number(localRating) : null));

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
    let existingMovie = db.movies.find(m =>
      (m.user_id || DEFAULT_USER_ID) === userId && (
        (data.tmdb_id && m.tmdb_id && String(m.tmdb_id) === String(data.tmdb_id)) ||
        (data.imdb_id && m.imdb_id && String(m.imdb_id) === String(data.imdb_id)) ||
        (data.title && m.title && m.title.toLowerCase().trim() === String(data.title).toLowerCase().trim())
      )
    );

    const supabase = getSupabase();
    if (!existingMovie && supabase) {
      try {
        if (data.tmdb_id) {
          const { data: byTmdb } = await supabase.from('movies').select('*').eq('user_id', userId).eq('tmdb_id', parseInt(data.tmdb_id)).maybeSingle();
          if (byTmdb) existingMovie = byTmdb;
        }
        if (!existingMovie && data.imdb_id) {
          const { data: byImdb } = await supabase.from('movies').select('*').eq('user_id', userId).eq('imdb_id', data.imdb_id).maybeSingle();
          if (byImdb) existingMovie = byImdb;
        }
        if (!existingMovie && data.title) {
          const { data: byTitle } = await supabase.from('movies').select('*').eq('user_id', userId).ilike('title', data.title.trim()).maybeSingle();
          if (byTitle) existingMovie = byTitle;
        }
      } catch (e) {}
    }

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
    let existingInSec = (db.movies || []).filter(m => (m.user_id || DEFAULT_USER_ID) === userId && m.section === section && (m.note_id ?? null) === note_id);
    
    if (supabase) {
      try {
        let sbQuery = supabase.from('movies').select('position').eq('user_id', userId).eq('section', section);
        if (note_id) sbQuery = sbQuery.eq('note_id', parseInt(note_id));
        const { data: sbSec } = await sbQuery;
        if (Array.isArray(sbSec) && sbSec.length > 0) {
          existingInSec = sbSec;
        }
      } catch (e) {}
    }

    if (existingInSec.length > 0) {
      const minPos = Math.min(...existingInSec.map(m => (typeof m.position === 'number' && !isNaN(m.position) ? m.position : 0)));
      position = minPos <= 0 ? minPos - 1 : -1;
    } else {
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
    let seasons = data.seasons || '-';

    const effectiveTmdbKey = tmdbKey || 'c34d44f722c298573a97a32fc4df383a';
    const effectiveOmdbKey = omdbKey || '563e076e';
    const needsTmdbEnrich = data.tmdb_id && effectiveTmdbKey && (!poster_path || genre === '-' || seasons === '-' || !seasons);
    if (needsTmdbEnrich) {
      try {
        let primaryUrl = isTv
          ? `https://api.themoviedb.org/3/tv/${encodeURIComponent(data.tmdb_id)}?api_key=${encodeURIComponent(effectiveTmdbKey)}&append_to_response=credits,external_ids&language=en-US`
          : `https://api.themoviedb.org/3/movie/${encodeURIComponent(data.tmdb_id)}?api_key=${encodeURIComponent(effectiveTmdbKey)}&append_to_response=credits,external_ids&language=en-US`;
        let fallbackUrl = isTv
          ? `https://api.themoviedb.org/3/movie/${encodeURIComponent(data.tmdb_id)}?api_key=${encodeURIComponent(effectiveTmdbKey)}&append_to_response=credits,external_ids&language=en-US`
          : `https://api.themoviedb.org/3/tv/${encodeURIComponent(data.tmdb_id)}?api_key=${encodeURIComponent(effectiveTmdbKey)}&append_to_response=credits,external_ids&language=en-US`;

        let tmdbRes = await fetch(primaryUrl, { signal: AbortSignal.timeout(3000) });
        if (!tmdbRes.ok && tmdbRes.status === 404) {
          tmdbRes = await fetch(fallbackUrl, { signal: AbortSignal.timeout(3000) });
        }
        if (tmdbRes.ok) {
          const detail = await tmdbRes.json();
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

          if (media_type === 'tv' || detail.number_of_seasons) {
            const rawSeasons = (detail.seasons || []).filter(s => s.season_number > 0);
            if (rawSeasons.length > 1 && !data.title.includes('— Season') && !data.title.includes('- Season')) {
              const seriesBaseName = detail.name || data.title;
              const seriesPoster = detail.poster_path ? `https://image.tmdb.org/t/p/w500${detail.poster_path}` : (poster_path || null);
              const defaultEpRuntime = (detail.episode_run_time && detail.episode_run_time[0]) || 45;
              const createdSeasons = [];

              for (let sIdx = 0; sIdx < rawSeasons.length; sIdx++) {
                const s = rawSeasons[sIdx];
                const sNum = s.season_number;
                let seasonPoster = s.poster_path ? `https://image.tmdb.org/t/p/w500${s.poster_path}` : seriesPoster;
                let seasonAirDate = s.air_date || detail.first_air_date || release_date;
                let seasonReleaseYear = seasonAirDate ? seasonAirDate.split('-')[0] : release_year;
                let epCount = s.episode_count || 1;
                let totalMinutes = 0;
                let exactCount = 0;

                try {
                  const sDetailRes = await fetch(`https://api.themoviedb.org/3/tv/${encodeURIComponent(data.tmdb_id)}/season/${sNum}?api_key=${encodeURIComponent(effectiveTmdbKey)}&language=en-US`, { signal: AbortSignal.timeout(2500) });
                  if (sDetailRes.ok) {
                    const sDetail = await sDetailRes.json();
                    if (sDetail.poster_path) seasonPoster = `https://image.tmdb.org/t/p/w500${sDetail.poster_path}`;
                    if (sDetail.air_date) {
                      seasonAirDate = sDetail.air_date;
                      seasonReleaseYear = seasonAirDate.split('-')[0];
                    }
                    if (Array.isArray(sDetail.episodes) && sDetail.episodes.length > 0) {
                      epCount = sDetail.episodes.length;
                      sDetail.episodes.forEach(ep => {
                        if (ep.runtime && ep.runtime > 0) {
                          totalMinutes += ep.runtime;
                          exactCount++;
                        }
                      });
                    }
                  }
                } catch (e) {}

                if (exactCount === 0) totalMinutes = epCount * defaultEpRuntime;
                const humanDuration = formatDurationUz(totalMinutes, exactCount === 0);
                const seasonStr = `Season ${sNum} · ${epCount} ep · ${humanDuration} (${totalMinutes} min)`;
                const seasonTitle = `${seriesBaseName} — Season ${sNum}`;

                let seasonComputedId = nextId(db.movies);
                if (supabase) {
                  try {
                    const { data: maxRow } = await supabase.from('movies').select('id').order('id', { ascending: false }).limit(1);
                    if (maxRow && maxRow.length > 0 && typeof maxRow[0].id === 'number') {
                      seasonComputedId = Math.max(seasonComputedId, maxRow[0].id + 1);
                    }
                  } catch (e) {}
                }

                const seasonMovie = {
                  id: seasonComputedId,
                  user_id: userId,
                  note_id,
                  title: seasonTitle,
                  section,
                  position: position + sIdx,
                  tmdb_id: data.tmdb_id ? Number(data.tmdb_id) : null,
                  imdb_id: data.imdb_id || null,
                  media_type: 'tv',
                  poster_path: seasonPoster,
                  rating: s.vote_average ? Number(s.vote_average.toFixed(1)) : (rating || null),
                  vote_count: s.vote_count || (vote_count || 0),
                  genre,
                  director,
                  overview: s.overview || detail.overview || overview || '',
                  release_date: seasonAirDate,
                  release_year: seasonReleaseYear,
                  seasons: seasonStr,
                  note: data.note || '',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                };

                db.movies.push(seasonMovie);
                if (supabase) {
                  try {
                    await supabase.from('movies').upsert([sanitizeForSupabase(seasonMovie)], { onConflict: 'id' });
                  } catch (e) {}
                }
                createdSeasons.push(seasonMovie);
              }

              await writeDB(db);
              deleteRecommendationForMovie(userId, createdSeasons[0]).catch(() => {});
              return res.json({ ...createdSeasons[0], _multiSeason: true, count: createdSeasons.length, seasons_list: createdSeasons });
            } else {
              const tvDuration = await resolveTvRuntime(data.tmdb_id, effectiveTmdbKey, detail);
              seasons = tvDuration || `${rawSeasons.length || 1} season`;
              if (!data.title.includes('— Season') && !data.title.includes('- Season')) {
                data.title = `${detail.name || data.title} — Season 1`;
              }
            }
          } else if (detail.runtime && detail.runtime > 0) {
            const humanDur = formatDurationUz(detail.runtime, false);
            seasons = `${humanDur} (${detail.runtime} min)`;
          } else {
            seasons = '-';
          }

          const tmdbImdbId = detail.external_ids?.imdb_id || detail.imdb_id || data.imdb_id || null;
          if (tmdbImdbId) {
            data.imdb_id = tmdbImdbId;
            try {
              const omdbUrl = `http://www.omdbapi.com/?apikey=${encodeURIComponent(effectiveOmdbKey)}&i=${encodeURIComponent(tmdbImdbId)}&plot=short`;
              const omdbRes = await fetch(omdbUrl, { signal: AbortSignal.timeout(2500) });
              if (omdbRes.ok) {
                const omdbDetail = await omdbRes.json();
                if (omdbDetail.Response === 'True') {
                  const omdbDate = parseOmdbDate(omdbDetail.Released);
                  if (omdbDate) {
                    release_date = omdbDate;
                    release_year = omdbDate.split('-')[0];
                  }
                  if (section !== 'futured') {
                    if (omdbDetail.imdbRating && omdbDetail.imdbRating !== 'N/A') {
                      rating = parseFloat(omdbDetail.imdbRating);
                    }
                    if (omdbDetail.imdbVotes && omdbDetail.imdbVotes !== 'N/A') {
                      vote_count = parseInt(omdbDetail.imdbVotes.replace(/,/g, '').replace(/\./g, ''));
                    }
                  }
                  if ((seasons === '-' || !seasons) && omdbDetail.Runtime && omdbDetail.Runtime !== 'N/A') {
                    const mins = parseInt(omdbDetail.Runtime, 10);
                    if (mins > 0) {
                      const humanDur = formatDurationUz(mins, false);
                      seasons = `${humanDur} (${mins} min)`;
                    }
                  }
                }
              }
            } catch (omdbErr) {
              console.warn('OMDb release date fetch error on Add:', omdbErr.message);
            }
          }

          if (section === 'futured') {
            rating = null;
            vote_count = null;
          }
        }
      } catch (err) {
        console.error('TMDB Enrich Error on Add:', err.message);
      }
    } else if (data.imdb_id && omdbKey && (!poster_path || genre === '-' || seasons === '-' || !seasons)) {
      try {
        const url = `http://www.omdbapi.com/?apikey=${encodeURIComponent(omdbKey)}&i=${encodeURIComponent(data.imdb_id)}`;
        const omdbFetchRes = await fetch(url);
        if (omdbFetchRes.ok) {
          const detail = await omdbFetchRes.json();
          if (detail.Response !== 'False') {
            if (detail.Genre && detail.Genre !== 'N/A') genre = detail.Genre;
            if (detail.Director && detail.Director !== 'N/A') director = detail.Director;
            if (detail.Plot && detail.Plot !== 'N/A') overview = detail.Plot;
            if (detail.Poster && detail.Poster !== 'N/A') poster_path = detail.Poster;
            if (detail.Year && detail.Year !== 'N/A') release_year = detail.Year;
            if (detail.imdbRating && detail.imdbRating !== 'N/A') rating = parseFloat(detail.imdbRating);
            if (detail.imdbVotes && detail.imdbVotes !== 'N/A') vote_count = parseInt(detail.imdbVotes.replace(/,/g, ''));
            if ((seasons === '-' || !seasons) && detail.Runtime && detail.Runtime !== 'N/A') {
              const mins = parseInt(detail.Runtime, 10);
              if (mins > 0) {
                const humanDur = formatDurationUz(mins, false);
                seasons = `${humanDur} (${mins} min)`;
              }
            }
          }
        }
      } catch (err) {
        console.error('OMDB Enrich Error on Add:', err.message);
      }
    }

    let computedId = nextId(db.movies);
    if (supabase) {
      try {
        const { data: maxRow } = await supabase.from('movies').select('id').order('id', { ascending: false }).limit(1);
        if (maxRow && maxRow.length > 0 && typeof maxRow[0].id === 'number') {
          computedId = Math.max(computedId, maxRow[0].id + 1);
        }
      } catch (e) {}
    }

    const movie = {
      id: computedId,
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
    const supabase = getSupabase();
    if (idx === -1 && supabase) {
      try {
        const parsedTargetId = (typeof targetId === 'string' && !isNaN(Number(targetId))) ? Number(targetId) : targetId;
        const { data: cloudMovie } = await supabase.from('movies').select('*').eq('id', parsedTargetId).maybeSingle();
        if (cloudMovie) {
          db.movies.push(cloudMovie);
          idx = db.movies.length - 1;
        }
      } catch (e) {
        console.warn('Could not sync cloud movie before update:', e.message);
      }
    }
    
    if (idx !== -1) {
      db.movies[idx] = { ...db.movies[idx], ...req.body };
      await writeDB(db);
    }
    if (supabase) {
      try {
        const updatePayload = sanitizeForSupabase({ ...req.body, updated_at: new Date().toISOString() });
        delete updatePayload.id;
        const parsedTargetId = (typeof targetId === 'string' && !isNaN(Number(targetId))) ? Number(targetId) : targetId;
        if (Object.keys(updatePayload).length > 0) {
          await supabase.from('movies').update(updatePayload).eq('id', parsedTargetId);
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
    const supabase = getSupabase();

    if (idx === -1 && supabase) {
      try {
        const parsedMovieId = (typeof id === 'string' && !isNaN(Number(id))) ? Number(id) : id;
        const { data: cloudMovie } = await supabase.from('movies').select('*').eq('id', parsedMovieId).maybeSingle();
        if (cloudMovie) {
          db.movies.push(cloudMovie);
          idx = db.movies.length - 1;
        }
      } catch (e) {
        console.warn('Could not sync cloud movie before move:', e.message);
      }
    }
    
    if (idx !== -1) {
      db.movies[idx].section = section;
      
      // Auto-enrich runtime if moving to a non-futured section and runtime is missing
      if (section !== 'futured' && (!db.movies[idx].seasons || db.movies[idx].seasons === '-' || db.movies[idx].seasons === '—') && db.movies[idx].tmdb_id) {
        try {
          const settings = getUserSettings(userId, db);
          const effectiveTmdbKey = settings.tmdb_key || 'c34d44f722c298573a97a32fc4df383a';
          const type = db.movies[idx].media_type === 'tv' ? 'tv' : 'movie';
          const tmdbRes = await fetch(`https://api.themoviedb.org/3/${type}/${encodeURIComponent(db.movies[idx].tmdb_id)}?api_key=${encodeURIComponent(effectiveTmdbKey)}&language=en-US`, { signal: AbortSignal.timeout(3000) });
          if (tmdbRes.ok) {
            const detail = await tmdbRes.json();
            if (detail.runtime && detail.runtime > 0) {
              const humanDur = formatDurationUz(detail.runtime, false);
              db.movies[idx].seasons = `${humanDur} (${detail.runtime} min)`;
            }
          }
        } catch (enrichErr) {
          console.warn('Auto-enrich runtime on move error:', enrichErr.message);
        }
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

    if (supabase) {
      try {
        const parsedMovieId = (typeof id === 'string' && !isNaN(Number(id))) ? Number(id) : id;
        const sbUpdate = {
          section,
          position: position ?? 0,
          updated_at: new Date().toISOString()
        };
        if (idx !== -1 && db.movies[idx].seasons && db.movies[idx].seasons !== '-' && db.movies[idx].seasons !== '—') {
          sbUpdate.seasons = db.movies[idx].seasons;
        }
        const { error: sbErr } = await supabase.from('movies').update(sbUpdate).eq('id', parsedMovieId);
        if (sbErr) console.error('Supabase movie move update error:', sbErr.message);
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
          const now = new Date().toISOString();
          const updates = ids.map((id, pos) => {
            const parsedId = (typeof id === 'string' && !isNaN(Number(id))) ? Number(id) : id;
            return supabase.from('movies').update({ position: pos, updated_at: now }).eq('id', parsedId);
          });
          await Promise.all(updates);
        } catch (e) {
          console.warn('Supabase movies reorder warning:', e.message);
        }
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
                  const omdbDate = parseOmdbDate(omdbData.Released);
                  if (omdbDate && m.release_date !== omdbDate) {
                    m.release_date = omdbDate;
                    m.release_year = omdbDate.split('-')[0];
                    changed = true;
                  }
                  if (m.section !== 'futured') {
                    if (omdbData.imdbRating && omdbData.imdbRating !== 'N/A') {
                      const newRating = parseFloat(omdbData.imdbRating);
                      if (m.rating !== newRating) { m.rating = newRating; changed = true; }
                    }
                    if (omdbData.imdbVotes && omdbData.imdbVotes !== 'N/A') {
                      const newVotes = parseInt(omdbData.imdbVotes.replace(/,/g, '').replace(/\./g, ''));
                      if (m.vote_count !== newVotes) { m.vote_count = newVotes; changed = true; }
                    }
                  } else {
                    if (m.rating !== null || m.vote_count !== null) {
                      m.rating = null;
                      m.vote_count = null;
                      changed = true;
                    }
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
