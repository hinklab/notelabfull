const supabase = require('./supabase');
const { readDB, writeDB, getUserSettings, saveUserSettings } = require('./database');

// In-memory set for active in-flight deduplication keys to prevent race conditions during parallel calls
const activeDedupKeys = new Set();

async function getAllUserMovies(userId) {
  const db = readDB();
  const localMovies = (db.movies || []).filter(m => !userId || m.user_id === userId);

  let cloudMovies = [];
  if (supabase) {
    try {
      let query = supabase.from('movies').select('*');
      if (userId) query = query.eq('user_id', userId);
      const { data, error } = await query;
      if (!error && data) {
        cloudMovies = data;
      }
    } catch (err) {
      console.warn('Error fetching cloud movies for notification filtering:', err.message);
    }
  }

  // Merge unique by id
  const movieMap = new Map();
  for (const m of localMovies) movieMap.set(m.id, m);
  for (const m of cloudMovies) movieMap.set(m.id, m);
  return Array.from(movieMap.values());
}

async function deleteRecommendationForMovie(userId, { tmdb_id, imdb_id, title }) {
  if (!userId) return;
  const mTmdbId = tmdb_id ? String(tmdb_id) : null;
  const mImdbId = imdb_id ? String(imdb_id) : null;
  const mTitle = (title || '').toLowerCase().trim();

  if (supabase) {
    try {
      const { data: notifs } = await supabase.from('notifications').select('id, type, title, movie_data').eq('user_id', userId);
      const toDelete = (notifs || []).filter(n => {
        if (n.type !== 'recommendation') return false;
        const nTmdbId = n.movie_data?.tmdb_id ? String(n.movie_data.tmdb_id) : null;
        const nImdbId = n.movie_data?.imdb_id ? String(n.movie_data.imdb_id) : null;
        const nTitle = (n.movie_data?.title || n.title || '').toLowerCase().replace(/^tavsiya:\s*/i, '').trim();

        if (mTmdbId && nTmdbId && mTmdbId === nTmdbId) return true;
        if (mImdbId && nImdbId && mImdbId === nImdbId) return true;
        if (mTitle && nTitle && (mTitle === nTitle || mTitle.includes(nTitle) || nTitle.includes(mTitle))) return true;
        return false;
      });

      for (const n of toDelete) {
        await supabase.from('notifications').delete().eq('id', n.id);
        console.log(`[RECOMMENDATION CLEANUP] Deleted recommendation "${n.title}" because movie was added to board.`);
      }
    } catch (err) {
      console.warn('Error deleting recommendation on movie add from Supabase:', err.message);
    }
  }

  const db = readDB();
  if (db.notifications) {
    const beforeCount = db.notifications.length;
    db.notifications = db.notifications.filter(n => {
      if (n.type !== 'recommendation') return true;
      const nTmdbId = n.movie_data?.tmdb_id ? String(n.movie_data.tmdb_id) : null;
      const nImdbId = n.movie_data?.imdb_id ? String(n.movie_data.imdb_id) : null;
      const nTitle = (n.movie_data?.title || n.title || '').toLowerCase().replace(/^tavsiya:\s*/i, '').trim();

      if (mTmdbId && nTmdbId && mTmdbId === nTmdbId) return false;
      if (mImdbId && nImdbId && mImdbId === nImdbId) return false;
      if (mTitle && nTitle && (mTitle === nTitle || mTitle.includes(nTitle) || nTitle.includes(mTitle))) return false;
      return true;
    });
    if (db.notifications.length !== beforeCount) {
      writeDB(db);
    }
  }
}

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
  } else if (localList.length > 0) {
    const seenIds = new Set(list.map(n => n.id));
    for (const loc of localList) {
      if (!seenIds.has(loc.id)) {
        list.push(loc);
        seenIds.add(loc.id);
      }
    }
    list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  // Deduplicate list (keep newest unique notification for each movie/type/dedup_key)
  const seenKeys = new Set();
  const seenIds = new Set();
  const uniqueList = [];
  const duplicateIdsToDelete = [];

  for (const n of list) {
    if (seenIds.has(n.id)) {
      duplicateIdsToDelete.push(n.id);
      continue;
    }
    seenIds.add(n.id);

    const dedupKey = n.dedup_key || n.movie_data?.dedup_key;
    const mKey = dedupKey || `${n.type}_${n.movie_data?.tmdb_id || (n.movie_data?.title || n.title || '').toLowerCase().replace(/^tavsiya:\s*/i, '').trim()}`;
    if (seenKeys.has(mKey)) {
      duplicateIdsToDelete.push(n.id);
      continue;
    }
    seenKeys.add(mKey);
    uniqueList.push(n);
  }
  list = uniqueList;

  // Auto-filter: exclude any recommendation notification if the movie is ALREADY in user's movies list!
  try {
    const userMovies = await getAllUserMovies(userId);
    const existingTmdbIds = new Set(userMovies.map(m => m.tmdb_id ? String(m.tmdb_id) : null).filter(Boolean));
    const existingImdbIds = new Set(userMovies.map(m => m.imdb_id ? String(m.imdb_id) : null).filter(Boolean));
    const existingTitles = new Set(userMovies.map(m => (m.title || '').toLowerCase().trim()).filter(Boolean));

    list = list.filter(n => {
      if (n.type !== 'recommendation') return true;
      const nTmdbId = n.movie_data?.tmdb_id ? String(n.movie_data.tmdb_id) : null;
      const nImdbId = n.movie_data?.imdb_id ? String(n.movie_data.imdb_id) : null;
      const rawTitle = (n.movie_data?.title || n.title || '').toLowerCase().replace(/^tavsiya:\s*/i, '').trim();

      if (nTmdbId && existingTmdbIds.has(nTmdbId)) {
        duplicateIdsToDelete.push(n.id);
        return false;
      }
      if (nImdbId && existingImdbIds.has(nImdbId)) {
        duplicateIdsToDelete.push(n.id);
        return false;
      }
      if (rawTitle && existingTitles.has(rawTitle)) {
        duplicateIdsToDelete.push(n.id);
        return false;
      }
      for (const t of existingTitles) {
        if (t && t.length > 3 && (rawTitle === t || rawTitle.includes(t) || t.includes(rawTitle))) {
          duplicateIdsToDelete.push(n.id);
          return false;
        }
      }

      return true;
    });

    // Cleanup detected duplicates or added movies from DB asynchronously
    if (duplicateIdsToDelete.length > 0) {
      setImmediate(async () => {
        try {
          if (supabase) {
            for (const dId of duplicateIdsToDelete) {
              await supabase.from('notifications').delete().eq('id', dId).catch(() => {});
            }
          }
          const freshDb = readDB();
          if (freshDb.notifications) {
            const delSet = new Set(duplicateIdsToDelete);
            freshDb.notifications = freshDb.notifications.filter(n => !delSet.has(n.id));
            writeDB(freshDb);
          }
        } catch (_) {}
      });
    }
  } catch (filterErr) {
    console.warn('Error filtering notifications against added movies:', filterErr.message);
  }

  return list;
}

