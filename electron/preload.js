const { contextBridge } = require('electron')

const API_BASE = 'http://localhost:3000/api'

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`)
  return res.json()
}

contextBridge.exposeInMainWorld('api', {
  // Notes
  getNotes: () => fetchJSON(`${API_BASE}/notes`),
  createNote: (data) => fetchJSON(`${API_BASE}/notes`, { method: 'POST', body: JSON.stringify(data) }),
  updateNote: (id, data) => fetchJSON(`${API_BASE}/notes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteNote: (id) => fetchJSON(`${API_BASE}/notes/${id}`, { method: 'DELETE' }),
  getNoteMovies: (note_id) => fetchJSON(`${API_BASE}/movies?note_id=${note_id}`),

  // Groups
  getGroups: (note_id) => fetchJSON(`${API_BASE}/groups?note_id=${note_id}`),
  createGroup: (note_id, name) => fetchJSON(`${API_BASE}/groups`, { method: 'POST', body: JSON.stringify({ note_id, name }) }),
  updateGroup: (id, data) => fetchJSON(`${API_BASE}/groups/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteGroup: (id) => fetchJSON(`${API_BASE}/groups/${id}`, { method: 'DELETE' }),
  reorderGroups: (note_id, ids) => fetchJSON(`${API_BASE}/groups/reorder`, { method: 'POST', body: JSON.stringify({ note_id, ids }) }),

  // Items
  getItems: (group_id) => fetchJSON(`${API_BASE}/items?group_id=${group_id}`),
  addItem: (group_id, data) => fetchJSON(`${API_BASE}/items`, { method: 'POST', body: JSON.stringify({ group_id, ...data }) }),
  updateItem: (id, data) => fetchJSON(`${API_BASE}/items/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteItem: (id) => fetchJSON(`${API_BASE}/items/${id}`, { method: 'DELETE' }),
  moveItem: (id, to_group_id, position) => fetchJSON(`${API_BASE}/items/move`, { method: 'POST', body: JSON.stringify({ id, to_group_id, position }) }),
  reorderItems: (group_id, ids) => fetchJSON(`${API_BASE}/items/reorder`, { method: 'POST', body: JSON.stringify({ group_id, ids }) }),

  // Movies
  getMovies: (note_id) => fetchJSON(`${API_BASE}/movies?note_id=${note_id}`),
  addMovie: (data) => fetchJSON(`${API_BASE}/movies`, { method: 'POST', body: JSON.stringify(data) }),
  updateMovie: (id, data) => fetchJSON(`${API_BASE}/movies/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMovie: (id) => fetchJSON(`${API_BASE}/movies/${id}`, { method: 'DELETE' }),
  moveMovie: (id, section, position) => fetchJSON(`${API_BASE}/movies/move`, { method: 'POST', body: JSON.stringify({ id, section, position }) }),
  reorderMovies: (section, ids) => fetchJSON(`${API_BASE}/movies/reorder`, { method: 'POST', body: JSON.stringify({ section, ids }) }),
  refreshAllMovies: () => fetchJSON(`${API_BASE}/movies/refresh-all`, { method: 'POST' }),

  // Content
  searchContent: (type, query) => fetchJSON(`${API_BASE}/content/search?type=${type}&query=${encodeURIComponent(query)}`),

  // Agent
  agentChat: (msg, history, uiMovies, noteCtx) => fetchJSON(`${API_BASE}/agent/chat`, {
    method: 'POST',
    body: JSON.stringify({ message: msg, history, uiMovies, noteCtx })
  }),

  // Settings
  getSettings: () => fetchJSON(`${API_BASE}/settings`),
  saveSettings: (data) => fetchJSON(`${API_BASE}/settings`, { method: 'PUT', body: JSON.stringify(data) }),
})
