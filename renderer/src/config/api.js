// API configuration - works in both Electron and Web
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

async function fetchJSON(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

// Unified API client
export const api = {
  // Notes
  getNotes: () => fetchJSON(`${API_BASE}/notes`),
  createNote: (data) => fetchJSON(`${API_BASE}/notes`, { method: 'POST', body: JSON.stringify(data) }),
  updateNote: (id, data) => fetchJSON(`${API_BASE}/notes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteNote: (id) => fetchJSON(`${API_BASE}/notes/${id}`, { method: 'DELETE' }),

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

  // Settings
  getSettings: () => fetchJSON(`${API_BASE}/settings`),
  saveSettings: (data) => fetchJSON(`${API_BASE}/settings`, { method: 'PUT', body: JSON.stringify(data) }),

  // Agent
  agentChat: (msg, history, uiMovies, noteCtx) => fetchJSON(`${API_BASE}/agent/chat`, {
    method: 'POST',
    body: JSON.stringify({ message: msg, history, uiMovies, noteCtx })
  }),
};

export default api;