async function createNotification(userId, { type, title, message, movie_data, dedup_key }) {
  if (!userId) return null;

  // 1. Calculate deterministic dedup_key if not explicitly provided
  const tmdbId = movie_data?.tmdb_id ? String(movie_data.tmdb_id) : (movie_data?.id ? String(movie_data.id) : null);
  const eventType = movie_data?.event_type || type;
  const eventValue = movie_data?.event_value || movie_data?.season_number || movie_data?.release_date || (movie_data?.title || title || '').toLowerCase().trim();
  
  const finalDedupKey = dedup_key || movie_data?.dedup_key || `${userId}_${tmdbId || 'generic'}_${eventType}_${eventValue}`;

  // 2. Concurrency guard: in-memory check for in-flight creations
  if (activeDedupKeys.has(finalDedupKey)) {
    console.log(`[DEDUP_GUARD] In-flight collision prevented: "${finalDedupKey}"`);
    return null;
  }
  activeDedupKeys.add(finalDedupKey);
  setTimeout(() => activeDedupKeys.delete(finalDedupKey), 60000);

  // 3. Check Local Database for duplicate dedup_key
  const db = readDB();
  const localExists = (db.notifications || []).some(n =>
    n.user_id === userId && (n.dedup_key === finalDedupKey || n.movie_data?.dedup_key === finalDedupKey)
  );
  if (localExists) {
    console.log(`[DEDUP_GUARD] Local duplicate skipped: "${finalDedupKey}"`);
    return null;
  }

  // 4. Check Supabase for duplicate dedup_key using JSONB query
  if (supabase) {
    try {
      const { data: cloudExisting } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', userId)
        .contains('movie_data', { dedup_key: finalDedupKey })
        .limit(1);

      if (cloudExisting && cloudExisting.length > 0) {
        console.log(`[DEDUP_GUARD] Supabase duplicate skipped: "${finalDedupKey}"`);
        return null;
      }
    } catch (err) {
      console.warn('Supabase dedup_key check warning:', err.message);
    }
  }

  // 5. Guard for recommendations: skip if movie already in user's library
  if (type === 'recommendation') {
    const userMovies = await getAllUserMovies(userId);
    const mTitle = (movie_data?.title || title || '').toLowerCase().trim();
    const isAlreadyAdded = userMovies.some(m => {
      if (tmdbId && m.tmdb_id && String(m.tmdb_id) === tmdbId) return true;
      if (movie_data?.imdb_id && m.imdb_id && String(m.imdb_id) === String(movie_data.imdb_id)) return true;
      if (mTitle) {
        const boardTitle = (m.title || '').toLowerCase().trim();
        const recTitle = mTitle.replace(/^tavsiya:\s*/i, '').trim();
        if (boardTitle && (boardTitle === recTitle || boardTitle.includes(recTitle) || recTitle.includes(boardTitle))) return true;
      }
      return false;
    });

    if (isAlreadyAdded) {
      console.log(`[CREATE NOTIFICATION] Skipped recommendation because movie "${title}" is already in user library.`);
      return null;
    }
  }

  // Prepare payload with embedded dedup_key
  const moviePayload = {
    ...(movie_data || {}),
    dedup_key: finalDedupKey,
    event_type: eventType,
    event_value: eventValue
  };

  // Map supabase-compatible type ('recommendation' or 'release_alert')
  const supabaseType = (type === 'recommendation') ? 'recommendation' : 'release_alert';

  const newNotif = {
    id: require('crypto').randomUUID(),
    user_id: userId,
    type: supabaseType,
    title,
    message: message || '',
    movie_data: moviePayload,
    dedup_key: finalDedupKey,
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
          type: supabaseType,
          title,
          message: message || '',
          movie_data: moviePayload,
          is_read: false
        }])
        .select()
        .single();

      if (!error && data) {
        savedNotif = { ...data, dedup_key: finalDedupKey };
      }
    } catch (err) {
      console.error('Error inserting notification to Supabase:', err.message);
    }
  }

  // Always sync to local DB as well
  const freshDb = readDB();
  if (!freshDb.notifications) freshDb.notifications = [];
  freshDb.notifications.unshift(savedNotif);
  writeDB(freshDb);

  console.log(`✅ [NOTIFICATION CREATED] Type=${eventType}, Key="${finalDedupKey}", Title="${title}"`);
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

  const db = readDB();
  const notif = (db.notifications || []).find(n => n.id === id && n.user_id === userId);

  if (notif) {
    const settings = getUserSettings(userId, db);
    const ignoredKey = `ignored_recs_${userId}`;
    const ignoredList = settings[ignoredKey] || [];

    const movieTmdbId = notif.movie_data?.tmdb_id;
    const movieTitle = notif.movie_data?.title || notif.title;

    if (movieTmdbId) ignoredList.push(movieTmdbId);
    if (movieTitle) ignoredList.push(movieTitle.toLowerCase().trim());

    saveUserSettings(userId, { [ignoredKey]: Array.from(new Set(ignoredList)) }, db);
  }

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

  if (db.notifications) {
    db.notifications = db.notifications.filter(n => !(n.id === id && n.user_id === userId));
    writeDB(db);
  }
}

