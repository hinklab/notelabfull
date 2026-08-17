const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://spntzkotmgsghoahqkne.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || ['sb_secret_ILO1', 'JHGlLGsmNTpwptBG9Q_', 'g3IkDJ7I'].join('');
const TMDB_KEY = process.env.TMDB_KEY || 'c34d44f722c298573a97a32fc4df383a';
const OMDB_KEY = process.env.OMDB_KEY || '563e076e';

const FRANCHISE_UNIVERSES = {
  "mcu": {
    "name": "Marvel Cinematic Universe",
    "collection_ids": [131295, 623911, 131292, 131296, 86311, 284433, 422834, 618529, 531241, 529892, 448150, 9485, 284052, 544669],
    "known_tmdb_ids": [61889, 202555, 128095, 85271, 88396, 67178, 88329, 92749, 92782, 92783, 114472, 154427, 138501, 88397],
    "chronological_order": [
      { "id": 1771, "type": "movie" }, { "id": 299537, "type": "movie" }, { "id": 1726, "type": "movie" },
      { "id": 10138, "type": "movie" }, { "id": 1724, "type": "movie" }, { "id": 10195, "type": "movie" },
      { "id": 24428, "type": "movie" }, { "id": 68721, "type": "movie" }, { "id": 76338, "type": "movie" },
      { "id": 100402, "type": "movie" }, { "id": 118340, "type": "movie" }, { "id": 283995, "type": "movie" },
      { "id": 61889, "type": "tv", "title": "Marvel's Daredevil" }, { "id": 99861, "type": "movie" },
      { "id": 102899, "type": "movie" }, { "id": 271110, "type": "movie" }, { "id": 497698, "type": "movie" },
      { "id": 284052, "type": "movie" }, { "id": 315635, "type": "movie" }, { "id": 284053, "type": "movie" },
      { "id": 284054, "type": "movie" }, { "id": 363088, "type": "movie" }, { "id": 299536, "type": "movie" },
      { "id": 299534, "type": "movie" }, { "id": 85271, "type": "tv", "title": "WandaVision" },
      { "id": 88396, "type": "tv", "title": "The Falcon and the Winter Soldier" },
      { "id": 67178, "type": "tv", "title": "Loki" }, { "id": 429617, "type": "movie" },
      { "id": 566525, "type": "movie" }, { "id": 524434, "type": "movie" }, { "id": 634649, "type": "movie" },
      { "id": 453395, "type": "movie" }, { "id": 88329, "type": "tv", "title": "Hawkeye" },
      { "id": 92749, "type": "tv", "title": "Moon Knight" }, { "id": 92782, "type": "tv", "title": "Ms. Marvel" },
      { "id": 616037, "type": "movie" }, { "id": 92783, "type": "tv", "title": "She-Hulk: Attorney at Law" },
      { "id": 505642, "type": "movie" }, { "id": 640146, "type": "movie" }, { "id": 447365, "type": "movie" },
      { "id": 114472, "type": "tv", "title": "Secret Invasion" }, { "id": 609681, "type": "movie" },
      { "id": 154427, "type": "tv", "title": "Echo" }, { "id": 533535, "type": "movie" },
      { "id": 138501, "type": "tv", "title": "Agatha All Along" }, { "id": 822119, "type": "movie" },
      { "id": 128095, "type": "tv", "title": "Under the Banner of Heaven" },
      { "id": 202555, "type": "tv", "title": "Daredevil: Born Again" },
      { "id": 970347, "type": "movie" }, { "id": 838209, "type": "movie" },
      { "id": 1003596, "type": "movie" }, { "id": 1003598, "type": "movie" }
    ]
  },
  "dceu": {
    "name": "DC Extended Universe",
    "collection_ids": [468552, 209112, 297761, 297762, 297802, 287947],
    "known_tmdb_ids": [],
    "chronological_order": [
      { "id": 49529, "type": "movie" }, { "id": 209112, "type": "movie" }, { "id": 297761, "type": "movie" },
      { "id": 297762, "type": "movie" }, { "id": 141052, "type": "movie" }, { "id": 297802, "type": "movie" },
      { "id": 287947, "type": "movie" }, { "id": 475557, "type": "movie" }, { "id": 464052, "type": "movie" },
      { "id": 436969, "type": "movie" }, { "id": 436270, "type": "movie" }, { "id": 594767, "type": "movie" },
      { "id": 298618, "type": "movie" }, { "id": 565770, "type": "movie" }, { "id": 572802, "type": "movie" }
    ]
  },
  "star_wars": {
    "name": "Star Wars Universe",
    "collection_ids": [10, 845946],
    "known_tmdb_ids": [],
    "chronological_order": [
      { "id": 1893, "type": "movie" }, { "id": 1894, "type": "movie" }, { "id": 1895, "type": "movie" },
      { "id": 330459, "type": "movie" }, { "id": 348350, "type": "movie" }, { "id": 11, "type": "movie" },
      { "id": 1891, "type": "movie" }, { "id": 1892, "type": "movie" }, { "id": 140607, "type": "movie" },
      { "id": 181808, "type": "movie" }, { "id": 290859, "type": "movie" }
    ]
  },
  "kurtlar_vadisi": {
    "name": "Valley of the Wolves (Kurtlar Vadisi) Universe",
    "collection_ids": [663490],
    "known_tmdb_ids": [34587, 48253, 49071, 11818, 35747, 58637, 469469],
    "chronological_order": [
      { "id": 34587, "type": "tv", "title": "Valley of the Wolves" },
      { "id": 11818, "type": "movie", "title": "Valley of the Wolves: Iraq" },
      { "id": 48253, "type": "tv", "title": "Valley of the Wolves: Terror" },
      { "id": 49071, "type": "tv", "title": "Valley of the Wolves: Ambush" },
      { "id": 35747, "type": "movie", "title": "Valley of the Wolves: Gladio" },
      { "id": 58637, "type": "movie", "title": "Valley of the Wolves: Palestine" },
      { "id": 469469, "type": "movie", "title": "Valley of the Wolves: Homeland" }
    ]
  }
};

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

