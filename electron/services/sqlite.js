const path = require('path')
const fs = require('fs')
const { app } = require('electron')

function getDbPath() {
  return path.join(app.getPath('userData'), 'notelab.json')
}

function normalizeSection(section) {
  if (!section) return 'todo'
  const s = String(section).toLowerCase().trim()
  const map = {
    futured: 'futured', 'to do': 'todo', todo: 'todo',
    going: 'doing', doing: 'doing', done: 'done', watched: 'done',
  }
  if (map[s]) return map[s]
  if (/futured|chiqadigan|upcoming/.test(s)) return 'futured'
  if (/^to\s*do|todo|ko['']rmoqchi/.test(s)) return 'todo'
  if (/going|doing|ko['']rayotgan/.test(s)) return 'doing'
  if (/^done$|ko['']rib|watched|tugat/.test(s)) return 'done'
  return ['futured', 'todo', 'doing', 'done'].includes(s) ? s : 'todo'
}

const GROUP_COLORS = [
  '#a78bfa', '#fbbf24', '#34d399', '#60a5fa',
  '#f472b6', '#fb923c', '#4ade80', '#38bdf8',
]

function readDB() {
  try {
    const raw = fs.readFileSync(getDbPath(), 'utf-8')
    const db = JSON.parse(raw)
    if (!db.movies) db.movies = []
    if (!db.settings) db.settings = {}
    if (!db.agent_memory) db.agent_memory = []
    if (!db.notes) db.notes = []
    if (!db.note_groups) db.note_groups = []
    if (!db.note_items) db.note_items = []
    let changed = false
    for (const n of (db.notes || [])) {
      if (!n.type) { n.type = 'custom'; changed = true }
    }
    for (const m of db.movies) {
      const norm = normalizeSection(m.section)
      if (m.section !== norm) {
        m.section = norm
        changed = true
      }
    }
    if (changed) writeDB(db)
    ensureMovieNote(db)
    return db
  } catch (e) {
    return { movies: [], settings: {}, agent_memory: [], notes: [], note_groups: [], note_items: [] }
  }
}

function writeDB(db) {
  fs.writeFileSync(getDbPath(), JSON.stringify(db, null, 2), 'utf-8')
}

function nextId(movies) {
  const ids = movies.map(m => m.id)
  return ids.length ? Math.max(...ids) + 1 : 1
}

function nextGroupId(groups) {
  const ids = (groups || []).map(g => g.id)
  return ids.length ? Math.max(...ids) + 1 : 1
}

function ensureMovieNote(db) {
  if (!db.notes) db.notes = []
  let movieNote = db.notes.find(n => n.is_movie === true)
  if (!movieNote) {
    const id = db.notes.length ? Math.max(...db.notes.map(n => n.id)) + 1 : 1
    movieNote = { id, name: 'Movies', icon: '\ud83c\udfac', type: 'movie', is_movie: true, created_at: new Date().toISOString() }
    db.notes.unshift(movieNote)
  }
  // Migrate old note_id=null groups to this note
  const oldGroups = (db.note_groups || []).filter(g => (g.note_id ?? null) === null)
  if (oldGroups.length > 0) {
    oldGroups.forEach(g => { g.note_id = movieNote.id })
  } else {
    const hasGroups = (db.note_groups || []).some(g => g.note_id === movieNote.id)
    if (!hasGroups) {
      const base = nextGroupId(db.note_groups || [])
      const defaults = [
        { id: base,   note_id: movieNote.id, name: 'Futured', color: '#a78bfa', section_key: 'futured', position: 0 },
        { id: base+1, note_id: movieNote.id, name: 'To Do',   color: '#fbbf24', section_key: 'todo',    position: 1 },
        { id: base+2, note_id: movieNote.id, name: 'Going',   color: '#34d399', section_key: 'doing',   position: 2 },
        { id: base+3, note_id: movieNote.id, name: 'Done',    color: '#60a5fa', section_key: 'done',    position: 3 },
      ]
      db.note_groups = [...(db.note_groups || []), ...defaults]
    }
  }
  // Migrate movies with note_id=null
  ;(db.movies || []).forEach(m => {
    if ((m.note_id ?? null) === null) m.note_id = movieNote.id
  })
  return movieNote
}