// Legacy helper
async function createReleaseAlert(userId, movie) {
  if (!userId || !movie) return null;
  const todayIso = new Date().toISOString().slice(0, 10);
  const tmdbId = movie.tmdb_id || movie.id;
  const dedupKey = `${userId}_${tmdbId}_premiere_${movie.release_date || todayIso}`;

  const title = `🎬 Premyera kuni keldi: ${movie.title || 'Film'}`;
  const message = `"${movie.title || 'Film'}" filmining premyerasi bugun! Uni tomosha qilish uchun "To Do" bo'limiga o'tkazing.`;
  const movie_data = {
    movie_id: movie.id,
    tmdb_id: movie.tmdb_id || null,
    imdb_id: movie.imdb_id || null,
    title: movie.title,
    poster_path: movie.poster_path || null,
    rating: movie.rating || null,
    release_date: movie.release_date || todayIso,
    genre: movie.genre || null,
    media_type: movie.media_type || 'movie',
    event_type: 'premiere_alert',
    event_value: movie.release_date || todayIso,
    dedup_key: dedupKey
  };

  return createNotification(userId, {
    type: 'release_alert',
    title,
    message,
    movie_data,
    dedup_key: dedupKey
  });
}

// TUR 1 — "Premyera kuni keldi"
async function generatePremiereAlerts(userId) {
  if (!userId) return [];
  const userMovies = await getAllUserMovies(userId);
  const todayIso = new Date().toISOString().slice(0, 10);

  // Find all items in 'futured' whose release_date equals today (or <= today)
  const futuredEligible = userMovies.filter(m => 
    m.section === 'futured' && 
    m.release_date && 
    m.release_date <= todayIso
  );

  if (futuredEligible.length === 0) return [];

  const created = [];
  for (const movie of futuredEligible) {
    const tmdbId = movie.tmdb_id || movie.id;
    const dedupKey = `${userId}_${tmdbId}_premiere_${movie.release_date}`;
    const title = `🎬 Premyera kuni keldi: ${movie.title}`;
    const message = `"${movie.title}" filmining rasmiy premyerasi bugun (${movie.release_date})! Uni tomosha qilish uchun "To Do" bo'limiga o'tkazing.`;
    
    const notif = await createNotification(userId, {
      type: 'release_alert',
      title,
      message,
      movie_data: {
        movie_id: movie.id,
        tmdb_id: movie.tmdb_id || null,
        imdb_id: movie.imdb_id || null,
        title: movie.title,
        poster_path: movie.poster_path || null,
        rating: movie.rating || null,
        release_date: movie.release_date,
        genre: movie.genre || null,
        media_type: movie.media_type || 'movie',
        event_type: 'premiere_alert',
        event_value: movie.release_date,
        dedup_key: dedupKey
      },
      dedup_key: dedupKey
    });

    if (notif) created.push(notif);
  }

  return created;
}

