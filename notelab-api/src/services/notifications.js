const supabase = require('./supabase');
const { readDB, writeDB, getUserSettings } = require('./database');

async function getNotifications(userId) {
  if (!userId) return [];
  let list = [];
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        list = data;
      }
    } catch (err) {
      console.error('Error fetching notifications from Supabase:', err.message);
    }
  }

  // Fallback / merge with local DB
  const db = readDB();
  const localList = (db.notifications || []).filter(n => n.user_id === userId);
  
  if (list.length === 0 && localList.length > 0) {
    list = localList.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  return list;
}

async function createNotification(userId, { type, title, message, movie_data }) {
  if (!userId) return null;
  const newNotif = {
    id: require('crypto').randomUUID(),
    user_id: userId,
    type,
    title,
    message: message || '',
    movie_data: movie_data || null,
    is_read: false,
    created_at: new Date().toISOString()
  };

  let savedNotif = newNotif;

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .insert([{
          user_id: userId,
          type,
          title,
          message: message || '',
          movie_data: movie_data || null,
          is_read: false
        }])
        .select()
        .single();

      if (!error && data) {
        savedNotif = data;
      }
    } catch (err) {
      console.error('Error inserting notification to Supabase:', err.message);
    }
  }

  // Always sync to local DB as well
  const db = readDB();
  if (!db.notifications) db.notifications = [];
  db.notifications.unshift(savedNotif);
  writeDB(db);

  return savedNotif;
}

async function markAsRead(userId, id) {
  if (!userId) return;
  if (supabase) {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id)
        .eq('user_id', userId);
    } catch (err) {
      console.error('Error marking notification as read in Supabase:', err.message);
    }
  }

  const db = readDB();
  if (db.notifications) {
    const item = db.notifications.find(n => n.id === id && n.user_id === userId);
    if (item) {
      item.is_read = true;
      writeDB(db);
    }
  }
}

async function markAllAsRead(userId) {
  if (!userId) return;
  if (supabase) {
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId);
    } catch (err) {
      console.error('Error marking all read in Supabase:', err.message);
    }
  }

  const db = readDB();
  if (db.notifications) {
    db.notifications.forEach(n => {
      if (n.user_id === userId) n.is_read = true;
    });
    writeDB(db);
  }
}

async function deleteNotification(userId, id) {
  if (!userId) return;
  if (supabase) {
    try {
      await supabase
        .from('notifications')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
    } catch (err) {
      console.error('Error deleting notification from Supabase:', err.message);
    }
  }

  const db = readDB();
  if (db.notifications) {
    db.notifications = db.notifications.filter(n => !(n.id === id && n.user_id === userId));
    writeDB(db);
  }
}

async function createReleaseAlert(userId, movie) {
  if (!userId) return null;
  const title = `${movie.title || 'Kino'} chiqdi!`;
  const message = `"${movie.title || 'Film'}" filmi endi 'To Do' bo'limida`;
  const movie_data = {
    tmdb_id: movie.tmdb_id || null,
    imdb_id: movie.imdb_id || null,
    title: movie.title,
    poster_path: movie.poster_path || null,
    rating: movie.rating || null,
    release_date: movie.release_date || null,
    genre: movie.genre || null
  };

  return createNotification(userId, {
    type: 'release_alert',
    title,
    message,
    movie_data
  });
}

// Genre ID mapping for TMDB (supports English and Uzbek terms)
const GENRE_MAP = {
  // English
  'action': 28, 'adventure': 12, 'animation': 16, 'comedy': 35,
  'crime': 80, 'documentary': 99, 'drama': 18, 'family': 10751,
  'fantasy': 14, 'history': 36, 'horror': 27, 'music': 10402,
  'mystery': 9648, 'romance': 10749, 'science fiction': 878, 'sci-fi': 878,
  'tv movie': 10770, 'thriller': 53, 'war': 10752, 'western': 37,

  // Uzbek
  'jangari': 28,
  'sarguzasht': 12,
  'animatsiya': 16, 'multfilm': 16,
  'komediya': 35,
  'kriminal': 80, 'jinoyat': 80,
  'hujjatli': 99,
  'drama': 18, 'dramatik': 18,
  'oila': 10751, 'oilaviy': 10751,
  'fantastika': 14,
  'tarixiy': 36, 'tarix': 36,
  "qo'rqinchli": 27, "qorqinchli": 27, 'daxshat': 27,
  'musiqiy': 10402, 'muzakl': 10402,
  'detektiv': 9648,
  'romantika': 10749, 'melodrama': 10749, 'ishqiy': 10749,
  'ilmiy-fantastik': 878, 'ilmiy fantastika': 878,
  'triller': 53,
  'harbiy': 10752, 'urush': 10752,
  'vestern': 37
};