function initDB() {
  const db = fs.existsSync(getDbPath()) ? readDB() : {
    movies: [
      { id: 1, tmdb_id: null, title: 'Avengers: Doomsday', release_year: '2026', rating: null, vote_count: null, genre: 'Action, Sci-Fi', director: 'Russo Brothers', seasons: '-', poster_path: null, section: 'futured', position: 0, note: '' },
      { id: 2, tmdb_id: null, title: 'Inception', release_year: '2010', rating: 8.8, vote_count: 2400000, genre: 'Sci-Fi, Thriller', director: 'Christopher Nolan', seasons: '-', poster_path: null, section: 'todo', position: 0, note: '' },
      { id: 3, tmdb_id: null, title: 'Daredevil S1-S3', release_year: '2015-2018', rating: 8.6, vote_count: 180000, genre: 'Action, Crime', director: 'Various', seasons: '3 season', poster_path: null, section: 'doing', position: 0, note: '' },
      { id: 4, tmdb_id: null, title: 'Spider-Man: No Way Home', release_year: '2021', rating: 8.2, vote_count: 850000, genre: 'Action, Adventure', director: 'Jon Watts', seasons: '-', poster_path: null, section: 'done', position: 0, note: 'MCU film; Matt Murdock cameo.' },
    ],
    settings: {}, agent_memory: [], notes: [], note_groups: [], note_items: [],
  }
  ensureMovieNote(db)
  writeDB(db)
}

function promoteFuturedMovies(db) {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  let changed = false
  for (const m of db.movies) {
    if (m.section !== 'futured') continue
    if (!m.release_date) continue
    const d = new Date(m.release_date)
    if (isNaN(d.getTime())) continue
    if (d < now) {
      const nid = m.note_id ?? null
      m.section = 'todo'
      m.rating = m.rating || null
      m.vote_count = m.vote_count || null
      m.position = 0
      db.movies
        .filter(x => x.section === 'todo' && x.id !== m.id && (x.note_id ?? null) === nid)
        .forEach(x => { x.position = (x.position || 0) + 1 })
      changed = true
    }
  }
  return changed
}

function sortFutured(movies) {
  const noteGroups = {}
  for (const m of movies) {
    if (m.section !== 'futured') continue
    const key = String(m.note_id ?? 'null')
    if (!noteGroups[key]) noteGroups[key] = []
    noteGroups[key].push(m)
  }
  for (const group of Object.values(noteGroups)) {
    const noDate  = group.filter(m => !m.release_date)
    const hasDate = group.filter(m => !!m.release_date)
    hasDate.sort((a, b) => new Date(a.release_date) - new Date(b.release_date))
    hasDate.forEach((m, i) => { m.position = i })
    noDate.forEach((m, i) => { m.position = hasDate.length + i })
  }
}

function getAllMovies(note_id = null) {
  const db = readDB()
  const promoted = promoteFuturedMovies(db)
  sortFutured(db.movies)
  writeDB(db)
  const filtered = db.movies.filter(m => (m.note_id ?? null) === note_id)
  return filtered.sort((a, b) => a.position - b.position)
}

function addMovie(data) {
  const db = readDB()
  const section = data.section || 'todo'
  const note_id = data.note_id ?? null
  let position
  if (section === 'futured') {
    position = db.movies.filter(m => m.section === 'futured' && (m.note_id ?? null) === note_id).length
  } else {
    db.movies
      .filter(m => m.section === section && (m.note_id ?? null) === note_id)
      .forEach(m => { m.position = (m.position || 0) + 1 })
    position = 0
  }
  const movie = {
    id: nextId(db.movies),
    tmdb_id: data.tmdb_id || null,
    imdb_id: data.imdb_id || null,
    title: data.title,
    release_date: data.release_date || null,
    release_year: data.release_year || '-',
    rating: data.rating || null,
    vote_count: data.vote_count || null,
    genre: data.genre || '-',
    director: data.director || '-',
    seasons: data.seasons || '-',
    poster_path: data.poster_path || null,
    section,
    position,
    note_id,
    note: data.note || '',
  }
  db.movies.push(movie)
  writeDB(db)
  return movie
}

function updateMovie(id, data) {
  const db = readDB()
  const idx = db.movies.findIndex(m => m.id === id)
  if (idx === -1) return null
  db.movies[idx] = { ...db.movies[idx], ...data }
  writeDB(db)
  return db.movies[idx]
}

function deleteMovie(id) {
  const db = readDB()
  db.movies = db.movies.filter(m => m.id !== id)
  writeDB(db)
  return { success: true }
}

