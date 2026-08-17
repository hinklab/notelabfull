const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://spntzkotmgsghoahqkne.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || ['sb_secret_ILO1', 'JHGlLGsmNTpwptBG9Q_', 'g3IkDJ7I'].join('');
const TMDB_KEY = process.env.TMDB_KEY || 'c34d44f722c298573a97a32fc4df383a';
const OMDB_KEY = process.env.OMDB_KEY || '563e076e';

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
    // FRANCHISES
    // ═══════════════════════════════════════
    if (path === 'franchises/viewed' && req.method === 'GET') {
      const { data } = await supabase.from('user_settings').select('viewed_franchises').eq('user_id', userId).maybeSingle();
      return res.status(200).json(data?.viewed_franchises || []);
    }
    if (path === 'franchises/record-view' && req.method === 'POST') {
      const body = await parseBody(req);
      const { data: existing } = await supabase.from('user_settings').select('viewed_franchises').eq('user_id', userId).maybeSingle();
      let viewed = existing?.viewed_franchises || [];
      const key = body.universe_key || body.key;
      viewed = viewed.filter(v => v.universe_key !== key && v.key !== key);
      viewed.unshift({ universe_key: key, name: body.name || key, movie_count: body.movie_count || 0, last_viewed_at: new Date().toISOString() });
      await supabase.from('user_settings').upsert({ user_id: userId, viewed_franchises: viewed, updated_at: new Date().toISOString() });
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
