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
    if (!db.agent_memory) db.agent_memory = [];
    let changed = false;
    for (const note of db.notes) {
      const safeIcon = normalizeNoteIcon(note.icon, note.is_movie ? '🎬' : '📝');
      if (note.icon !== safeIcon) {
        note.icon = safeIcon;
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
      agent_memory: [] 
    };
  }
}

function writeDB(db) {
  fs.writeFileSync(getDbPath(), JSON.stringify(db, null, 2), 'utf-8');
}

module.exports = { readDB, writeDB, getDbPath, normalizeNoteIcon };