function moveMovie(id, section, position = null) {
  const db = readDB()
  const idx = db.movies.findIndex(m => m.id === id)
  if (idx === -1) return null
  const oldSection = db.movies[idx].section
  db.movies[idx].section = section
  if (position !== null) {
    db.movies
      .filter(m => m.section === section && m.id !== id)
      .filter(m => m.position >= position)
      .forEach(m => { m.position = (m.position || 0) + 1 })
    db.movies[idx].position = position
  } else {
    db.movies[idx].position = db.movies.filter(m => m.section === section && m.id !== id).length
  }
  writeDB(db)
  return db.movies[idx]
}

function reorderMovies(section, ids) {
  const db = readDB()
  ids.forEach((id, position) => {
    const idx = db.movies.findIndex(m => m.id === id)
    if (idx !== -1) db.movies[idx].position = position
  })
  writeDB(db)
  return { success: true }
}

function getSettings() { return readDB().settings }

function saveSettings(data) {
  const db = readDB()
  db.settings = { ...db.settings, ...data }
  writeDB(db)
  return { success: true }
}

function addMemory(user_message, agent_response) {
  const db = readDB()
  db.agent_memory = db.agent_memory || []
  db.agent_memory.push({ user_message, agent_response, created_at: new Date().toISOString() })
  if (db.agent_memory.length > 20) db.agent_memory = db.agent_memory.slice(-20)
  writeDB(db)
}

function getMemory(limit = 5) { return readDB().agent_memory.slice(-limit) }
function getAllMoviesRaw() { return readDB().movies }

function getNotes() {
  const db = readDB()
  const notes = db.notes || []
  const groups = db.note_groups || []
  const items = db.note_items || []
  const movies = db.movies || []
  return notes.map(n => {
    const noteGroups = groups.filter(g => g.note_id === n.id).sort((a, b) => a.position - b.position)
    const groupIds = noteGroups.map(g => g.id)
    let item_count, groups_summary
    if (n.is_movie) {
      item_count = movies.filter(m => m.note_id === n.id).length
      groups_summary = noteGroups.map(g => ({
        id: g.id, name: g.name, color: g.color,
        count: movies.filter(m => m.note_id === n.id && m.section === g.section_key).length,
      }))
    } else {
      item_count = items.filter(i => groupIds.includes(i.group_id)).length
      groups_summary = noteGroups.map(g => ({
        id: g.id, name: g.name, color: g.color,
        count: items.filter(i => i.group_id === g.id).length,
      }))
    }
    return { ...n, group_count: noteGroups.length, item_count, groups_summary }
  })
}

function createNote(data) {
  const db = readDB()
  if (!db.notes) db.notes = []
  const note = {
    id: db.notes.length ? Math.max(...db.notes.map(n => n.id)) + 1 : 1,
    name: data.name || 'Note',
    icon: data.icon || '📝',
    type: data.type || 'custom',
    created_at: new Date().toISOString(),
  }
  db.notes.push(note)
  writeDB(db)
  return note
}

function updateNote(id, data) {
  const db = readDB()
  const idx = (db.notes || []).findIndex(n => n.id === id)
  if (idx === -1) return null
  db.notes[idx] = { ...db.notes[idx], ...data }
  writeDB(db)
  return db.notes[idx]
}

function deleteNote(id) {
  const db = readDB()
  const note = (db.notes || []).find(n => n.id === id)
  if (note?.is_movie) return { error: 'Movie note o\'chirilmaydi' }
  db.notes = (db.notes || []).filter(n => n.id !== id)
  db.movies = (db.movies || []).filter(m => m.note_id !== id)
  const deletedGroups = (db.note_groups || []).filter(g => g.note_id === id).map(g => g.id)
  db.note_groups = (db.note_groups || []).filter(g => g.note_id !== id)
  db.note_items = (db.note_items || []).filter(i => !deletedGroups.includes(i.group_id))
  writeDB(db)
  return { success: true }
}

function getGroups(note_id) {
  const db = readDB()
  return (db.note_groups || []).filter(g => g.note_id === note_id).sort((a, b) => a.position - b.position)
}

function createGroup(note_id, name) {
  const db = readDB()
  if (!db.note_groups) db.note_groups = []
  const existing = db.note_groups.filter(g => g.note_id === note_id)
  if (existing.length >= 5) return { error: 'Max 5 ta group yaratish mumkin' }
  const usedColors = existing.map(g => g.color)
  const color = GROUP_COLORS.find(c => !usedColors.includes(c)) || GROUP_COLORS[existing.length % GROUP_COLORS.length]
  const group = {
    id: nextGroupId(db.note_groups),
    note_id: note_id ?? null,
    name: name || 'Group',
    color,
    section_key: `group_${Date.now()}`,
    position: existing.length,
  }
  db.note_groups.push(group)
  writeDB(db)
  return group
}