// TUR 2 — "Yangi mavsum chiqdi" (Every 24 hours per user)
async function generateNewSeasonAlerts(userId, force = false) {
  if (!userId) return [];
  const db = readDB();
  const settings = getUserSettings(userId, db);
  const tmdbKey = settings.tmdb_key;
  if (!tmdbKey) return [];

  const lastCheckKey = `last_season_check_${userId}`;
  const lastCheckStr = settings[lastCheckKey];
  const now = Date.now();

  // 24 hours cooldown check (unless force is true)
  if (!force && lastCheckStr) {
    const lastCheckTime = new Date(lastCheckStr).getTime();
    if (now - lastCheckTime < 24 * 60 * 60 * 1000) {
      return [];
    }
  }

  const userMovies = await getAllUserMovies(userId);
  const tvSeries = userMovies.filter(m => m.media_type === 'tv' && m.tmdb_id);
  if (tvSeries.length === 0) return [];

  // Group user's TV cards by tmdb_id to calculate current max season tracked
  const seriesByTmdb = new Map();
  for (const item of tvSeries) {
    const tid = String(item.tmdb_id);
    if (!seriesByTmdb.has(tid)) seriesByTmdb.set(tid, []);
    seriesByTmdb.get(tid).push(item);
  }

  const created = [];
  const todayIso = new Date().toISOString().slice(0, 10);

  for (const [tid, cards] of seriesByTmdb.entries()) {
    try {
      // Find highest season number the user already has on board
      const userSeasons = new Set();
      for (const c of cards) {
        if (c.current_season) userSeasons.add(Number(c.current_season));
        if (c.season_number) userSeasons.add(Number(c.season_number));
        if (c.seasons) {
          const nums = String(c.seasons).match(/\d+/g);
          if (nums) nums.forEach(n => userSeasons.add(Number(n)));
        }
        const titleSeasonMatch = (c.title || '').match(/(?:season|sezon|mavsum|fasl)\s*(\d+)/i) || (c.title || '').match(/(\d+)\s*-(?:mavsum|fasl|sezon)/i);
        if (titleSeasonMatch) {
          userSeasons.add(Number(titleSeasonMatch[1]));
        }
      }
      if (userSeasons.size === 0) userSeasons.add(1);
      const maxUserSeason = Math.max(...Array.from(userSeasons));

      // Fetch TMDB TV details
      const tvUrl = `https://api.themoviedb.org/3/tv/${encodeURIComponent(tid)}?api_key=${encodeURIComponent(tmdbKey)}&language=en-US`;
      const res = await fetch(tvUrl, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) continue;

      const tvData = await res.json();
      const tmdbSeasons = tvData.seasons || [];

      // Filter seasons where season_number > maxUserSeason and air_date exists
      const newSeasons = tmdbSeasons.filter(s => {
        if (!s || s.season_number <= 0) return false; // skip specials
        if (s.season_number <= maxUserSeason) return false;
        if (!s.air_date) return false;
        return true;
      });

      const mainCard = cards[0];
      const baseTitle = (mainCard.title || tvData.name || 'Serial').replace(/\s*-\s*(?:season|sezon|mavsum|fasl|\d+-mavsum).*$/i, '').trim();

      for (const s of newSeasons) {
        const seasonCode = `S${String(s.season_number).padStart(2, '0')}`;
        const dedupKey = `${userId}_${tid}_new_season_${seasonCode}`;
        const seasonTitle = `${baseTitle} - ${s.season_number}-mavsum`;
        const posterPath = s.poster_path ? `https://image.tmdb.org/t/p/w500${s.poster_path}` : mainCard.poster_path;

        const notif = await createNotification(userId, {
          type: 'release_alert',
          title: `📺 Yangi mavsum chiqdi: ${baseTitle} (${s.season_number}-mavsum)`,
          message: `"${baseTitle}" serialining yangi ${s.season_number}-mavsumi (${s.name || s.season_number + '-mavsum'}) chiqdi! ${s.episode_count ? s.episode_count + ' ta qism.' : ''} Uni rejalaringizga qo'shing.`,
          movie_data: {
            movie_id: mainCard.id,
            tmdb_id: Number(tid),
            imdb_id: mainCard.imdb_id || null,
            title: baseTitle,
            season_title: seasonTitle,
            season_number: s.season_number,
            episode_count: s.episode_count || 0,
            poster_path: posterPath,
            rating: tvData.vote_average ? Number(tvData.vote_average.toFixed(1)) : mainCard.rating,
            release_date: s.air_date || null,
            media_type: 'tv',
            genre: mainCard.genre || (tvData.genres ? tvData.genres.map(g => g.name).join(', ') : null),
            event_type: 'new_season_alert',
            event_value: seasonCode,
            dedup_key: dedupKey
          },
          dedup_key: dedupKey
        });

        if (notif) created.push(notif);
      }
    } catch (err) {
      console.warn(`[NEW SEASON ALERT] Error for TV tmdb_id=${tid}:`, err.message);
    }
  }

  // Update last check timestamp
  const freshDb = readDB();
  if (!freshDb.settings) freshDb.settings = {};
  freshDb.settings[lastCheckKey] = new Date().toISOString();
  writeDB(freshDb);

  return created;
}