async function generateRecommendations(userId) {
  if (!userId) return [];
  console.log(`\n=== [DEBUG RECOMMENDATIONS] Started for userId: ${userId} ===`);
  const db = readDB();
  const settings = getUserSettings(userId, db);
  const tmdbKey = settings.tmdb_key;

  if (!tmdbKey) {
    console.log('[DEBUG RECOMMENDATIONS] ERROR: TMDB API key is not configured in settings.');
    return [];
  }
  console.log('[DEBUG RECOMMENDATIONS] TMDB Key is present.');

  // Guard: If user already has unread recommendations, skip generating new ones!
  const unreadRecs = (db.notifications || []).filter(
    n => n.user_id === userId && !n.is_read && n.type === 'recommendation'
  );
  if (unreadRecs.length > 0) {
    console.log(`[DEBUG RECOMMENDATIONS] Skipping: user already has ${unreadRecs.length} unread recommendation notification(s).`);
    return [];
  }

  // Check last recommendation batch time (>24h)
  const lastBatchKey = `last_recommendation_${userId}`;
  const lastBatchStr = settings[lastBatchKey];
  console.log(`[DEBUG RECOMMENDATIONS] Last batch timestamp (${lastBatchKey}):`, lastBatchStr || 'None');

  if (lastBatchStr) {
    const lastBatchTime = new Date(lastBatchStr).getTime();
    const now = Date.now();
    const hoursPassed = (now - lastBatchTime) / (1000 * 60 * 60);
    console.log(`[DEBUG RECOMMENDATIONS] Hours passed since last batch: ${hoursPassed.toFixed(2)}h`);
    if (now - lastBatchTime < 24 * 60 * 60 * 1000) {
      console.log('[DEBUG RECOMMENDATIONS] Skipping: < 24h since last batch.');
      return [];
    }
  }

  // Get user preferences (favorite genres, era, etc.)
  let rawPreferences = null;
  let favoriteGenres = [];

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      console.log('[DEBUG RECOMMENDATIONS] Supabase user_preferences response:', data, error || 'No error');
      if (data) {
        rawPreferences = data;
        if (Array.isArray(data.favorite_genres)) {
          favoriteGenres = data.favorite_genres;
        } else if (typeof data.favorite_genres === 'string') {
          favoriteGenres = data.favorite_genres.split(',').map(s => s.trim()).filter(Boolean);
        }
      }
    } catch (err) {
      console.error('[DEBUG RECOMMENDATIONS] Error reading Supabase user preferences:', err.message);
    }
  }

  if (favoriteGenres.length === 0 && db.user_preferences) {
    let prefObj = null;
    if (Array.isArray(db.user_preferences)) {
      prefObj = db.user_preferences.find(p => p.id === userId || p.user_id === userId);
    } else if (typeof db.user_preferences === 'object') {
      prefObj = db.user_preferences[userId] || db.user_preferences;
    }

    if (prefObj && prefObj.favorite_genres) {
      rawPreferences = prefObj;
      const fg = prefObj.favorite_genres;
      console.log('[DEBUG RECOMMENDATIONS] Local DB user_preferences found:', prefObj);
      if (Array.isArray(fg)) {
        favoriteGenres = fg;
      } else if (typeof fg === 'string') {
        favoriteGenres = fg.split(',').map(s => s.trim()).filter(Boolean);
      }
    }
  }

  console.log('[DEBUG RECOMMENDATIONS] Extracted favorite_genres:', favoriteGenres);

  // Convert genre names or IDs to numeric TMDB genre IDs
  const genreIds = favoriteGenres.map(g => {
    if (typeof g === 'number') return g;
    if (typeof g === 'string') {
      const trimmed = g.trim().toLowerCase();
      if (/^\d+$/.test(trimmed)) return parseInt(trimmed, 10);
      if (GENRE_MAP[trimmed]) return GENRE_MAP[trimmed];
    }
    if (g && typeof g === 'object' && g.id) return Number(g.id);
    return null;
  }).filter(Boolean);

  console.log('[DEBUG RECOMMENDATIONS] Converted TMDB numeric genreIds:', genreIds);

  let discoverUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${encodeURIComponent(tmdbKey)}&sort_by=popularity.desc&vote_count.gte=50&language=en-US&page=1`;
  if (genreIds.length > 0) {
    discoverUrl += `&with_genres=${genreIds.join('|')}`;
  }

  if (rawPreferences?.era_preference) {
    const era = String(rawPreferences.era_preference).toLowerCase();
    if (era.includes('yangi') || era.includes('new')) {
      discoverUrl += '&primary_release_date.gte=2022-01-01';
    } else if (era.includes('eski') || era.includes('classic')) {
      discoverUrl += '&primary_release_date.lte=2005-01-01';
    }
  }

  console.log('[DEBUG RECOMMENDATIONS] Requesting TMDB Discover API:', discoverUrl.replace(tmdbKey, '***'));

  try {
    const res = await fetch(discoverUrl);
    console.log(`[DEBUG RECOMMENDATIONS] TMDB Discover response HTTP status: ${res.status}`);
    if (!res.ok) {
      const errText = await res.text();
      console.error('[DEBUG RECOMMENDATIONS] TMDB Discover response error body:', errText);
      return [];
    }

    const data = await res.json();
    const results = data.results || [];
    console.log(`[DEBUG RECOMMENDATIONS] TMDB returned ${results.length} movie result(s).`);

    // Filter existing user movies AND existing notifications
    const userMovies = (db.movies || []).filter(m => (m.user_id || DEFAULT_USER_ID) === userId);
    const userNotifications = (db.notifications || []).filter(n => n.user_id === userId);
    const existingTmdbIds = new Set([
      ...userMovies.map(m => m.tmdb_id).filter(Boolean),
      ...userNotifications.map(n => n.movie_data?.tmdb_id).filter(Boolean)
    ]);
    const existingTitles = new Set([
      ...userMovies.map(m => (m.title || '').toLowerCase().trim()),
      ...userNotifications.map(n => (n.movie_data?.title || n.title || '').toLowerCase().trim())
    ]);

    const candidates = results.filter(m => {
      if (existingTmdbIds.has(m.id)) return false;
      if (existingTitles.has((m.title || '').toLowerCase().trim())) return false;
      return true;
    }).slice(0, 4);

    console.log(`[DEBUG RECOMMENDATIONS] Filtered candidates to recommend: ${candidates.length}`);

    const createdNotifications = [];
    for (const item of candidates) {
      const posterPath = item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null;
      const releaseDate = item.release_date || null;
      const rating = item.vote_average ? Number(item.vote_average.toFixed(1)) : null;

      const movieData = {
        tmdb_id: item.id,
        title: item.title,
        poster_path: posterPath,
        rating,
        vote_count: item.vote_count || 0,
        release_date: releaseDate,
        media_type: 'movie',
        genre: item.genre_ids ? item.genre_ids.join(', ') : null
      };

      const notif = await createNotification(userId, {
        type: 'recommendation',
        title: `Tavsiya: ${item.title}`,
        message: item.overview ? (item.overview.length > 120 ? item.overview.slice(0, 120) + '...' : item.overview) : 'Siz yoqtirgan janrlar asosida tavsiya qilindi.',
        movie_data: movieData
      });

      if (notif) {
        console.log(`[DEBUG RECOMMENDATIONS] Notification created for "${item.title}" (id: ${notif.id})`);
        createdNotifications.push(notif);
      }
    }

    // Save timestamp of batch
    const freshDb = readDB();
    if (!freshDb.settings) freshDb.settings = {};
    freshDb.settings[lastBatchKey] = new Date().toISOString();
    writeDB(freshDb);
    console.log(`[DEBUG RECOMMENDATIONS] Saved new last_recommendation timestamp: ${freshDb.settings[lastBatchKey]}`);

    return createdNotifications;
  } catch (err) {
    console.error('[DEBUG RECOMMENDATIONS] Error generating recommendations:', err.stack || err.message);
    return [];
  }
}

module.exports = {
  getNotifications,
  createNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createReleaseAlert,
  generateRecommendations
};