function reorderGroups(note_id, ids) {
  const db = readDB()
  ids.forEach((id, idx) => {
    const g = (db.note_groups || []).find(g => g.id === id && g.note_id === note_id)
    if (g) g.position = idx
  })
  writeDB(db)
  return { success: true }
}

function updateGroup(id, data) {
  const db = readDB()
  const idx = (db.note_groups || []).findIndex(g => g.id === id)
  if (idx === -1) return null
  if (data.note_id !== undefined) delete data.note_id
  if (data.section_key !== undefined) delete data.section_key
  db.note_groups[idx] = { ...db.note_groups[idx], ...data }
  writeDB(db)
  return db.note_groups[idx]
}

function deleteGroup(id) {
  const db = readDB()
  const group = (db.note_groups || []).find(g => g.id === id)
  if (!group) return { error: 'Topilmadi' }
  const note = (db.notes || []).find(n => n.id === group.note_id)
  const remaining = (db.note_groups || []).filter(g => g.note_id === group.note_id && g.id !== id)
  if (note?.is_movie && remaining.length === 0) return { error: 'Kamida 1 ta guruh bo\'lishi kerak' }
  db.note_groups = db.note_groups.filter(g => g.id !== id)
  // For movie note: move movies in this group to trash (delete)
  if (note?.is_movie) {
    db.movies = (db.movies || []).filter(m => m.section !== group.section_key || m.note_id !== group.note_id)
  }
  db.note_items = (db.note_items || []).filter(i => i.group_id !== id)
  db.note_groups
    .filter(g => g.note_id === group.note_id && g.position > group.position)
    .forEach(g => { g.position-- })
  writeDB(db)
  return { success: true }
}

function nextItemId(items) {
  const ids = (items || []).map(i => i.id)
  return ids.length ? Math.max(...ids) + 1 : 1
}

function getItems(group_id) {
  const db = readDB()
  return (db.note_items || []).filter(i => i.group_id === group_id).sort((a, b) => a.position - b.position)
}

function addItem(group_id, data) {
  const db = readDB()
  if (!db.note_items) db.note_items = []
  const groupItems = db.note_items.filter(i => i.group_id === group_id)
  groupItems.forEach(i => { i.position = (i.position || 0) + 1 })
  const item = {
    id: nextItemId(db.note_items),
    group_id,
    title: data.title || 'Untitled',
    subtitle: data.subtitle || '',
    cover_url: data.cover_url || null,
    note: data.note || '',
    position: 0,
    created_at: new Date().toISOString(),
  }
  db.note_items.push(item)
  writeDB(db)
  return item
}

function updateItem(id, data) {
  const db = readDB()
  if (!db.note_items) return null
  const idx = db.note_items.findIndex(i => i.id === id)
  if (idx === -1) return null
  const safe = { ...data }
  delete safe.id
  delete safe.group_id
  db.note_items[idx] = { ...db.note_items[idx], ...safe }
  writeDB(db)
  return db.note_items[idx]
}

function deleteItem(id) {
  const db = readDB()
  db.note_items = (db.note_items || []).filter(i => i.id !== id)
  writeDB(db)
  return { success: true }
}

function moveItem(id, to_group_id, position = null) {
  const db = readDB()
  if (!db.note_items) return null
  const idx = db.note_items.findIndex(i => i.id === id)
  if (idx === -1) return null
  db.note_items[idx].group_id = to_group_id
  if (position !== null) {
    db.note_items
      .filter(i => i.group_id === to_group_id && i.id !== id && i.position >= position)
      .forEach(i => { i.position = (i.position || 0) + 1 })
    db.note_items[idx].position = position
  } else {
    db.note_items[idx].position = db.note_items.filter(i => i.group_id === to_group_id && i.id !== id).length
  }
  writeDB(db)
  return db.note_items[idx]
}

function reorderItems(group_id, ids) {
  const db = readDB()
  if (!db.note_items) return { success: true }
  ids.forEach((id, position) => {
    const idx = db.note_items.findIndex(i => i.id === id)
    if (idx !== -1) db.note_items[idx].position = position
  })
  writeDB(db)
  return { success: true }
}

module.exports = {
  initDB, getAllMovies, addMovie, updateMovie, deleteMovie,
  moveMovie, reorderMovies, getSettings, saveSettings,
  addMemory, getMemory, getAllMoviesRaw,
  getNotes, createNote, updateNote, deleteNote,
  getGroups, createGroup, updateGroup, deleteGroup, reorderGroups,
  getItems, addItem, updateItem, deleteItem, moveItem, reorderItems,
}
