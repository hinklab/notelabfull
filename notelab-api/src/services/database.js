const path = require('path');
const fs = require('fs');
const os = require('os');

function getDbPath() {
  // Agar Windows'da (Electron) ishlasa - eski joyni ishlatadi
  const localPath = path.join(os.homedir(), 'AppData', 'Roaming', 'notelab', 'notelab.json');
  if (fs.existsSync(localPath)) {
    return localPath;
  }
  // Aks holda (server/Render) - repo ichidagi data papkasini ishlatadi
  return path.join(__dirname, '../../data/notelab.json');
}

function normalizeNoteIcon(icon, fallback = '📝') {
  if (typeof icon === 'string' && icon.trim()) return icon;
  if (icon && typeof icon === 'object' && typeof icon.icon === 'string' && icon.icon.trim()) return icon.icon;
  return fallback;
}

const supabase = require('./supabase');

function readDB() {
  try {
    const raw = fs.readFileSync(getDbPath(), 'utf-8');
    const db = JSON.parse(raw);
    if (!db.notes) db.notes = [];
    if (!db.note_groups) db.note_groups = [];
    if (!db.note_items) db.note_items = [];
    if (!db.movies) db.movies = [];
    if (!db.settings) db.settings = {};
    if (!db.user_settings) db.user_settings = [];
    if (!db.agent_memory) db.agent_memory = [];

    const DEFAULT_USER_ID = '0d3da195-1d0e-458b-9f88-2879561e0da6';
    let changed = false;

    for (const note of db.notes) {
      if (!note.user_id) {
        note.user_id = DEFAULT_USER_ID;
        changed = true;
      }
      const safeIcon = normalizeNoteIcon(note.icon, note.is_movie ? '🎬' : '📝');
      if (note.icon !== safeIcon) {
        note.icon = safeIcon;
        changed = true;
      }
    }
    for (const group of db.note_groups) {
      if (!group.user_id) {
        group.user_id = DEFAULT_USER_ID;
        changed = true;
      }
    }
    for (const item of db.note_items) {
      if (!item.user_id) {
        item.user_id = DEFAULT_USER_ID;
        changed = true;
      }
    }
    for (const movie of db.movies) {
      if (!movie.user_id) {
        movie.user_id = DEFAULT_USER_ID;
        changed = true;
      }
    }

    if (changed) writeDB(db);
    return db;
  } catch (e) {
    console.log('Database file not found, creating new one');
    return { 
      notes: [], 
      note_groups: [], 
      note_items: [], 
      movies: [], 
      settings: {}, 
      user_settings: [],
      agent_memory: [] 
    };
  }
}

