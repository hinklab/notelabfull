const express = require('express');
const router = express.Router();

// TODO: Implement content search (OMDB, TMDB, RAWG, Wikipedia)
router.get('/search', async (req, res) => {
  const { type, query } = req.query;
  
  // Stub response
  res.json([]);
});

module.exports = router;
