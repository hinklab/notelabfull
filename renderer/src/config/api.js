function getApiBase() {
  const envUrl = import.meta.env.VITE_API_URL;
  if (!envUrl || !envUrl.trim() || envUrl.includes('onrender')) return '/api';
  const clean = envUrl.trim().replace(/\/+$/, '');
  return (clean.startsWith('http://') || clean.startsWith('https://')) ? clean : '/api';
}
const API_BASE = getApiBase();

function getUserHeader() {
  try {
    const saved = localStorage.getItem('notelab_user')
    if (saved) {
      const u = JSON.parse(saved)
      if (u && u.id) {
        return {
          'x-user-id': u.id,
          'x-user-email': u.email || '',
          'x-user-first-name': u.first_name || '',
          'x-user-last-name': u.last_name || ''
        }
      }
    }
  } catch {}
  return {}
}

async function fetchJSON(url, options = {}) {
  const userHeader = getUserHeader()
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...userHeader, ...options.headers },
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

  // Movies
  getMovies: (note_id) => fetchJSON(`${API_BASE}/movies?note_id=${note_id || ''}`),
  addMovie: (data) => fetchJSON(`${API_BASE}/movies`, { method: 'POST', body: JSON.stringify(data) }),
  updateMovie: (id, data) => fetchJSON(`${API_BASE}/movies/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMovie: (id) => fetchJSON(`${API_BASE}/movies/${id}`, { method: 'DELETE' }),
  moveMovie: (id, section, position) => fetchJSON(`${API_BASE}/movies/move`, { method: 'POST', body: JSON.stringify({ id, section, position }) }),
  reorderMovies: (section, ids) => fetchJSON(`${API_BASE}/movies/reorder`, { method: 'POST', body: JSON.stringify({ section, ids }) }),
  refreshAllMovies: (params) => fetchJSON(`${API_BASE}/movies/refresh-all${params?.auto ? '?auto=true' : ''}`, { method: 'POST' }),

  // Content Search, Media Images & Franchises
  searchContent: (type, query) => fetchJSON(`${API_BASE}/content/search?type=${encodeURIComponent(type)}&query=${encodeURIComponent(query)}`),
  getMovieImages: (tmdb_id, media_type) => fetchJSON(`${API_BASE}/content/images?tmdb_id=${encodeURIComponent(tmdb_id)}&media_type=${encodeURIComponent(media_type || 'movie')}`),
  getFranchiseUniverse: (tmdb_id) => fetchJSON(`${API_BASE}/franchises/${encodeURIComponent(tmdb_id)}`),

  // Settings & Profile & Auth
  getSettings: () => fetchJSON(`${API_BASE}/settings`),
  saveSettings: (data) => fetchJSON(`${API_BASE}/settings`, { method: 'PUT', body: JSON.stringify(data) }),
  updateProfile: (data) => fetchJSON(`${API_BASE}/auth/profile`, { method: 'PATCH', body: JSON.stringify(data) }),
  resetPasswordEmail: (email, redirectTo) => fetchJSON(`${API_BASE}/auth/reset-password-email`, { method: 'POST', body: JSON.stringify({ email, redirectTo: redirectTo || (typeof window !== 'undefined' ? window.location.origin : undefined) }) }),

  // Notifications
  getNotifications: () => fetchJSON(`${API_BASE}/notifications`),
  markNotificationRead: (id) => fetchJSON(`${API_BASE}/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () => fetchJSON(`${API_BASE}/notifications/read-all`, { method: 'POST' }),
  deleteNotification: (id) => fetchJSON(`${API_BASE}/notifications/${id}`, { method: 'DELETE' }),

  // Agent
  agentChat: (msg, history, uiMovies, noteCtx) => fetchJSON(`${API_BASE}/agent/chat`, {
    method: 'POST',
    body: JSON.stringify({ message: msg, history, uiMovies, noteCtx })
  }),
};

export default api;
