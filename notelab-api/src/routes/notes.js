const express = require('express');
const router = express.Router();
const { readDB, writeDB, normalizeNoteIcon } = require('../services/database');

const DEFAULT_USER_ID = '0d3da195-1d0e-458b-9f88-2879561e0da6';

function getSupabase() {
  try {
    return require('../services/supabase');
  } catch {
    return null;
  }
}

function sanitizeNoteForSupabase(n) {
  return {
    id: n.id,
    user_id: n.user_id || DEFAULT_USER_ID,
    title: n.name || n.title || 'Untitled',
    icon: typeof n.icon === 'string' ? n.icon : '📝',
    type: n.type || (n.is_movie ? 'movie' : 'kanban'),
    is_movie: Boolean(n.is_movie),
    position: n.position || 0,
    updated_at: new Date().toISOString()
  };
}

// GET /api/notes - with groups summary
router.get('/', async (req, res) => {
  try {
    const db = readDB();
    const userId = req.userId || DEFAULT_USER_ID;

    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data: cloudNotes } = await supabase.from('notes').select('*').eq('user_id', userId).order('position');
        if (cloudNotes && cloudNotes.length > 0) {
          if (!db.notes) db.notes = [];
          for (const cn of cloudNotes) {
            const idx = db.notes.findIndex(n => String(n.id) === String(cn.id));
            const noteObj = {
              id: cn.id,
              user_id: cn.user_id,
              name: cn.title || 'Movies',
              title: cn.title || 'Movies',
              icon: cn.icon || '🎬',
              type: cn.type || 'movie',
              is_movie: Boolean(cn.is_movie),
              position: cn.position || 0,
              created_at: cn.created_at,
              updated_at: cn.updated_at
            };
            if (idx >= 0) db.notes[idx] = { ...db.notes[idx], ...noteObj };
            else db.notes.push(noteObj);
          }
          await writeDB(db);
        }
      } catch (e) {}
    }

    let notes = (db.notes || []).filter(n => (n.user_id || DEFAULT_USER_ID) === userId);
    let groups = (db.note_groups || []).filter(g => (g.user_id || DEFAULT_USER_ID) === userId);
    let items = (db.note_items || []).filter(i => (i.user_id || DEFAULT_USER_ID) === userId);
    let movies = (db.movies || []).filter(m => (m.user_id || DEFAULT_USER_ID) === userId);
    
    // Auto-create or deduplicate Movies note for user
    let movieNotes = notes.filter(n => n.is_movie || n.type === 'movie' || (n.name || n.title || '').toLowerCase() === 'movies');
    let movieNote = null;
    let dbChanged = false;

    if (movieNotes.length > 1) {
      let primary = movieNotes[0];
      try {
        let userMovies = movies;
        if (supabase) {
          const { data: cloudMovies } = await supabase.from('movies').select('note_id').eq('user_id', userId);
          if (Array.isArray(cloudMovies) && cloudMovies.length > 0) userMovies = cloudMovies;
        }
        if (userMovies && userMovies.length > 0) {
          const noteIdsWithMovies = new Set(userMovies.map(m => Number(m.note_id)).filter(Boolean));
          const noteWithMovies = movieNotes.find(n => noteIdsWithMovies.has(Number(n.id)));
          if (noteWithMovies) primary = noteWithMovies;
        }
      } catch (e) {}

      notes = notes.filter(n => !movieNotes.includes(n) || n.id === primary.id);
      db.notes = (db.notes || []).filter(n => (n.user_id || DEFAULT_USER_ID) !== userId || !movieNotes.some(mn => mn.id === n.id && mn.id !== primary.id));
      dbChanged = true;

      const toDeleteIds = movieNotes.filter(n => n.id !== primary.id).map(n => n.id);
      if (supabase && toDeleteIds.length > 0) {
        try {
          await supabase.from('notes').delete().in('id', toDeleteIds);
        } catch (e) {}
      }
      movieNote = primary;
    } else if (movieNotes.length === 1) {
      movieNote = movieNotes[0];
    }

    if (!movieNote) {
      let nextNoteId = 1;
      if (supabase) {
        try {
          const { data: created } = await supabase.from('notes').insert([{ user_id: userId, title: 'Movies', icon: '🎬', type: 'movie', is_movie: true, position: 0 }]).select().single();
          if (created) nextNoteId = created.id;
        } catch (e) {}
      }
      if (nextNoteId === 1 && db.notes && db.notes.length) {
        nextNoteId = Math.max(...db.notes.map(n => Number(n.id) || 0)) + 1;
      }
      movieNote = {
        id: nextNoteId,
        user_id: userId,
        name: 'Movies',
        icon: '🎬',
        type: 'movie',
        is_movie: true,
        created_at: new Date().toISOString(),
      };
      if (!db.notes) db.notes = [];
      db.notes.push(movieNote);
      notes.push(movieNote);
      dbChanged = true;
    }

    // Auto-create 4 default movie groups if user has a Movies note with 0 groups
    if (!db.note_groups) db.note_groups = [];
    let userMovieGroups = db.note_groups.filter(g => (g.user_id || DEFAULT_USER_ID) === userId && String(g.note_id) === String(movieNote.id));
    if (supabase && userMovieGroups.length === 0) {
      try {
        const { data: sbGroups } = await supabase.from('note_groups').select('*').eq('user_id', userId).eq('note_id', movieNote.id);
        if (Array.isArray(sbGroups) && sbGroups.length > 0) {
          userMovieGroups = sbGroups;
          for (const sbg of sbGroups) {
            if (!db.note_groups.some(g => String(g.id) === String(sbg.id))) {
              db.note_groups.push(sbg);
              groups.push(sbg);
              dbChanged = true;
            }
          }
        }
      } catch (e) {}
    }

    if (userMovieGroups.length === 0) {
      const defaultGroups = [
        { name: 'Futured', section_key: 'futured', color: '#a78bfa', position: 0 },
        { name: 'To Do', section_key: 'todo', color: '#fbbf24', position: 1 },
        { name: 'Going', section_key: 'doing', color: '#34d399', position: 2 },
        { name: 'Done', section_key: 'done', color: '#60a5fa', position: 3 },
      ];

      for (const dg of defaultGroups) {
        const nextGroupId = db.note_groups.length ? Math.max(...db.note_groups.map(g => Number(g.id) || 0)) + 1 : 1;
        const newG = {
          id: nextGroupId,
          note_id: movieNote.id,
          user_id: userId,
          name: dg.name,
          color: dg.color,
          section_key: dg.section_key,
          position: dg.position,
        };
        db.note_groups.push(newG);
        groups.push(newG);
        if (supabase) {
          try {
            await supabase.from('note_groups').upsert([newG], { onConflict: 'id' });
          } catch (e) {}
        }
      }
      dbChanged = true;
    }

    if (dbChanged) {
      await writeDB(db);
    }

    const result = notes.map(n => {
      const noteGroups = groups.filter(g => String(g.note_id) === String(n.id)).sort((a, b) => (a.position || 0) - (b.position || 0));
      const groupIds = noteGroups.map(g => String(g.id));
      let item_count, groups_summary;
      
      if (n.is_movie) {
        item_count = movies.filter(m => String(m.note_id) === String(n.id) || m.note_id === null).length;
        groups_summary = noteGroups.map(g => ({
          id: g.id, name: g.name, color: g.color,
          count: movies.filter(m => (String(m.note_id) === String(n.id) || m.note_id === null) && m.section === g.section_key).length,
        }));
      } else {
        item_count = items.filter(i => groupIds.includes(String(i.group_id))).length;
        groups_summary = noteGroups.map(g => ({
          id: g.id, name: g.name, color: g.color,
          count: items.filter(i => String(i.group_id) === String(g.id)).length,
        }));
      }
      
      return { ...n, group_count: noteGroups.length, item_count, groups_summary };
    });
    
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/notes
router.post('/', async (req, res) => {
  try {
    const db = readDB();
    if (!db.notes) db.notes = [];
    
    const note = {
      id: db.notes.length ? Math.max(...db.notes.map(n => Number(n.id) || 0)) + 1 : 1,
      user_id: req.userId || DEFAULT_USER_ID,
      name: req.body.name || 'Note',
      icon: normalizeNoteIcon(req.body.icon),
      type: req.body.type || 'custom',
      is_movie: req.body.type === 'movie' || req.body.is_movie || false,
      created_at: new Date().toISOString(),
    };
    
    db.notes.push(note);
    await writeDB(db);

    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from('notes').upsert([sanitizeNoteForSupabase(note)], { onConflict: 'id' });
      } catch (e) {}
    }

    res.json(note);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/notes/:id
router.put('/:id', async (req, res) => {
  try {
    const db = readDB();
    const userId = req.userId || DEFAULT_USER_ID;
    const targetId = req.params.id;
    const idx = (db.notes || []).findIndex(n => String(n.id) === String(targetId) && (n.user_id || DEFAULT_USER_ID) === userId);
    
    const safeBody = { ...req.body };
    delete safeBody.user_id;

    if (idx !== -1) {
      if (safeBody.icon !== undefined) {
        safeBody.icon = normalizeNoteIcon(safeBody.icon, db.notes[idx]?.is_movie ? '🎬' : '📝');
      }
      db.notes[idx] = { ...db.notes[idx], ...safeBody };
      await writeDB(db);
    }

    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from('notes').update(sanitizeNoteForSupabase(safeBody)).eq('id', targetId);
      } catch (e) {}
    }

    if (idx !== -1) {
      return res.json(db.notes[idx]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/notes/:id
router.delete('/:id', async (req, res) => {
  try {
    const db = readDB();
    const userId = req.userId || DEFAULT_USER_ID;
    const targetId = req.params.id;
    const note = (db.notes || []).find(n => String(n.id) === String(targetId) && (n.user_id || DEFAULT_USER_ID) === userId);
    
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    if (note?.is_movie) {
      return res.status(400).json({ error: 'Movie note o\'chirilmaydi' });
    }
    
    db.notes = (db.notes || []).filter(n => !(String(n.id) === String(targetId) && (n.user_id || DEFAULT_USER_ID) === userId));
    db.movies = (db.movies || []).filter(m => !(String(m.note_id) === String(targetId) && (m.user_id || DEFAULT_USER_ID) === userId));
    
    const deletedGroups = (db.note_groups || []).filter(g => String(g.note_id) === String(targetId) && (g.user_id || DEFAULT_USER_ID) === userId).map(g => String(g.id));
    db.note_groups = (db.note_groups || []).filter(g => !(String(g.note_id) === String(targetId) && (g.user_id || DEFAULT_USER_ID) === userId));
    db.note_items = (db.note_items || []).filter(i => !(i.group_id && deletedGroups.includes(String(i.group_id)) && (i.user_id || DEFAULT_USER_ID) === userId));
    
    await writeDB(db);

    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from('notes').delete().eq('id', targetId);
      } catch (e) {}
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

module.exports = router;