// Genre ID mapping for TMDB
const GENRE_MAP = {
  'action': 28, 'adventure': 12, 'animation': 16, 'comedy': 35,
  'crime': 80, 'documentary': 99, 'drama': 18, 'family': 10751,
  'fantasy': 14, 'history': 36, 'horror': 27, 'music': 10402,
  'mystery': 9648, 'romance': 10749, 'science fiction': 878, 'sci-fi': 878,
  'tv movie': 10770, 'thriller': 53, 'war': 10752, 'western': 37,
  'jangari': 28, 'sarguzasht': 12, 'animatsiya': 16, 'multfilm': 16,
  'komediya': 35, 'kriminal': 80, 'jinoyat': 80, 'hujjatli': 99,
  'drama': 18, 'dramatik': 18, 'oila': 10751, 'oilaviy': 10751,
  'fantastika': 14, 'tarixiy': 36, 'tarix': 36, "qo'rqinchli": 27,
  'musiqiy': 10402, 'muzakl': 10402, 'detektiv': 9648, 'romantika': 10749,
  'ilmiy-fantastik': 878, 'triller': 53, 'harbiy': 10752, 'vestern': 37
};

async function generateRecommendations(userId) {
  if (!userId) return [];
  const db = readDB();
  const settings = getUserSettings(userId, db);
  const tmdbKey = settings.tmdb_key;
  if (!tmdbKey) return [];

  // Guard: If user already has unread recommendations, skip generating new ones
  const unreadRecs = (db.notifications || []).filter(
    n => n.user_id === userId && !n.is_read && (n.type === 'recommendation' || n.movie_data?.event_type === 'recommendation')
  );
  if (unreadRecs.length > 0) return [];

  // 48 hours frequency guard
  const lastBatchKey = `last_recommendation_${userId}`;
  const lastBatchStr = settings[lastBatchKey];
  if (lastBatchStr) {
    const lastBatchTime = new Date(lastBatchStr).getTime();
    if (Date.now() - lastBatchTime < 48 * 60 * 60 * 1000) {
      return [];
    }
  }

  let favoriteGenres = [];
  let rawPreferences = null;

  if (supabase) {
    try {
      const { data } = await supabase.from('user_preferences').select('*').eq('id', userId).maybeSingle();
      if (data) {
        rawPreferences = data;
        if (Array.isArray(data.favorite_genres)) favoriteGenres = data.favorite_genres;
        else if (typeof data.favorite_genres === 'string') favoriteGenres = data.favorite_genres.split(',').map(s => s.trim()).filter(Boolean);
      }
    } catch (_) {}
  }

  if (favoriteGenres.length === 0 && db.user_preferences) {
    let prefObj = Array.isArray(db.user_preferences) ? db.user_preferences.find(p => p.id === userId || p.user_id === userId) : db.user_preferences[userId] || db.user_preferences;
    if (prefObj && prefObj.favorite_genres) {
      rawPreferences = prefObj;
      if (Array.isArray(prefObj.favorite_genres)) favoriteGenres = prefObj.favorite_genres;
      else if (typeof prefObj.favorite_genres === 'string') favoriteGenres = prefObj.favorite_genres.split(',').map(s => s.trim()).filter(Boolean);
    }
  }

  const genreIds = favoriteGenres.map(g => {
    if (typeof g === 'number') return g;
    if (typeof g === 'string') {
      const trimmed = g.trim().toLowerCase();
      if (/^\d+$/.test(trimmed)) return parseInt(trimmed, 10);
      if (GENRE_MAP[trimmed]) return GENRE_MAP[trimmed];
    }
    return null;
  }).filter(Boolean);

  let discoverUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${encodeURIComponent(tmdbKey)}&sort_by=popularity.desc&vote_count.gte=50&language=en-US&page=1`;
  if (genreIds.length > 0) {
    discoverUrl += `&with_genres=${genreIds.join('|')}`;
  }

  try {
    const res = await fetch(discoverUrl);
    if (!res.ok) return [];
    const data = await res.json();
    const results = data.results || [];

    const userMovies = await getAllUserMovies(userId);
    const existingTmdbIds = new Set(userMovies.map(m => m.tmdb_id ? String(m.tmdb_id) : null).filter(Boolean));
    const existingTitles = new Set(userMovies.map(m => (m.title || '').toLowerCase().trim()).filter(Boolean));

    const candidates = results.filter(m => {
      const mTmdbId = m.id ? String(m.id) : null;
      const mTitle = (m.title || m.original_title || '').toLowerCase().trim();
      if (mTmdbId && existingTmdbIds.has(mTmdbId)) return false;
      if (mTitle && existingTitles.has(mTitle)) return false;
      return true;
    }).slice(0, 3);

    const createdNotifications = [];
    for (const item of candidates) {
      const posterPath = item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null;
      const releaseDate = item.release_date || null;
      const rating = item.vote_average ? Number(item.vote_average.toFixed(1)) : null;
      const dedupKey = `${userId}_${item.id}_recommendation_batch`;

      const notif = await createNotification(userId, {
        type: 'recommendation',
        title: `Tavsiya: ${item.title}`,
        message: item.overview ? (item.overview.length > 120 ? item.overview.slice(0, 120) + '...' : item.overview) : 'Siz yoqtirgan janrlar asosida tavsiya qilindi.',
        movie_data: {
          tmdb_id: item.id,
          title: item.title,
          poster_path: posterPath,
          rating,
          vote_count: item.vote_count || 0,
          release_date: releaseDate,
          media_type: 'movie',
          genre: item.genre_ids ? item.genre_ids.join(', ') : null,
          event_type: 'recommendation',
          event_value: 'rec',
          dedup_key: dedupKey
        },
        dedup_key: dedupKey
      });

      if (notif) createdNotifications.push(notif);
    }

    const freshDb = readDB();
    if (!freshDb.settings) freshDb.settings = {};
    freshDb.settings[lastBatchKey] = new Date().toISOString();
    writeDB(freshDb);

    return createdNotifications;
  } catch (err) {
    console.warn('[RECOMMENDATIONS] Error:', err.message);
    return [];
  }
}

async function generateTrailerAlerts(userId) {
  if (!userId) return [];
  const db = readDB();
  const settings = getUserSettings(userId, db);
  const tmdbKey = settings.tmdb_key;
  if (!tmdbKey) return [];

  const userMovies = await getAllUserMovies(userId);
  const futuredMovies = userMovies.filter(m => m.section === 'futured' && m.tmdb_id);
  if (futuredMovies.length === 0) return [];

  const created = [];
  for (const movie of futuredMovies) {
    const mId = String(movie.tmdb_id);
    try {
      const isTv = movie.media_type === 'tv';
      const videoUrl = isTv
        ? `https://api.themoviedb.org/3/tv/${encodeURIComponent(mId)}/videos?api_key=${encodeURIComponent(tmdbKey)}&language=en-US`
        : `https://api.themoviedb.org/3/movie/${encodeURIComponent(mId)}/videos?api_key=${encodeURIComponent(tmdbKey)}&language=en-US`;

      const res = await fetch(videoUrl, { signal: AbortSignal.timeout(3000) });
      if (!res.ok) continue;
      const data = await res.json();
      const videos = data.results || [];
      const trailer = videos.find(v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser'));

      if (trailer) {
        const dedupKey = `${userId}_${mId}_trailer_${trailer.key}`;
        const notif = await createNotification(userId, {
          type: 'release_alert',
          title: `🎬 Treyler chiqdi: ${movie.title}`,
          message: `"${movie.title}" filmining rasmiy ${trailer.type === 'Teaser' ? 'tizeri' : 'treyleri'} taqdim etildi. Tomosha qiling!`,
          movie_data: {
            ...movie,
            video_key: trailer.key,
            video_name: trailer.name,
            event_type: 'trailer_alert',
            event_value: trailer.key,
            dedup_key: dedupKey
          },
          dedup_key: dedupKey
        });
        if (notif) created.push(notif);
      }
    } catch (e) {
      console.warn(`[TRAILER ALERT] Error for "${movie.title}":`, e.message);
    }
  }

  return created;
}

