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
    const url = `https://api.themoviedb.org/3/${type}/${encodeURIComponent(tmdb_id)}/images?api_key=${encodeURIComponent(tmdbKey)}`;
    const r = await fetch(url);
    if (!r.ok) return res.json({ backdrops: [] });

    const data = await r.json();
    const backdrops = (data.backdrops || [])
      .slice(0, 12)
      .map(b => `https://image.tmdb.org/t/p/w780${b.file_path}`);

    res.json({ backdrops });
  } catch (err) {
    console.error('Content Images Error:', err.message);
    res.status(500).json({ backdrops: [] });
  }
});

module.exports = router;
