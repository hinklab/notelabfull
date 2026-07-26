const express = require('express');
const router = express.Router();
const { readDB, getUserSettings } = require('../services/database');

// GET /api/content/search?type=movie&query=Avatar
router.get('/search', async (req, res) => {
  try {
    const query = req.query.query;
    if (!query || !query.trim()) {
      return res.json([]);
    }

    const db = readDB();
    const settings = getUserSettings(req.userId, db);
    const tmdbKey = settings.tmdb_key;
    const omdbKey = settings.omdb_key;

    const results = [];

    // 1. Try TMDB Search if tmdb_key is available
    if (tmdbKey) {
      try {
        const tmdbUrl = `https://api.themoviedb.org/3/search/multi?api_key=${encodeURIComponent(tmdbKey)}&query=${encodeURIComponent(query.trim())}&language=en-US&page=1`;
        const tmdbRes = await fetch(tmdbUrl);
        if (tmdbRes.ok) {
          const data = await tmdbRes.json();
          const items = (data.results || [])
            .filter(item => item.media_type === 'movie' || item.media_type === 'tv')
            .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
            .slice(0, 15);

          for (const item of items) {
            const isMovie = item.media_type === 'movie';
            const title = item.title || item.name || query;
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
        }
      } catch (err) {
        console.error('TMDB Search Error:', err.message);
      }
    }

    // 2. Try OMDB Search if omdb_key is available and results are empty
    if (omdbKey && results.length === 0) {
      try {
        const omdbUrl = `http://www.omdbapi.com/?apikey=${encodeURIComponent(omdbKey)}&s=${encodeURIComponent(query.trim())}`;
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

module.exports = router;
