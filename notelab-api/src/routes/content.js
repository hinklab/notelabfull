const express = require('express');
const router = express.Router();
const { readDB, getUserSettings } = require('../services/database');

// GET /api/content/search?type=movie&query=Qasoskorlar
router.get('/search', async (req, res) => {
  try {
    const rawQuery = req.query.query;
    if (!rawQuery || !rawQuery.trim()) {
      return res.json([]);
    }

    const query = rawQuery.trim();
    const db = readDB();
    const settings = getUserSettings(req.userId, db);
    const tmdbKey = settings.tmdb_key;
    const omdbKey = settings.omdb_key;

    const results = [];

    // 1. Try Multi-lingual TMDB Search pipeline if tmdb_key is available
    if (tmdbKey) {
      try {
        const urlEn = `https://api.themoviedb.org/3/search/multi?api_key=${encodeURIComponent(tmdbKey)}&query=${encodeURIComponent(query)}&language=en-US&page=1`;
        const urlRu = `https://api.themoviedb.org/3/search/multi?api_key=${encodeURIComponent(tmdbKey)}&query=${encodeURIComponent(query)}&language=ru-RU&page=1`;
        const urlDefault = `https://api.themoviedb.org/3/search/multi?api_key=${encodeURIComponent(tmdbKey)}&query=${encodeURIComponent(query)}&page=1`;

        const [resEn, resRu, resDef] = await Promise.all([
          fetch(urlEn).then(r => r.ok ? r.json() : {}).catch(() => ({})),
          fetch(urlRu).then(r => r.ok ? r.json() : {}).catch(() => ({})),
          fetch(urlDefault).then(r => r.ok ? r.json() : {}).catch(() => ({}))
        ]);

        const itemsMap = new Map();

        // 1A. Process English search results
        (resEn.results || []).forEach((item, index) => {
          if (item.media_type !== 'movie' && item.media_type !== 'tv') return;
          const key = `${item.media_type}_${item.id}`;
          itemsMap.set(key, {
            item,
            enTitle: item.title || item.name,
            score: (100 - index) + (item.popularity || 0)
          });
        });

        // 1B. Process Russian search results (catches Cyrillic/Russian/translated titles)
        const needEnTitles = [];
        (resRu.results || []).forEach((item, index) => {
          if (item.media_type !== 'movie' && item.media_type !== 'tv') return;
          const key = `${item.media_type}_${item.id}`;
          if (itemsMap.has(key)) {
            const existing = itemsMap.get(key);
            existing.score += 50; // Matched in multiple language queries!
          } else {
            itemsMap.set(key, {
              item,
              enTitle: null,
              score: (80 - index) + (item.popularity || 0)
            });
            needEnTitles.push({ key, id: item.id, media_type: item.media_type });
          }
        });

        // 1C. Process default/unfiltered search results (catches any global localized titles)
        (resDef.results || []).forEach((item, index) => {
          if (item.media_type !== 'movie' && item.media_type !== 'tv') return;
          const key = `${item.media_type}_${item.id}`;
          if (itemsMap.has(key)) {
            const existing = itemsMap.get(key);
            existing.score += 20;
          } else {
            itemsMap.set(key, {
              item,
              enTitle: null,
              score: (60 - index) + (item.popularity || 0)
            });
            needEnTitles.push({ key, id: item.id, media_type: item.media_type });
          }
        });

        // 1D. Fetch official English titles for any items discovered via non-English queries
        if (needEnTitles.length > 0) {
          await Promise.all(needEnTitles.slice(0, 15).map(async ({ key, id, media_type }) => {
            try {
              const detailUrl = `https://api.themoviedb.org/3/${media_type}/${id}?api_key=${encodeURIComponent(tmdbKey)}&language=en-US`;
              const dRes = await fetch(detailUrl);
              if (dRes.ok) {
                const d = await dRes.json();
                const existing = itemsMap.get(key);
                if (existing && d) {
                  existing.enTitle = d.title || d.name || d.original_title || d.original_name;
                  if (d.overview) existing.item.overview = d.overview;
                }
              }
            } catch (err) {
              console.warn(`Failed fetching English title for ${key}:`, err.message);
            }
          }));
        }

        // Sort items by composite relevance score
        const sorted = Array.from(itemsMap.values())
          .sort((a, b) => b.score - a.score)
          .slice(0, 15);

        for (const { item, enTitle } of sorted) {
          const isMovie = item.media_type === 'movie';
          const title = enTitle || item.title || item.name || item.original_title || item.original_name || query;
          const releaseDate = item.release_date || item.first_air_date || null;
          const releaseYear = releaseDate ? releaseDate.split('-')[0] : (item.year || '-');
          const rating = item.vote_average ? Number(item.vote_average.toFixed(1)) : null;
          const posterPath = item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null;
          const overview = item.overview || '';

          results.push({
            title,
            release_date: releaseDate,
            release_year: releaseYear,
            year: releaseYear,
            rating,
            vote_count: item.vote_count || 0,
            poster_path: posterPath,
            cover_url: posterPath,
            overview,
            tmdb_id: item.id,
            imdb_id: null,
            media_type: item.media_type,
            subtitle: [releaseYear, rating ? `⭐ ${rating}` : null, isMovie ? 'Movie' : 'TV Series'].filter(Boolean).join(' · '),
            note: overview,
          });
        }
      } catch (err) {
        console.error('Multi-lingual TMDB Search Error:', err.message);
      }
    }

    // 2. Try OMDB Search if omdb_key is available and results are empty
    if (omdbKey && results.length === 0) {
      try {
        const omdbUrl = `http://www.omdbapi.com/?apikey=${encodeURIComponent(omdbKey)}&s=${encodeURIComponent(query)}`;
        const omdbRes = await fetch(omdbUrl);
        if (omdbRes.ok) {
          const data = await omdbRes.json();
          if (data.Response !== 'False' && Array.isArray(data.Search)) {
            for (const item of data.Search.slice(0, 8)) {
              const poster = item.Poster && item.Poster !== 'N/A' ? item.Poster : null;
              results.push({
                title: item.Title,
                release_date: null,
                release_year: item.Year || '-',
                year: item.Year || '-',
                rating: null,
                vote_count: 0,
                poster_path: poster,
                cover_url: poster,
                overview: '',
                tmdb_id: null,
                imdb_id: item.imdbID,
                subtitle: [item.Year, item.Type].filter(Boolean).join(' · '),
                note: '',
              });
            }
          }
        }
      } catch (err) {
        console.error('OMDB Search Error:', err.message);
      }
    }

    res.json(results);
  } catch (err) {
    console.error('Content Search Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/content/images?tmdb_id=299536&media_type=movie
router.get('/images', async (req, res) => {
  try {
    const { tmdb_id, media_type } = req.query;
    if (!tmdb_id) return res.json({ backdrops: [] });

    const db = readDB();
    const settings = getUserSettings(req.userId, db);
    const tmdbKey = settings.tmdb_key;
    if (!tmdbKey) return res.json({ backdrops: [] });

    const type = media_type === 'tv' ? 'tv' : 'movie';
    const scenes = [];

    // 1. Fetch Official Film Clips & Trailer Scene Stills (Actual in-motion film frames)
    try {
      const videoUrl = `https://api.themoviedb.org/3/${type}/${encodeURIComponent(tmdb_id)}/videos?api_key=${encodeURIComponent(tmdbKey)}&language=en-US`;
      const vr = await fetch(videoUrl);
      if (vr.ok) {
        const vdata = await vr.json();
        const clips = (vdata.results || []).filter(v => v.site === 'YouTube' && (v.type === 'Clip' || v.type === 'Trailer' || v.type === 'Teaser'));
        clips.slice(0, 3).forEach(v => {
          scenes.push(`https://img.youtube.com/vi/${v.key}/hqdefault.jpg`);
        });
      }
    } catch (e) {
      console.warn('Error fetching TMDB video scene stills:', e.message);
    }

    // 2. For TV Series: Fetch genuine episode stills
    if (type === 'tv' && scenes.length < 5) {
      try {
        const sr = await fetch(`https://api.themoviedb.org/3/tv/${encodeURIComponent(tmdb_id)}/season/1?api_key=${encodeURIComponent(tmdbKey)}&language=en-US`);
        if (sr.ok) {
          const sd = await sr.json();
          (sd.episodes || []).forEach(ep => {
            if (ep.still_path && scenes.length < 6) {
              scenes.push(`https://image.tmdb.org/t/p/w780${ep.still_path}`);
            }
          });
        }
      } catch (e) {}
    }

    // 3. Fetch TMDB Production Backdrops (skipping index 0 to avoid promotional textless poster key art)
    try {
      const imgUrl = `https://api.themoviedb.org/3/${type}/${encodeURIComponent(tmdb_id)}/images?api_key=${encodeURIComponent(tmdbKey)}&include_image_language=en,null`;
      const r = await fetch(imgUrl);
      if (r.ok) {
        const data = await r.json();
        const backdrops = (data.backdrops || []).filter(b => b.aspect_ratio && b.aspect_ratio >= 1.5);
        const sceneBackdrops = backdrops.length > 2 ? backdrops.slice(1) : backdrops;
        sceneBackdrops.forEach(b => {
          if (scenes.length < 6) {
            scenes.push(`https://image.tmdb.org/t/p/w780${b.file_path}`);
          }
        });
      }
    } catch (e) {
      console.warn('Error fetching TMDB backdrops:', e.message);
    }

    // Deduplicate scenes
    const uniqueScenes = Array.from(new Set(scenes)).slice(0, 6);
    return res.json({ backdrops: uniqueScenes });
  } catch (err) {
    console.error('Content images error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// In-memory cache for trailers: `${id/title}_${type}` -> response
const trailerServerCache = new Map();

// GET /api/content/trailer?tmdb_id=123&title=Matrix&media_type=movie
router.get('/trailer', async (req, res) => {
  try {
    let { tmdb_id, title, media_type } = req.query;
    const cacheKey = `${tmdb_id || title}_${media_type || 'movie'}`.toLowerCase();
    if (trailerServerCache.has(cacheKey)) {
      return res.json(trailerServerCache.get(cacheKey));
    }

    const db = readDB();
    const settings = getUserSettings(req.userId, db);
    const tmdbKey = settings.tmdb_key || 'c34d44f722c298573a97a32fc4df383a';

    if (!tmdb_id && title && tmdbKey) {
      try {
        const sUrl = `https://api.themoviedb.org/3/search/multi?api_key=${encodeURIComponent(tmdbKey)}&query=${encodeURIComponent(title)}&page=1`;
        const sr = await fetch(sUrl);
        if (sr.ok) {
          const sdata = await sr.json();
          const match = (sdata.results || []).find(r => r.media_type === 'movie' || r.media_type === 'tv');
          if (match) {
            tmdb_id = match.id;
            if (!media_type) media_type = match.media_type;
          }
        }
      } catch (e) {}
    }

    if (!tmdb_id) return res.json({ trailer: null });
    const type = media_type === 'tv' ? 'tv' : 'movie';
    let url = `https://api.themoviedb.org/3/${type}/${encodeURIComponent(tmdb_id)}/videos?api_key=${encodeURIComponent(tmdbKey)}&language=en-US`;
    let r = await fetch(url);
    let data = r.ok ? await r.json() : {};
    let list = data.results || [];

    // For TV series: if no videos on show level, fetch season 1 trailer
    if (list.length === 0 && type === 'tv') {
      try {
        const sUrl = `https://api.themoviedb.org/3/tv/${encodeURIComponent(tmdb_id)}/season/1/videos?api_key=${encodeURIComponent(tmdbKey)}&language=en-US`;
        const sr = await fetch(sUrl);
        if (sr.ok) {
          const sd = await sr.json();
          list = sd.results || [];
        }
      } catch (e) {}
    }

    const sorted = list
      .filter(v => v.site === 'YouTube' && v.key)
      .sort((a, b) => {
        const getScore = (v) => {
          let score = 0;
          if (v.type === 'Trailer') score += 100;
          else if (v.type === 'Teaser') score += 50;
          else if (v.type === 'Clip') score += 20;
          if (v.official) score += 30;
          return score;
        };
        return getScore(b) - getScore(a);
      });

    const result = sorted.length > 0 ? {
      trailer: {
        key: sorted[0].key,
        name: sorted[0].name,
        type: sorted[0].type,
        site: sorted[0].site,
        embed_url: `https://www.youtube-nocookie.com/embed/${sorted[0].key}`
      }
    } : { trailer: null };

    trailerServerCache.set(cacheKey, result);
    return res.json(result);
  } catch (err) {
    return res.json({ trailer: null });
  }
});

// Cache for localized movie details: `${tmdb_id}_${type}_${lang}` -> item
const localizedDetailsCache = new Map();

// Helper to normalize language param
function resolveLocale(raw) {
  if (!raw) return 'en-US';
  const l = raw.toLowerCase();
  if (l === 'ru' || l.startsWith('ru-')) return 'ru-RU';
  return 'en-US';
}

// GET /api/content/details?tmdb_id=123&media_type=movie&language=ru-RU
router.get('/details', async (req, res) => {
  try {
    const tmdbId = req.query.tmdb_id;
    if (!tmdbId) return res.status(400).json({ error: 'tmdb_id is required' });

    const mediaType = req.query.media_type === 'tv' ? 'tv' : 'movie';
    const lang = resolveLocale(req.query.language || req.headers['x-language']);
    const cacheKey = `${tmdbId}_${mediaType}_${lang}`;

    if (localizedDetailsCache.has(cacheKey)) {
      return res.json(localizedDetailsCache.get(cacheKey));
    }

    const db = readDB();
    const settings = getUserSettings(req.userId, db);
    const tmdbKey = settings.tmdb_key;
    if (!tmdbKey) return res.status(500).json({ error: 'TMDB key not configured' });

    const url = `https://api.themoviedb.org/3/${mediaType}/${encodeURIComponent(tmdbId)}?api_key=${encodeURIComponent(tmdbKey)}&language=${lang}&append_to_response=credits`;
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch from TMDB' });
    }

    const d = await response.json();
    const director = d.credits?.crew?.find(c => c.job === 'Director')?.name || null;
    const genres = (d.genres || []).map(g => g.name).join(', ') || null;

    const result = {
      tmdb_id: d.id,
      media_type: mediaType,
      language: lang,
      title: d.title || d.name || d.original_title || d.original_name,
      original_title: d.original_title || d.original_name || null,
      tagline: d.tagline || null,
      overview: d.overview || null,
      genre: genres,
      director,
      poster_path: d.poster_path ? `https://image.tmdb.org/t/p/w500${d.poster_path}` : null,
      backdrop_path: d.backdrop_path ? `https://image.tmdb.org/t/p/w1280${d.backdrop_path}` : null,
      release_date: d.release_date || d.first_air_date || null,
      rating: d.vote_average ? Number(d.vote_average.toFixed(1)) : null,
      vote_count: d.vote_count || 0
    };

    localizedDetailsCache.set(cacheKey, result);
    return res.json(result);
  } catch (err) {
    console.error('Content details error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/content/translations (batch fetch for multiple movies)
router.post('/translations', async (req, res) => {
  try {
    const items = req.body.items || [];
    const lang = resolveLocale(req.body.language || req.headers['x-language']);
    if (!Array.isArray(items) || items.length === 0) {
      return res.json({});
    }

    const db = readDB();
    const settings = getUserSettings(req.userId, db);
    const tmdbKey = settings.tmdb_key;
    if (!tmdbKey) return res.status(500).json({ error: 'TMDB key not configured' });

    const translationsMap = {};
    const missing = [];

    items.forEach(item => {
      if (!item.tmdb_id) return;
      const mediaType = item.media_type === 'tv' ? 'tv' : 'movie';
      const cacheKey = `${item.tmdb_id}_${mediaType}_${lang}`;
      if (localizedDetailsCache.has(cacheKey)) {
        translationsMap[item.tmdb_id] = localizedDetailsCache.get(cacheKey);
      } else {
        missing.push({ tmdb_id: item.tmdb_id, media_type: mediaType, cacheKey });
      }
    });

    if (missing.length > 0) {
      await Promise.all(missing.slice(0, 30).map(async ({ tmdb_id, media_type, cacheKey }) => {
        try {
          const url = `https://api.themoviedb.org/3/${media_type}/${encodeURIComponent(tmdb_id)}?api_key=${encodeURIComponent(tmdbKey)}&language=${lang}`;
          const r = await fetch(url, { signal: AbortSignal.timeout(3500) });
          if (r.ok) {
            const d = await r.json();
            const localized = {
              tmdb_id: d.id,
              media_type,
              language: lang,
              title: d.title || d.name || d.original_title || d.original_name,
              tagline: d.tagline || null,
              overview: d.overview || null,
              genre: (d.genres || []).map(g => g.name).join(', ') || null
            };
            localizedDetailsCache.set(cacheKey, localized);
            translationsMap[tmdb_id] = localized;
          }
        } catch (e) {
          console.warn(`Failed batch translating tmdb_id ${tmdb_id}:`, e.message);
        }
      }));
    }

    return res.json(translationsMap);
  } catch (err) {
    console.error('Translations error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// In-memory cache for watch providers and nearby cinemas
const watchProvidersCache = new Map();
const nearbyCinemasCache = new Map();

function getHaversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

// GET /api/content/watch-providers?tmdb_id=123&media_type=movie&country=UZ&title=Dune
router.get('/watch-providers', async (req, res) => {
  try {
    const { tmdb_id, media_type = 'movie', country = 'UZ', title = '' } = req.query;
    const countryCode = String(country || 'UZ').toUpperCase().trim();
    const type = media_type === 'tv' ? 'tv' : 'movie';
    const cacheKey = `${tmdb_id}_${type}_${countryCode}`;

    if (watchProvidersCache.has(cacheKey)) {
      const cached = watchProvidersCache.get(cacheKey);
      if (Date.now() - cached.timestamp < 1000 * 60 * 60 * 12) {
        return res.json(cached.data);
      }
    }

    const db = readDB();
    const settings = getUserSettings(req.userId, db);
    const tmdbKey = settings.tmdb_key;

    let countryData = null;
    let allProviders = [];

    if (tmdb_id && tmdbKey) {
      try {
        const url = `https://api.themoviedb.org/3/${type}/${encodeURIComponent(tmdb_id)}/watch/providers?api_key=${encodeURIComponent(tmdbKey)}`;
        const r = await fetch(url, { signal: AbortSignal.timeout(4000) });
        if (r.ok) {
          const json = await r.json();
          if (json.results && json.results[countryCode]) {
            countryData = json.results[countryCode];
            const streams = (countryData.flatrate || []).map(p => ({
              id: p.provider_id,
              name: p.provider_name,
              logo: p.logo_path ? `https://image.tmdb.org/t/p/original${p.logo_path}` : null,
              type: 'stream'
            }));
            const rents = (countryData.rent || []).map(p => ({
              id: p.provider_id,
              name: p.provider_name,
              logo: p.logo_path ? `https://image.tmdb.org/t/p/original${p.logo_path}` : null,
              type: 'rent'
            }));
            const buys = (countryData.buy || []).map(p => ({
              id: p.provider_id,
              name: p.provider_name,
              logo: p.logo_path ? `https://image.tmdb.org/t/p/original${p.logo_path}` : null,
              type: 'buy'
            }));
            allProviders = [...streams, ...rents, ...buys];
          }
        }
      } catch (e) {
        console.warn('Watch providers TMDB error:', e.message);
      }
    }

    let primaryProvider = null;
    let hasOfficial = false;

    if (countryCode === 'UZ') {
      // Uzbekistan official platform: ITV.uz
      primaryProvider = {
        name: 'ITV.uz',
        logo: 'https://itv.uz/favicon.ico',
        type: 'stream',
        url: `https://itv.uz/search?text=${encodeURIComponent(title || '')}`
      };
      hasOfficial = true;
    } else if (allProviders.length > 0) {
      const top = allProviders[0];
      primaryProvider = {
        name: top.name,
        logo: top.logo,
        type: top.type,
        url: countryData?.link || `https://www.google.com/search?q=${encodeURIComponent(title + ' watch on ' + top.name)}`
      };
      hasOfficial = true;
    } else {
      // Fallback: Netflix
      primaryProvider = {
        name: 'Netflix',
        logo: 'https://assets.nflxext.com/us/ffe/siteui/common/icons/nficon2016.ico',
        type: 'stream',
        url: `https://www.netflix.com/search?q=${encodeURIComponent(title || '')}`
      };
      hasOfficial = false;
    }

    const result = {
      country: countryCode,
      has_official: hasOfficial,
      primary_provider: primaryProvider,
      all_providers: allProviders,
      tmdb_link: countryData?.link || null
    };

    watchProvidersCache.set(cacheKey, { data: result, timestamp: Date.now() });
    return res.json(result);
  } catch (err) {
    console.error('Watch providers error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/content/nearby-cinemas?lat=41.31&lon=69.24&radius=50&country=UZ&city=Tashkent&title=Dune
router.get('/nearby-cinemas', async (req, res) => {
  try {
    const { lat, lon, radius = 50, country = 'UZ', city = '', title = '', media_type = 'movie' } = req.query;
    const latitude = Number(lat);
    const longitude = Number(lon);
    const radiusKm = Math.min(100, Math.max(5, Number(radius) || 50));
    const countryCode = String(country || 'UZ').toUpperCase().trim();

    // TV series are not in cinemas
    if (media_type === 'tv') {
      return res.json({ cinemas: [], count: 0, radius_km: radiusKm, ticket_url: '' });
    }

    if (!lat || !lon || isNaN(latitude) || isNaN(longitude)) {
      return res.json({
        cinemas: [],
        count: 0,
        radius_km: radiusKm,
        ticket_url: countryCode === 'UZ'
          ? `https://www.afisha.uz/cinema/search?q=${encodeURIComponent(title || '')}`
          : `https://www.google.com/search?q=${encodeURIComponent((title || '') + ' ' + (city || '') + ' cinema showtimes tickets')}`,
        afisha_url: countryCode === 'UZ'
          ? `https://www.afisha.uz/cinema/search?q=${encodeURIComponent(title || '')}`
          : null,
        google_showtimes_url: `https://www.google.com/search?q=${encodeURIComponent((title || '') + ' ' + (city || '') + ' kinoteatr seanslar')}`
      });
    }

    const roundedLat = latitude.toFixed(2);
    const roundedLon = longitude.toFixed(2);
    const cacheKey = `${roundedLat}_${roundedLon}_${radiusKm}`;

    if (nearbyCinemasCache.has(cacheKey)) {
      const cached = nearbyCinemasCache.get(cacheKey);
      if (Date.now() - cached.timestamp < 1000 * 60 * 30) {
        return res.json({
          ...cached.data,
          ticket_url: countryCode === 'UZ'
            ? `https://www.afisha.uz/cinema/search?q=${encodeURIComponent(title || '')}`
            : `https://www.google.com/search?q=${encodeURIComponent((title || '') + ' ' + (city || '') + ' cinema showtimes tickets')}`,
          google_showtimes_url: `https://www.google.com/search?q=${encodeURIComponent((title || '') + ' ' + (city || '') + ' kinoteatr seanslar')}`
        });
      }
    }

    let cinemas = [];
    const overpassEndpoints = [
      'https://overpass-api.de/api/interpreter',
      'https://overpass.kumi.systems/api/interpreter',
      'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
    ];

    const overpassQuery = `[out:json][timeout:10];(node["amenity"="cinema"](around:${radiusKm * 1000},${latitude},${longitude});way["amenity"="cinema"](around:${radiusKm * 1000},${latitude},${longitude});relation["amenity"="cinema"](around:${radiusKm * 1000},${latitude},${longitude}););out center;`;

    for (const endpoint of overpassEndpoints) {
      try {
        const overpassUrl = `${endpoint}?data=${encodeURIComponent(overpassQuery)}`;
        const r = await fetch(overpassUrl, {
          signal: AbortSignal.timeout(5000),
          headers: { 'User-Agent': 'NotelabApp/1.0' }
        });
        if (r.ok) {
          const json = await r.json();
          const elements = json.elements || [];
          const seenNames = new Set();

          elements.forEach(item => {
            const cLat = item.lat || item.center?.lat;
            const cLon = item.lon || item.center?.lon;
            if (!cLat || !cLon) return;

            const tags = item.tags || {};
            const name = tags.name || tags['name:ru'] || tags['name:uz'] || tags['name:en'] || tags.brand || null;
            if (!name) return;
            const cleanName = name.trim();
            if (cleanName.length < 2 || cleanName.toLowerCase().startsWith('бывший')) return;
            if (seenNames.has(cleanName.toLowerCase())) return;
            seenNames.add(cleanName.toLowerCase());

            const distance = getHaversineDistanceKm(latitude, longitude, cLat, cLon);
            if (distance > radiusKm) return;

            const cinemaCity = tags['addr:city'] || city || '';
            const street = tags['addr:street'] || '';
            const housenumber = tags['addr:housenumber'] || '';
            const address = [street, housenumber, cinemaCity].filter(Boolean).join(', ');

            cinemas.push({
              id: item.id,
              name: cleanName,
              distance_km: distance,
              lat: cLat,
              lon: cLon,
              address: address || null,
              city: cinemaCity || null,
              phone: tags.phone || tags['contact:phone'] || null,
              website: tags.website || tags['contact:website'] || null,
              maps_url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanName + ' ' + cinemaCity)}`,
              yandex_maps_url: `https://yandex.com/maps/?text=${encodeURIComponent(cleanName + ' ' + cinemaCity)}&ll=${cLon},${cLat}&z=15`
            });
          });

          cinemas.sort((a, b) => a.distance_km - b.distance_km);
          if (cinemas.length > 0) break;
        }
      } catch (e) {}
    }

    // If all Overpass mirrors fail and user is in Uzbekistan, fallback to known Tashkent cinemas
    if (cinemas.length === 0 && countryCode === 'UZ') {
      const fallbacks = [
        { name: 'Magic Cinema', distance_km: 0.8 },
        { name: 'iMax / Cinema City', distance_km: 1.1 },
        { name: 'Next Cinema', distance_km: 1.6 },
        { name: 'Panorama / Alisher Navoiy', distance_km: 1.8 },
        { name: 'Premier Hall', distance_km: 2.8 },
        { name: 'Compass Cinema', distance_km: 10.9 }
      ];
      cinemas = fallbacks.map((f, i) => ({
        id: 'fb_' + i,
        name: f.name,
        distance_km: f.distance_km,
        city: city || 'Toshkent',
        maps_url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(f.name + ' Toshkent')}`,
        yandex_maps_url: `https://yandex.com/maps/?text=${encodeURIComponent(f.name + ' Toshkent')}`
      }));
    }

    const ticketUrl = countryCode === 'UZ'
      ? `https://www.afisha.uz/cinema/search?q=${encodeURIComponent(title || '')}`
      : `https://www.google.com/search?q=${encodeURIComponent((title || '') + ' ' + (city || '') + ' cinema showtimes tickets')}`;

    const afishaUrl = countryCode === 'UZ'
      ? `https://www.afisha.uz/cinema/search?q=${encodeURIComponent(title || '')}`
      : null;

    const googleShowtimesUrl = `https://www.google.com/search?q=${encodeURIComponent((title || '') + ' ' + (city || '') + ' kinoteatr seanslar')}`;

    const dataToCache = {
      cinemas,
      count: cinemas.length,
      radius_km: radiusKm,
      afisha_url: afishaUrl,
      google_showtimes_url: googleShowtimesUrl
    };

    nearbyCinemasCache.set(cacheKey, { data: dataToCache, timestamp: Date.now() });

    return res.json({
      ...dataToCache,
      ticket_url: ticketUrl
    });
  } catch (err) {
    console.error('Nearby cinemas error:', err);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
