function getApiBase() {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && envUrl.trim() && !envUrl.includes('onrender')) {
    const clean = envUrl.trim().replace(/\/+$/, '');
    return (clean.startsWith('http://') || clean.startsWith('https://')) ? clean : '/api';
  }
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost' && window.location.port === '5173') {
    return 'http://localhost:3000/api';
  }
  return '/api';
}
const API_BASE = getApiBase();

function getUserHeader() {
  try {
    const lang = localStorage.getItem('language') === 'ru' ? 'ru-RU' : 'en-US'
    const headers = {
      'x-language': lang,
      'accept-language': lang
    }
    const saved = localStorage.getItem('notelab_user')
    if (saved) {
      const u = JSON.parse(saved)
      if (u && u.id) {
        headers['x-user-id'] = u.id
        headers['x-user-email'] = u.email || ''
        headers['x-user-first-name'] = u.first_name || ''
        headers['x-user-last-name'] = u.last_name || ''
      }
    }
    return headers
  } catch {}
  return { 'x-language': 'en-US' }
}

async function fetchJSON(url, options = {}) {
  const userHeader = getUserHeader()
  const controller = new AbortController()
  const timeoutMs = options.timeout || 20000
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...userHeader, ...options.headers },
      ...options
    });
    clearTimeout(timeoutId)

    const contentType = res.headers.get('content-type') || ''
    if (contentType.includes('text/html')) {
      const text = await res.text();
      throw new Error(`API endpoint returned HTML instead of JSON: ${url}`)
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status}: ${text}`);
    }
    return await res.json();
  } catch (err) {
    clearTimeout(timeoutId)
    if (err.name === 'AbortError') {
      throw new Error(`API request timed out after ${timeoutMs}ms: ${url}`)
    }
    throw err
  }
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
  createMovie: (data) => fetchJSON(`${API_BASE}/movies`, { method: 'POST', body: JSON.stringify(data) }),
  updateMovie: (id, data) => fetchJSON(`${API_BASE}/movies/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMovie: (id) => fetchJSON(`${API_BASE}/movies/${id}`, { method: 'DELETE' }),
  moveMovie: (id, section, position) => fetchJSON(`${API_BASE}/movies/move`, { method: 'POST', body: JSON.stringify({ id, section, position }) }),
  reorderMovies: (section, ids) => fetchJSON(`${API_BASE}/movies/reorder`, { method: 'POST', body: JSON.stringify({ section, ids }) }),
  refreshAllMovies: (params) => fetchJSON(`${API_BASE}/movies/refresh-all${params?.auto ? '?auto=true' : ''}`, { method: 'POST' }),

  // Content Search, Media Images, Watch Providers & Franchises
  searchContent: (type, query, lang) => fetchJSON(`${API_BASE}/content/search?type=${encodeURIComponent(type)}&query=${encodeURIComponent(query)}&language=${lang === 'ru' ? 'ru-RU' : 'en-US'}`),
  getMovieDetails: (tmdb_id, media_type, lang) => fetchJSON(`${API_BASE}/content/details?tmdb_id=${encodeURIComponent(tmdb_id)}&media_type=${encodeURIComponent(media_type || 'movie')}&language=${lang === 'ru' ? 'ru-RU' : 'en-US'}`),
  getMovieTranslations: (items, lang) => fetchJSON(`${API_BASE}/content/translations`, { method: 'POST', body: JSON.stringify({ items, language: lang === 'ru' ? 'ru-RU' : 'en-US' }) }),
  getMovieImages: (tmdb_id, media_type) => fetchJSON(`${API_BASE}/content/images?tmdb_id=${encodeURIComponent(tmdb_id)}&media_type=${encodeURIComponent(media_type || 'movie')}`),
  getMovieTrailer: (tmdb_id, media_type, title) => {
    const params = new URLSearchParams();
    if (tmdb_id) params.set('tmdb_id', tmdb_id);
    if (media_type) params.set('media_type', media_type);
    if (title) params.set('title', title);
    return fetchJSON(`${API_BASE}/content/trailer?${params.toString()}`, { timeout: 6000 }).catch(() => ({ trailer: null }));
  },
  getWatchProviders: (tmdb_id, media_type, country, title) => {
    const params = new URLSearchParams();
    if (tmdb_id) params.set('tmdb_id', tmdb_id);
    if (media_type) params.set('media_type', media_type);
    if (country) params.set('country', country);
    if (title) params.set('title', title);
    return fetchJSON(`${API_BASE}/content/watch-providers?${params.toString()}`, { timeout: 6000 });
  },
  getNearbyCinemas: (lat, lon, title, city, country) => {
    const params = new URLSearchParams();
    if (lat) params.set('lat', lat);
    if (lon) params.set('lon', lon);
    if (title) params.set('title', title);
    if (city) params.set('city', city);
    if (country) params.set('country', country);
    return fetchJSON(`${API_BASE}/content/nearby-cinemas?${params.toString()}`, { timeout: 8000 });
  },
  getFranchiseUniverse: (tmdb_id, media_type, lang) => {
    const params = new URLSearchParams()
    if (media_type) params.set('media_type', media_type)
    if (lang) params.set('language', lang === 'ru' ? 'ru-RU' : 'en-US')
    return fetchJSON(`${API_BASE}/franchises/${encodeURIComponent(tmdb_id)}${params.toString() ? `?${params.toString()}` : ''}`, { timeout: 15000 })
  },
  getViewedFranchises: () => fetchJSON(`${API_BASE}/franchises/viewed`),
  recordFranchiseView: (data) => fetchJSON(`${API_BASE}/franchises/record-view`, { method: 'POST', body: JSON.stringify(data) }),
  removeViewedFranchise: (key) => fetchJSON(`${API_BASE}/franchises/viewed`, { method: 'DELETE', body: JSON.stringify({ key }) }),

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