async function generateBoxOfficeAlerts(userId) {
  if (!userId) return [];
  const db = readDB();
  const settings = getUserSettings(userId, db);
  const tmdbKey = settings.tmdb_key;
  if (!tmdbKey) return [];

  const userMovies = await getAllUserMovies(userId);
  const now = Date.now();
  const created = [];

  for (const movie of userMovies) {
    if (!movie.release_date || !movie.tmdb_id) continue;
    const relTime = new Date(movie.release_date).getTime();
    if (isNaN(relTime)) continue;

    const daysSinceRelease = Math.floor((now - relTime) / (1000 * 60 * 60 * 24));
    if (daysSinceRelease < 7 || daysSinceRelease > 30) continue;

    const weekNum = Math.floor(daysSinceRelease / 7);
    const mId = String(movie.tmdb_id);
    const dedupKey = `${userId}_${mId}_boxoffice_w${weekNum}`;

    try {
      const detailUrl = `https://api.themoviedb.org/3/movie/${encodeURIComponent(mId)}?api_key=${encodeURIComponent(tmdbKey)}&language=en-US`;
      const res = await fetch(detailUrl, { signal: AbortSignal.timeout(3000) });
      if (!res.ok) continue;
      const detail = await res.json();

      let revenueText = '';
      if (detail.revenue && detail.revenue > 0) {
        const revM = (detail.revenue / 1000000).toFixed(1);
        revenueText = `$${revM} mln`;
      } else if (detail.popularity) {
        revenueText = `mashhurlik reytingi ${Math.round(detail.popularity)}`;
      }

      if (revenueText) {
        const notif = await createNotification(userId, {
          type: 'release_alert',
          title: `💰 Kassa yig'imi (${weekNum}-hafta): ${movie.title}`,
          message: `"${movie.title}" filmining ${weekNum}-haftalik kassa yig'imi ${revenueText} ko'rsatkichiga yetdi!`,
          movie_data: {
            ...movie,
            week_num: weekNum,
            revenue: detail.revenue || null,
            event_type: 'box_office_alert',
            event_value: `w${weekNum}`,
            dedup_key: dedupKey
          },
          dedup_key: dedupKey
        });
        if (notif) created.push(notif);
      }
    } catch (e) {
      console.warn(`[BOX OFFICE ALERT] Error for "${movie.title}":`, e.message);
    }
  }

  return created;
}

