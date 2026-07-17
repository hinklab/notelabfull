const path = require('path');
const fs = require('fs');
const os = require('os');

// Get database path (same as Electron)
function getDbPath() {
  const userDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'notelab');
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }
  return path.join(userDataPath, 'notelab.json');
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

module.exports = { readDB, writeDB, getDbPath };
