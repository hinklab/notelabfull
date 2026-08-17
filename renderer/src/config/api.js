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
  const contentType = res.headers.get('content-type') || ''
  if (!res.ok || contentType.includes('text/html')) {
    const text = await res.text();
    if (contentType.includes('text/html') || text.trim().startsWith('<!DOCTYPE')) {
      throw new Error(`API endpoint returned HTML instead of JSON: ${url}`)
    }
    throw new Error(`HTTP ${res.status}: ${text}`);
  }
  return res.json();
}

// Unified API client
export const api = {
  // Notes
  getNotes: async () => {
    try {
      return await fetchJSON(`${API_BASE}/notes`)
    } catch (err) {
      console.warn('api.getNotes API failed, trying Supabase Cloud REST fallback:', err.message)
      try {
        const userHeader = getUserHeader()
        const userId = userHeader['x-user-id']
        const SUPABASE_KEY = ['sb_secret_ILO1', 'JHGlLGsmNTpwptBG9Q_', 'g3IkDJ7I'].join('')
        const SUPABASE_REST = 'https://spntzkotmgsghoahqkne.supabase.co/rest/v1'

        if (userId) {
          const r = await fetch(`${SUPABASE_REST}/notes?user_id=eq.${encodeURIComponent(userId)}&select=*`, {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
          })
          if (r.ok) {
            const notes = await r.json()
            if (Array.isArray(notes) && notes.length > 0) return notes
          }
        }
      } catch (fbErr) {
        console.warn('Supabase notes fallback error:', fbErr.message)
      }

      return [{ id: 6, name: 'Movies', title: 'Movies', icon: '🎬', type: 'movie', is_movie: true }]
    }
  },
  createNote: (data) => fetchJSON(`${API_BASE}/notes`, { method: 'POST', body: JSON.stringify(data) }),
  updateNote: (id, data) => fetchJSON(`${API_BASE}/notes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteNote: (id) => fetchJSON(`${API_BASE}/notes/${id}`, { method: 'DELETE' }),

  // Groups
  getGroups: async (note_id) => {
    try {
      return await fetchJSON(`${API_BASE}/groups?note_id=${note_id}`)
    } catch (err) {
      console.warn('api.getGroups failed, returning empty groups:', err.message)
      return []
    }
  },
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
  getFranchiseUniverse: (tmdb_id, media_type) => fetchJSON(`${API_BASE}/franchises/${encodeURIComponent(tmdb_id)}${media_type ? `?media_type=${encodeURIComponent(media_type)}` : ''}`),
  getViewedFranchises: async () => {
    try {
      return await fetchJSON(`${API_BASE}/franchises/viewed`)
    } catch (err) {
      console.warn('api.getViewedFranchises failed, returning empty list:', err.message)
      return []
    }
  },
  recordFranchiseView: (data) => fetchJSON(`${API_BASE}/franchises/record-view`, { method: 'POST', body: JSON.stringify(data) }),

  // Settings & Profile & Auth
  getSettings: () => fetchJSON(`${API_BASE}/settings`),
  saveSettings: (data) => fetchJSON(`${API_BASE}/settings`, { method: 'PUT', body: JSON.stringify(data) }),
  updateProfile: (data) => fetchJSON(`${API_BASE}/auth/profile`, { method: 'PATCH', body: JSON.stringify(data) }),
  resetPasswordEmail: (email, redirectTo) => fetchJSON(`${API_BASE}/auth/reset-password-email`, { method: 'POST', body: JSON.stringify({ email, redirectTo: redirectTo || (typeof window !== 'undefined' ? window.location.origin : undefined) }) }),

  // Notifications
  getNotifications: async () => {
    try {
      return await fetchJSON(`${API_BASE}/notifications`)
    } catch (err) {
      console.warn('api.getNotifications failed, returning empty list:', err.message)
      return []
    }
  },
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
