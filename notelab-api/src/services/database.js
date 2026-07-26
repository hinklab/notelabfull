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

function writeDB(db) {
  fs.writeFileSync(getDbPath(), JSON.stringify(db, null, 2), 'utf-8');
}

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
    gemini_key: userSpecific?.gemini_key !== undefined ? userSpecific.gemini_key : (globalSettings.gemini_key || ''),
    omdb_key: userSpecific?.omdb_key !== undefined ? userSpecific.omdb_key : (globalSettings.omdb_key || ''),
    tmdb_key: userSpecific?.tmdb_key !== undefined ? userSpecific.tmdb_key : (globalSettings.tmdb_key || ''),
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