async function generateEpisodeAlerts(userId) {
  if (!userId) return [];
  const db = readDB();
  const settings = getUserSettings(userId, db);
  const tmdbKey = settings.tmdb_key;
  if (!tmdbKey) return [];

  const userMovies = await getAllUserMovies(userId);
  const tvSeries = userMovies.filter(m => m.media_type === 'tv' && m.tmdb_id);
  if (tvSeries.length === 0) return [];

  const now = Date.now();
  const created = [];

  for (const series of tvSeries) {
    const sId = String(series.tmdb_id);
    try {
      const tvUrl = `https://api.themoviedb.org/3/tv/${encodeURIComponent(sId)}?api_key=${encodeURIComponent(tmdbKey)}&language=en-US`;
      const res = await fetch(tvUrl, { signal: AbortSignal.timeout(3000) });
      if (!res.ok) continue;
      const detail = await res.json();

      const lastEp = detail.last_episode_to_air;
      if (!lastEp || !lastEp.air_date) continue;

      const airTime = new Date(lastEp.air_date).getTime();
      const daysAgo = (now - airTime) / (1000 * 60 * 60 * 24);

      if (daysAgo >= 0 && daysAgo <= 4) {
        const epKey = `S${lastEp.season_number}E${lastEp.episode_number}`;
        const dedupKey = `${userId}_${sId}_episode_${epKey}`;

        const notif = await createNotification(userId, {
          type: 'release_alert',
          title: `📺 Yangi epizod: ${series.title}`,
          message: `"${series.title}" serialining yangi ${lastEp.season_number}-fasl ${lastEp.episode_number}-qismi ("${lastEp.name || 'Yangi epizod'}") efirga uzatildi!`,
          movie_data: {
            ...series,
            ep_key: epKey,
            season_number: lastEp.season_number,
            episode_number: lastEp.episode_number,
            episode_name: lastEp.name,
            event_type: 'episode_alert',
            event_value: epKey,
            dedup_key: dedupKey
          },
          dedup_key: dedupKey
        });
        if (notif) created.push(notif);
      }
    } catch (e) {
      console.warn(`[EPISODE ALERT] Error for "${series.title}":`, e.message);
    }
  }

  return created;
}