async function writeDB(db, deletedInfo = null) {
  try {
    fs.writeFileSync(getDbPath(), JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing local DB:', err.message);
  }

  // Awaited Cloud Sync to Supabase PostgreSQL so serverless functions never terminate pending writes!
  if (supabase) {
    try {
      const DEFAULT_USER_ID = '0d3da195-1d0e-458b-9f88-2879561e0da6';

      // Delete entity from Supabase if explicit deletion occurred
      if (deletedInfo?.deletedMovieId) {
        await supabase.from('movies').delete().eq('id', deletedInfo.deletedMovieId).catch(() => {});
      }
      if (deletedInfo?.deletedGroupId) {
        await supabase.from('note_groups').delete().eq('id', deletedInfo.deletedGroupId).catch(() => {});
      }
      if (deletedInfo?.deletedItemId) {
        await supabase.from('note_items').delete().eq('id', deletedInfo.deletedItemId).catch(() => {});
      }

      if (db.notes && db.notes.length) {
        const notesPayload = db.notes.map(n => ({
          id: n.id,
          user_id: n.user_id || DEFAULT_USER_ID,
          title: n.title || n.name || 'Untitled',
          icon: typeof n.icon === 'string' ? n.icon : '📝',
          type: n.type || (n.is_movie ? 'movie' : 'kanban'),
          is_movie: Boolean(n.is_movie),
          position: n.position || 0,
          updated_at: new Date().toISOString()
        }));
        await supabase.from('notes').upsert(notesPayload, { onConflict: 'id' }).catch(() => {});
      }

      if (db.note_groups && db.note_groups.length) {
        const groupsPayload = db.note_groups.map(g => ({
          id: g.id,
          user_id: g.user_id || DEFAULT_USER_ID,
          note_id: g.note_id,
          name: g.name || 'Untitled',
          position: g.position || 0,
          updated_at: new Date().toISOString()
        }));
        await supabase.from('note_groups').upsert(groupsPayload, { onConflict: 'id' }).catch(() => {});
      }

      if (db.note_items && db.note_items.length) {
        const itemsPayload = db.note_items.map(i => ({
          id: i.id,
          user_id: i.user_id || DEFAULT_USER_ID,
          group_id: i.group_id,
          title: i.title || 'Untitled',
          subtitle: i.subtitle || '',
          cover_url: i.cover_url || null,
          note: i.note || '',
          position: i.position || 0,
          updated_at: new Date().toISOString()
        }));
        await supabase.from('note_items').upsert(itemsPayload, { onConflict: 'id' }).catch(() => {});
      }

      if (db.movies && db.movies.length) {
        const moviesPayload = db.movies.map(m => ({
          id: m.id,
          user_id: m.user_id || DEFAULT_USER_ID,
          note_id: m.note_id || null,
          title: m.title || '',
          section: m.section || 'todo',
          position: m.position || 0,
          tmdb_id: m.tmdb_id || null,
          imdb_id: m.imdb_id || null,
          media_type: m.media_type || 'movie',
          poster_path: m.poster_path || null,
          rating: m.rating || null,
          vote_count: m.vote_count || null,
          genre: m.genre || '-',
          director: m.director || '-',
          overview: m.overview || '',
          release_date: m.release_date || null,
          release_year: m.release_year || '-',
          seasons: m.seasons || '-',
          note: m.note || '',
          updated_at: new Date().toISOString()
        }));
        await supabase.from('movies').upsert(moviesPayload, { onConflict: 'id' }).catch(() => {});
      }
    } catch (err) {
      console.warn('Supabase cloud write warning:', err.message);
    }
  }
}

const SYSTEM_DEFAULT_OMDB_KEY = process.env.OMDB_KEY || '563e076e';
const SYSTEM_DEFAULT_TMDB_KEY = process.env.TMDB_KEY || 'c34d44f722c298573a97a32fc4df383a';

function getUserSettings(userId, inputDb) {
  const DEFAULT_USER_ID = '0d3da195-1d0e-458b-9f88-2879561e0da6';
  const targetId = userId || DEFAULT_USER_ID;
  const db = inputDb || readDB();

  let userSpecific = null;
  if (db.user_settings) {
    if (Array.isArray(db.user_settings)) {
      userSpecific = db.user_settings.find(s => s.user_id === targetId || s.id === targetId);
    } else if (typeof db.user_settings === 'object') {
      userSpecific = db.user_settings[targetId];
    }
  }

  const globalSettings = db.settings || {};

  return {
    ...globalSettings,
    ...(userSpecific || {}),
    gemini_key: userSpecific?.gemini_key || globalSettings.gemini_key || '',
    omdb_key: SYSTEM_DEFAULT_OMDB_KEY,
    tmdb_key: SYSTEM_DEFAULT_TMDB_KEY,
  };
}

function saveUserSettings(userId, newSettings, inputDb) {
  const DEFAULT_USER_ID = '0d3da195-1d0e-458b-9f88-2879561e0da6';
  const targetId = userId || DEFAULT_USER_ID;
  const db = inputDb || readDB();

  if (!db.user_settings) db.user_settings = [];

  let record = null;
  if (Array.isArray(db.user_settings)) {
    record = db.user_settings.find(s => s.user_id === targetId || s.id === targetId);
    if (!record) {
      record = { user_id: targetId };
      db.user_settings.push(record);
    }
  } else if (typeof db.user_settings === 'object') {
    if (!db.user_settings[targetId]) db.user_settings[targetId] = { user_id: targetId };
    record = db.user_settings[targetId];
  }

  Object.assign(record, newSettings, { updated_at: new Date().toISOString() });
  writeDB(db);
  return record;
}

module.exports = { readDB, writeDB, getDbPath, normalizeNoteIcon, getUserSettings, saveUserSettings };
