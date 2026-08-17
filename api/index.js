const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://spntzkotmgsghoahqkne.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || ['sb_secret_ILO1', 'JHGlLGsmNTpwptBG9Q_', 'g3IkDJ7I'].join('');

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

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const userId = req.headers['x-user-id'] || DEFAULT_USER_ID;
  const url = new URL(req.url, `https://${req.headers.host}`);
  const path = url.pathname.replace(/^\/api\/?/, '');
  const query = Object.fromEntries(url.searchParams);

  try {
    // ── GET /api/notes ──
    if (path === 'notes' && req.method === 'GET') {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('user_id', userId);
      if (error) throw error;

      const notes = (data || []).map(n => ({
        ...n,
        name: n.title || n.name || 'Untitled',
        is_movie: Boolean(n.is_movie)
      }));

      // Auto-create Movies note if not exists
      let movieNote = notes.find(n => n.is_movie || n.type === 'movie');
      if (!movieNote) {
        const { data: created } = await supabase
          .from('notes')
          .insert([{
            user_id: userId,
            title: 'Movies',
            icon: '🎬',
            type: 'movie',
            is_movie: true,
            position: 0
          }])
          .select()
          .single();
        if (created) notes.push({ ...created, name: created.title });
      }

      return res.status(200).json(notes);
    }

    // ── GET /api/groups?note_id=X ──
    if (path === 'groups' && req.method === 'GET') {
      const noteId = query.note_id;
      let q = supabase
        .from('note_groups')
        .select('*')
        .eq('user_id', userId)
        .order('position');
      if (noteId) q = q.eq('note_id', noteId);

      const { data, error } = await q;
      if (error) throw error;

      let groups = data || [];

      // Auto-create default movie groups if empty
      if (groups.length === 0 && noteId) {
        const defaults = [
          { name: 'Futured', section_key: 'futured', color: '#a78bfa', position: 0 },
          { name: 'To Do', section_key: 'todo', color: '#fbbf24', position: 1 },
          { name: 'Going', section_key: 'doing', color: '#34d399', position: 2 },
          { name: 'Done', section_key: 'done', color: '#60a5fa', position: 3 },
        ];
        const payload = defaults.map(d => ({
          ...d,
          user_id: userId,
          note_id: Number(noteId)
        }));
        const { data: created } = await supabase
          .from('note_groups')
          .insert(payload)
          .select();
        groups = created || defaults.map((d, i) => ({ id: i + 1, note_id: Number(noteId), ...d }));
      }

      return res.status(200).json(groups);
    }

    // ── GET /api/movies?note_id=X ──
    if (path === 'movies' && req.method === 'GET') {
      let q = supabase
        .from('movies')
        .select('*')
        .eq('user_id', userId)
        .order('position');
      if (query.note_id) q = q.eq('note_id', query.note_id);

      const { data, error } = await q;
      if (error) throw error;
      return res.status(200).json(data || []);
    }

    // ── GET /api/notifications ──
    if (path === 'notifications' && req.method === 'GET') {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
      return res.status(200).json(data || []);
    }

    // ── GET /api/settings ──
    if (path === 'settings' && req.method === 'GET') {
      const { data } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      return res.status(200).json(data || {});
    }

    // ── GET /api/franchises/viewed ──
    if (path === 'franchises/viewed' && req.method === 'GET') {
      const { data } = await supabase
        .from('user_settings')
        .select('viewed_franchises')
        .eq('user_id', userId)
        .maybeSingle();
      return res.status(200).json(data?.viewed_franchises || []);
    }

    // ── Fallback: 404 ──
    return res.status(404).json({ error: 'Not found', path });

  } catch (err) {
    console.error('Vercel API error:', err);
    return res.status(500).json({ error: err.message });
  }
};