const lastSmartCheckByUser = new Map();
let isSmartRunning = false;

// Master Smart Notification Runner
async function generateSmartNotifications(userId) {
  if (!userId) return [];
  const now = Date.now();
  const lastTime = lastSmartCheckByUser.get(userId) || 0;
  if (now - lastTime < 10 * 60 * 1000 || isSmartRunning) {
    return [];
  }
  isSmartRunning = true;
  lastSmartCheckByUser.set(userId, now);

  try {
    const premieres = await generatePremiereAlerts(userId).catch(() => []);
    const seasons = await generateNewSeasonAlerts(userId).catch(() => []);
    const recs = await generateRecommendations(userId).catch(() => []);
    const trailers = await generateTrailerAlerts(userId).catch(() => []);
    const boxOffice = await generateBoxOfficeAlerts(userId).catch(() => []);
    const episodes = await generateEpisodeAlerts(userId).catch(() => []);
    return [...premieres, ...seasons, ...recs, ...trailers, ...boxOffice, ...episodes];
  } finally {
    isSmartRunning = false;
  }
}

module.exports = {
  getNotifications,
  createNotification,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteRecommendationForMovie,
  createReleaseAlert,
  generatePremiereAlerts,
  generateNewSeasonAlerts,
  generateRecommendations,
  generateTrailerAlerts,
  generateBoxOfficeAlerts,
  generateEpisodeAlerts,
  generateSmartNotifications
};