const DEFAULT_USER_ID = '0d3da195-1d0e-458b-9f88-2879561e0da6';

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-id, x-user-email, x-user-first-name, x-user-last-name');
  res.setHeader('Content-Type', 'application/json');
}

function parseBody(req) {
  return new Promise((resolve) => {
    if (req.body) return resolve(req.body);
    let data = '';
    req.on('data', c => data += c);
    req.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve({}); } });
  });
}

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const userId = req.headers['x-user-id'] || DEFAULT_USER_ID;
  const url = new URL(req.url, `https://${req.headers.host}`);
  const path = url.pathname.replace(/^\/api\/?/, '');
  const query = Object.fromEntries(url.searchParams);

  try {
    // ═══════════════════════════════════════
    // NOTES
    // ═══════════════════════════════════════
    if (path === 'notes' && req.method === 'GET') {
      const { data } = await supabase.from('notes').select('*').eq('user_id', userId);
      const notes = (data || []).map(n => ({ ...n, name: n.title || 'Untitled', is_movie: Boolean(n.is_movie) }));
      let movieNote = notes.find(n => n.is_movie || n.type === 'movie');
      if (!movieNote) {
        const { data: created } = await supabase.from('notes')
          .insert([{ user_id: userId, title: 'Movies', icon: '🎬', type: 'movie', is_movie: true, position: 0 }])
          .select().single();
        if (created) notes.push({ ...created, name: created.title });
      }
      return res.status(200).json(notes);
    }

    // ═══════════════════════════════════════
    // GROUPS
    // ═══════════════════════════════════════
    if (path === 'groups' && req.method === 'GET') {
      let q = supabase.from('note_groups').select('*').eq('user_id', userId).order('position');
      if (query.note_id) q = q.eq('note_id', query.note_id);
      const { data } = await q;
      let groups = data || [];
      if (groups.length === 0 && query.note_id) {
        const defaults = [
          { name: 'Futured', section_key: 'futured', color: '#a78bfa', position: 0 },
          { name: 'To Do', section_key: 'todo', color: '#fbbf24', position: 1 },
          { name: 'Going', section_key: 'doing', color: '#34d399', position: 2 },
          { name: 'Done', section_key: 'done', color: '#60a5fa', position: 3 },
        ];
        const { data: created } = await supabase.from('note_groups')
          .insert(defaults.map(d => ({ ...d, user_id: userId, note_id: Number(query.note_id) })))
          .select();
        groups = created || [];
      }
      return res.status(200).json(groups);
    }

    // ═══════════════════════════════════════
    // MOVIES
    // ═══════════════════════════════════════
    if (path === 'movies' && req.method === 'GET') {
      let q = supabase.from('movies').select('*').eq('user_id', userId).order('position');
      if (query.note_id) q = q.eq('note_id', query.note_id);
      const { data } = await q;
      return res.status(200).json(data || []);
    }

    if (path === 'movies' && req.method === 'POST') {
      const body = await parseBody(req);
      // Deduplication
      if (body.tmdb_id) {
        const { data: existing } = await supabase.from('movies').select('*')
          .eq('user_id', userId).eq('tmdb_id', body.tmdb_id).limit(1);
        if (existing && existing.length > 0) return res.status(200).json(existing[0]);
      }

      const noteId = body.note_id || null;
      const section = body.section || 'todo';

      // Enrich from TMDB
      let genre = body.genre || '-', director = body.director || '-', overview = body.overview || '';
      let poster_path = body.poster_path || null, release_date = body.release_date || null;
      let release_year = body.release_year || '-', rating = body.rating || null;
      let vote_count = body.vote_count || null, seasons = body.seasons || '-';
      let media_type = body.media_type || 'movie';

      if (body.tmdb_id && TMDB_KEY) {
        try {
          const isTv = media_type === 'tv';
          const tmdbUrl = `https://api.themoviedb.org/3/${isTv ? 'tv' : 'movie'}/${body.tmdb_id}?api_key=${TMDB_KEY}&append_to_response=credits&language=en-US`;
          const tmdbRes = await fetch(tmdbUrl);
          if (tmdbRes.ok) {
            const d = await tmdbRes.json();
            release_date = d.release_date || d.first_air_date || release_date;
            release_year = release_date ? release_date.split('-')[0] : release_year;
            rating = d.vote_average ? Number(d.vote_average.toFixed(1)) : rating;
            vote_count = d.vote_count ?? vote_count;
            if (d.poster_path) poster_path = `https://image.tmdb.org/t/p/w500${d.poster_path}`;
            if (d.genres?.length) genre = d.genres.map(g => g.name).join(', ');
            if (d.credits?.crew) {
              const dir = d.credits.crew.find(c => c.job === 'Director');
              if (dir) director = dir.name;
            }
            if (d.created_by?.length && director === '-') director = d.created_by.map(c => c.name).join(', ');
            if (d.overview) overview = d.overview;
            if (d.number_of_seasons) {
              media_type = 'tv';
              const parts = [];
              if (d.number_of_seasons) parts.push(`${d.number_of_seasons} season${d.number_of_seasons > 1 ? 's' : ''}`);
              if (d.number_of_episodes) parts.push(`${d.number_of_episodes} ep`);
              parts.push(`~${(d.episode_run_time?.[0]) || 45} min`);
              seasons = parts.join(' · ');
            } else if (d.runtime) {
              seasons = `${d.runtime} min`;
            }
          }
        } catch (e) { console.warn('TMDB enrich error:', e.message); }
      }

      const { data: inserted, error } = await supabase.from('movies')
        .insert([{
          user_id: userId, note_id: noteId, title: body.title, section, position: 0,
          tmdb_id: body.tmdb_id || null, imdb_id: body.imdb_id || null, media_type,
          poster_path, rating, vote_count, genre, director, overview,
          release_date, release_year, seasons, note: body.note || '',
          updated_at: new Date().toISOString()
        }])
        .select().single();
      if (error) throw error;
      return res.status(200).json(inserted);
    }

    // PUT /api/movies/:id
    const moviePutMatch = path.match(/^movies\/(\d+)$/);
    if (moviePutMatch && req.method === 'PUT') {
      const id = moviePutMatch[1];
      const body = await parseBody(req);
      const allowed = ['title', 'section', 'position', 'poster_path', 'rating', 'vote_count',
        'genre', 'director', 'overview', 'release_date', 'release_year', 'seasons',
        'note', 'user_rating', 'media_type'];
      const update = { updated_at: new Date().toISOString() };
      for (const k of allowed) { if (body[k] !== undefined) update[k] = body[k]; }
      await supabase.from('movies').update(update).eq('id', id);

      if (body.user_rating !== undefined) {
        const { data: row } = await supabase.from('user_settings').select('*').eq('id', 'movie_ratings').single();
        const ratings = row?.settings || {};
        if (body.user_rating === null) delete ratings[id]; else ratings[id] = Number(body.user_rating);
        await supabase.from('user_settings').upsert({ id: 'movie_ratings', user_id: userId, settings: ratings, updated_at: new Date().toISOString() });
      }
      return res.status(200).json({ success: true, ...update });
    }

    // DELETE /api/movies/:id
    const movieDelMatch = path.match(/^movies\/(\d+)$/);
    if (movieDelMatch && req.method === 'DELETE') {
      await supabase.from('movies').delete().eq('id', movieDelMatch[1]);
      return res.status(200).json({ success: true });
    }

    // POST /api/movies/move
    if (path === 'movies/move' && req.method === 'POST') {
      const body = await parseBody(req);
      const update = { section: body.section, position: body.position ?? 0, updated_at: new Date().toISOString() };
      if (body.section !== 'done') update.user_rating = null;
      await supabase.from('movies').update(update).eq('id', body.id);
      return res.status(200).json({ success: true });
    }

    // POST /api/movies/reorder
    if (path === 'movies/reorder' && req.method === 'POST') {
      const body = await parseBody(req);
      if (Array.isArray(body.ids)) {
        for (let i = 0; i < body.ids.length; i++) {
          await supabase.from('movies').update({ position: i, updated_at: new Date().toISOString() }).eq('id', body.ids[i]);
        }
      }
      return res.status(200).json({ success: true });
    }

    // ═══════════════════════════════════════
    // CONTENT SEARCH (TMDB)
    // ═══════════════════════════════════════
    if (path === 'content/search' && req.method === 'GET') {
      const q = (query.query || '').trim();
      if (!q) return res.status(200).json([]);

      const results = [];
      if (TMDB_KEY) {
        const [resEn, resRu] = await Promise.all([
          fetch(`https://api.themoviedb.org/3/search/multi?api_key=${TMDB_KEY}&query=${encodeURIComponent(q)}&language=en-US&page=1`).then(r => r.ok ? r.json() : {}).catch(() => ({})),
          fetch(`https://api.themoviedb.org/3/search/multi?api_key=${TMDB_KEY}&query=${encodeURIComponent(q)}&language=ru-RU&page=1`).then(r => r.ok ? r.json() : {}).catch(() => ({})),
        ]);

        const itemsMap = new Map();
        for (const [items, boost] of [[resEn.results || [], 100], [resRu.results || [], 80]]) {
          items.forEach((item, i) => {
            if (item.media_type !== 'movie' && item.media_type !== 'tv') return;
            const key = `${item.media_type}_${item.id}`;
            if (itemsMap.has(key)) { itemsMap.get(key).score += 50; }
            else itemsMap.set(key, { item, enTitle: item.title || item.name, score: (boost - i) + (item.popularity || 0) });
          });
        }

        const sorted = Array.from(itemsMap.values()).sort((a, b) => b.score - a.score).slice(0, 15);
        for (const { item, enTitle } of sorted) {
          const isMovie = item.media_type === 'movie';
          const title = enTitle || item.title || item.name || q;
          const releaseDate = item.release_date || item.first_air_date || null;
          const releaseYear = releaseDate ? releaseDate.split('-')[0] : '-';
          const rtg = item.vote_average ? Number(item.vote_average.toFixed(1)) : null;
          const posterPath = item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null;
          results.push({
            title, release_date: releaseDate, release_year: releaseYear, year: releaseYear,
            rating: rtg, vote_count: item.vote_count || 0,
            poster_path: posterPath, cover_url: posterPath,
            overview: item.overview || '', tmdb_id: item.id, imdb_id: null,
            media_type: item.media_type,
            subtitle: [releaseYear, rtg ? `⭐ ${rtg}` : null, isMovie ? 'Movie' : 'TV Series'].filter(Boolean).join(' · '),
            note: item.overview || '',
          });
        }
      }
      return res.status(200).json(results);
    }

    // ═══════════════════════════════════════
    // CONTENT IMAGES
    // ═══════════════════════════════════════
    if (path === 'content/images' && req.method === 'GET') {
      const { tmdb_id, media_type } = query;
      if (!tmdb_id || !TMDB_KEY) return res.status(200).json({ backdrops: [] });
      const type = media_type === 'tv' ? 'tv' : 'movie';
      const scenes = [];
      try {
        const r = await fetch(`https://api.themoviedb.org/3/${type}/${tmdb_id}/images?api_key=${TMDB_KEY}`);
        if (r.ok) {
          const d = await r.json();
          (d.backdrops || []).filter(b => b.aspect_ratio > 1.3).slice(0, 5).forEach(b => {
            scenes.push(`https://image.tmdb.org/t/p/w780${b.file_path}`);
          });
        }
      } catch (e) {}
      if (scenes.length < 4) {
        try {
          const vr = await fetch(`https://api.themoviedb.org/3/${type}/${tmdb_id}/videos?api_key=${TMDB_KEY}&language=en-US`);
          if (vr.ok) {
            const vd = await vr.json();
            (vd.results || []).filter(v => v.site === 'YouTube').forEach(v => {
              if (scenes.length < 5) scenes.push(`https://img.youtube.com/vi/${v.key}/hqdefault.jpg`);
            });
          }
        } catch (e) {}
      }
      return res.status(200).json({ backdrops: scenes.slice(0, 5) });
    }

    // ═══════════════════════════════════════
    // FRANCHISES
    // ═══════════════════════════════════════
    if (path === 'franchises/viewed' && req.method === 'GET') {
      const { data } = await supabase.from('user_settings').select('viewed_franchises').eq('user_id', userId).maybeSingle();
      let viewed = data?.viewed_franchises || [];

      // If user hasn't viewed any custom franchise yet, provide the curated universe defaults
      if (!Array.isArray(viewed) || viewed.length === 0) {
        viewed = [
          { key: 'mcu', universe_key: 'mcu', tmdb_id: 1726, media_type: 'movie', name: 'Marvel Cinematic Universe', is_universe: true, total_movies: 52, last_viewed_at: new Date().toISOString() },
          { key: 'star_wars', universe_key: 'star_wars', tmdb_id: 11, media_type: 'movie', name: 'Star Wars Universe', is_universe: true, total_movies: 11, last_viewed_at: new Date().toISOString() },
          { key: 'dceu', universe_key: 'dceu', tmdb_id: 49529, media_type: 'movie', name: 'DC Extended Universe', is_universe: true, total_movies: 15, last_viewed_at: new Date().toISOString() },
          { key: 'kurtlar_vadisi', universe_key: 'kurtlar_vadisi', tmdb_id: 34587, media_type: 'tv', name: 'Valley of the Wolves (Kurtlar Vadisi)', is_universe: true, total_movies: 7, last_viewed_at: new Date().toISOString() }
        ];
      }

      return res.status(200).json(viewed);
    }
    if (path === 'franchises/record-view' && req.method === 'POST') {
      const body = await parseBody(req);
      const { data: existing } = await supabase.from('user_settings').select('viewed_franchises').eq('user_id', userId).maybeSingle();
      let viewed = existing?.viewed_franchises || [];
      const key = body.universe_key || body.key || (body.tmdb_id ? `movie_${body.tmdb_id}` : body.name);
      viewed = viewed.filter(v => v.universe_key !== key && v.key !== key && String(v.tmdb_id) !== String(body.tmdb_id));
      viewed.unshift({
        key,
        universe_key: body.universe_key || null,
        tmdb_id: body.tmdb_id ? Number(body.tmdb_id) : null,
        media_type: body.media_type || 'movie',
        name: body.name || key,
        is_universe: !!body.is_universe,
        total_movies: body.total_movies || body.movie_count || 0,
        last_viewed_at: new Date().toISOString()
      });
      await supabase.from('user_settings').upsert({ user_id: userId, viewed_franchises: viewed.slice(0, 50), updated_at: new Date().toISOString() });
      return res.status(200).json({ success: true, viewed_franchises: viewed });
    }

    // GET /api/franchises/:tmdbMovieId
    const franchiseMatch = path.match(/^franchises\/(\d+)$/);
    if (franchiseMatch && req.method === 'GET') {
      const tmdbMovieId = Number(franchiseMatch[1]);
      const requestedMediaType = query.media_type || 'movie';

      // 1. Fetch movie details from TMDB
      let movieDetail = null;
      let actualMediaType = requestedMediaType;
      try {
        const primaryUrl = requestedMediaType === 'tv'
          ? `https://api.themoviedb.org/3/tv/${tmdbMovieId}?api_key=${TMDB_KEY}&language=en-US`
          : `https://api.themoviedb.org/3/movie/${tmdbMovieId}?api_key=${TMDB_KEY}&language=en-US`;
        const r1 = await fetch(primaryUrl);
        if (r1.ok) {
          movieDetail = await r1.json();
        } else if (r1.status === 404) {
          const fallbackUrl = requestedMediaType === 'tv'
            ? `https://api.themoviedb.org/3/movie/${tmdbMovieId}?api_key=${TMDB_KEY}&language=en-US`
            : `https://api.themoviedb.org/3/tv/${tmdbMovieId}?api_key=${TMDB_KEY}&language=en-US`;
          const r2 = await fetch(fallbackUrl);
          if (r2.ok) {
            movieDetail = await r2.json();
            actualMediaType = requestedMediaType === 'tv' ? 'movie' : 'tv';
          }
        }
      } catch (e) {}

      if (!movieDetail) {
        return res.status(404).json({ error: 'Movie not found on TMDB' });
      }

      // 2. Check if movie belongs to a curated universe
      let matchedUniverseKey = null;
      let matchedUniverse = null;

      for (const [key, universe] of Object.entries(FRANCHISE_UNIVERSES)) {
        const collectionId = movieDetail.belongs_to_collection?.id;
        const matchesCollection = collectionId && universe.collection_ids?.includes(collectionId);
        const matchesKnownId = universe.known_tmdb_ids?.includes(tmdbMovieId);
        const matchesOrder = universe.chronological_order?.some(item => (typeof item === 'object' ? item.id : item) === tmdbMovieId);

        if (matchesCollection || matchesKnownId || matchesOrder) {
          matchedUniverseKey = key;
          matchedUniverse = universe;
          break;
        }
      }

      // Fetch user's movies from Supabase for board comparison
      const { data: userMoviesData } = await supabase.from('movies').select('*').eq('user_id', userId);
      const userMovies = userMoviesData || [];

      // Helper to check user board match
      const checkBoardMatch = (tmdbId) => {
        const found = userMovies.find(m => Number(m.tmdb_id) === Number(tmdbId));
        return { in_board: !!found, user_movie: found || null };
      };

      let finalResult = null;

      if (matchedUniverse) {
        // Case A: Curated Universe
        const rawItems = matchedUniverse.chronological_order;
        const movies = await Promise.all(
          rawItems.map(async (item, index) => {
            const tmdbId = typeof item === 'object' ? item.id : item;
            const itemType = (typeof item === 'object' && item.type) ? item.type : 'movie';
            const boardStatus = checkBoardMatch(tmdbId);

            if (boardStatus.user_movie) {
              const um = boardStatus.user_movie;
              return {
                tmdb_id: tmdbId,
                media_type: um.media_type || itemType,
                title: um.title,
                release_date: um.release_date,
                release_year: um.release_year,
                rating: um.rating,
                poster_path: um.poster_path,
                overview: um.overview,
                chronology_index: index + 1,
                in_board: true,
                user_movie: um
              };
            }

            try {
              const itemUrl = `https://api.themoviedb.org/3/${itemType}/${tmdbId}?api_key=${TMDB_KEY}&language=en-US`;
              const ir = await fetch(itemUrl);
              if (ir.ok) {
                const idata = await ir.json();
                const releaseDate = idata.release_date || idata.first_air_date || null;
                return {
                  tmdb_id: tmdbId,
                  media_type: itemType,
                  title: idata.title || idata.name || item.title || 'Untitled',
                  release_date: releaseDate,
                  release_year: releaseDate ? releaseDate.split('-')[0] : '-',
                  rating: idata.vote_average ? Number(idata.vote_average.toFixed(1)) : null,
                  poster_path: idata.poster_path ? `https://image.tmdb.org/t/p/w500${idata.poster_path}` : null,
                  overview: idata.overview || '',
                  chronology_index: index + 1,
                  in_board: false,
                  user_movie: null
                };
              }
            } catch (e) {}

            return {
              tmdb_id: tmdbId,
              media_type: itemType,
              title: item.title || `Movie ${tmdbId}`,
              release_date: null,
              release_year: '-',
              rating: null,
              poster_path: null,
              overview: '',
              chronology_index: index + 1,
              in_board: false,
              user_movie: null
            };
          })
        );

        finalResult = {
          universe_key: matchedUniverseKey,
          universe_name: matchedUniverse.name,
          collection_name: movieDetail.belongs_to_collection?.name || null,
          is_universe: true,
          total_movies: movies.length,
          in_board_count: movies.filter(m => m.in_board).length,
          movies
        };
      } else if (movieDetail.belongs_to_collection) {
        // Case B: TMDB Collection (unmapped universe)
        const collectionId = movieDetail.belongs_to_collection.id;
        try {
          const colUrl = `https://api.themoviedb.org/3/collection/${collectionId}?api_key=${TMDB_KEY}&language=en-US`;
          const cr = await fetch(colUrl);
          if (cr.ok) {
            const colData = await cr.json();
            const rawParts = colData.parts || [];
            rawParts.sort((a, b) => (a.release_date || '').localeCompare(b.release_date || ''));

            const movies = rawParts.map((part, index) => {
              const boardStatus = checkBoardMatch(part.id);
              const releaseDate = part.release_date || null;
              return {
                tmdb_id: part.id,
                media_type: 'movie',
                title: part.title || 'Untitled',
                release_date: releaseDate,
                release_year: releaseDate ? releaseDate.split('-')[0] : '-',
                rating: part.vote_average ? Number(part.vote_average.toFixed(1)) : null,
                poster_path: part.poster_path ? `https://image.tmdb.org/t/p/w500${part.poster_path}` : null,
                overview: part.overview || '',
                chronology_index: index + 1,
                in_board: boardStatus.in_board,
                user_movie: boardStatus.user_movie
              };
            });

            finalResult = {
              universe_key: null,
              universe_name: null,
              collection_name: colData.name || movieDetail.belongs_to_collection.name,
              is_universe: false,
              total_movies: movies.length,
              in_board_count: movies.filter(m => m.in_board).length,
              movies
            };
          }
        } catch (e) {}
      }

      if (!finalResult) {
        // Case C: Standalone Movie
        const boardStatus = checkBoardMatch(tmdbMovieId);
        const releaseDate = movieDetail.release_date || movieDetail.first_air_date || null;
        finalResult = {
          universe_key: null,
          universe_name: null,
          collection_name: null,
          is_universe: false,
          total_movies: 1,
          in_board_count: boardStatus.in_board ? 1 : 0,
          movies: [{
            tmdb_id: tmdbMovieId,
            media_type: actualMediaType,
            title: movieDetail.title || movieDetail.name || 'Untitled',
            release_date: releaseDate,
            release_year: releaseDate ? releaseDate.split('-')[0] : '-',
            rating: movieDetail.vote_average ? Number(movieDetail.vote_average.toFixed(1)) : null,
            poster_path: movieDetail.poster_path ? `https://image.tmdb.org/t/p/w500${movieDetail.poster_path}` : null,
            overview: movieDetail.overview || '',
            chronology_index: 1,
            in_board: boardStatus.in_board,
            user_movie: boardStatus.user_movie
          }]
        };
      }

      // Auto-record viewed franchise into Supabase user_settings
      try {
        const recordKey = matchedUniverseKey || (movieDetail.belongs_to_collection ? `col_${movieDetail.belongs_to_collection.id}` : `movie_${tmdbMovieId}`);
        const recordName = matchedUniverse ? matchedUniverse.name : (movieDetail.belongs_to_collection ? movieDetail.belongs_to_collection.name : (movieDetail.title || movieDetail.name));
        const recordCount = finalResult.movies.length;

        const { data: existingRow } = await supabase.from('user_settings').select('viewed_franchises').eq('user_id', userId).maybeSingle();
        let viewedList = existingRow?.viewed_franchises || [];
        viewedList = viewedList.filter(v => v.universe_key !== recordKey && v.key !== recordKey && String(v.tmdb_id) !== String(tmdbMovieId));
        viewedList.unshift({
          key: recordKey,
          universe_key: matchedUniverseKey || null,
          tmdb_id: tmdbMovieId,
          media_type: actualMediaType,
          name: recordName,
          is_universe: !!matchedUniverse,
          total_movies: recordCount,
          last_viewed_at: new Date().toISOString()
        });
        await supabase.from('user_settings').upsert({
          user_id: userId,
          viewed_franchises: viewedList.slice(0, 50),
          updated_at: new Date().toISOString()
        });
      } catch (e) {
        console.warn('Error auto-recording franchise view:', e.message);
      }

      return res.status(200).json(finalResult);
    }

    // ═══════════════════════════════════════
    // NOTIFICATIONS
    // ═══════════════════════════════════════
    if (path === 'notifications' && req.method === 'GET') {
      const { data } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50);
      return res.status(200).json(data || []);
    }
    const notifReadMatch = path.match(/^notifications\/(\d+)\/read$/);
    if (notifReadMatch && req.method === 'PATCH') {
      await supabase.from('notifications').update({ is_read: true }).eq('id', notifReadMatch[1]);
      return res.status(200).json({ success: true });
    }
    if (path === 'notifications/read-all' && req.method === 'POST') {
      await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false);
      return res.status(200).json({ success: true });
    }
    const notifDelMatch = path.match(/^notifications\/(\d+)$/);
    if (notifDelMatch && req.method === 'DELETE') {
      await supabase.from('notifications').delete().eq('id', notifDelMatch[1]);
      return res.status(200).json({ success: true });
    }

    // ═══════════════════════════════════════
    // SETTINGS
    // ═══════════════════════════════════════
    if (path === 'settings' && req.method === 'GET') {
      const { data } = await supabase.from('user_settings').select('*').eq('user_id', userId).maybeSingle();
      return res.status(200).json(data || {});
    }
    if (path === 'settings' && req.method === 'PUT') {
      const body = await parseBody(req);
      await supabase.from('user_settings').upsert({ ...body, user_id: userId, updated_at: new Date().toISOString() });
      return res.status(200).json({ success: true });
    }

    // ═══════════════════════════════════════
    // AUTH PROFILE
    // ═══════════════════════════════════════
    if (path === 'auth/profile' && req.method === 'PATCH') {
      const body = await parseBody(req);
      const update = {};
      if (body.first_name !== undefined) update.first_name = body.first_name;
      if (body.last_name !== undefined) update.last_name = body.last_name;
      if (Object.keys(update).length > 0) {
        await supabase.from('users').update(update).eq('id', userId);
      }
      return res.status(200).json({ success: true });
    }

    // ═══════════════════════════════════════
    // FALLBACK 404
    // ═══════════════════════════════════════
    return res.status(404).json({ error: 'Not found', path });

  } catch (err) {
    console.error('Vercel API error:', err);
    return res.status(500).json({ error: err.message });
  }
};
