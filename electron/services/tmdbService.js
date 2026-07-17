const https = require('https')

const TMDB_BASE = 'api.themoviedb.org'
const TMDB_IMG  = 'https://image.tmdb.org/t/p/w500'

function httpGet(hostname, path) {
  return new Promise((resolve, reject) => {
    https.get(
      { hostname, path, headers: { 'User-Agent': 'notelab/1.0' } },
      (res) => {
        let data = ''
        res.on('data', c => data += c)
        res.on('end', () => {
          try { resolve(JSON.parse(data)) } catch (e) { reject(e) }
        })
      }
    ).on('error', reject)
  })
}

function normalizeText(t) {
  return String(t || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()
}

function parseYear(str) {
  const m = String(str || '').match(/\d{4}/)
  return m ? parseInt(m[0], 10) : null
}

function parsePoster(p) {
  if (!p) return null
  return TMDB_IMG + p
}

// keywords (rejissyor, studio) bo'yicha to'liq ma'lumotga score qo'shish
function scoreKeywords(details, keywords) {
  if (!keywords || !keywords.length || !details) return 0
  let score = 0
  const fields = [
    normalizeText(details.title    || ''),
    normalizeText(details.director || ''),
    normalizeText(details.genre    || ''),
    normalizeText(details.overview || ''),
  ].join(' ')
  for (const kw of keywords) {
    const k = normalizeText(kw)
    if (k && fields.includes(k)) score += 60
  }
  return score
}

// TMDB search — movie + tv
async function searchTMDB(query, tmdbKey, preferFuture = false) {
  if (!tmdbKey || !query) return { results: [] }
  try {
    const encoded = encodeURIComponent(query)
    const data = await httpGet(
      TMDB_BASE,
      `/3/search/multi?query=${encoded}&include_adult=false&language=en-US&page=1&api_key=${tmdbKey}`
    )
    if (!data.results) return { results: [] }

    const nowYear = new Date().getFullYear()

    const scored = data.results
      .filter(r => r.media_type === 'movie' || r.media_type === 'tv')
      .map(r => {
        const title = r.title || r.name || ''
        const date  = r.release_date || r.first_air_date || ''
        const year  = parseYear(date)
        const q     = normalizeText(query)
        const t     = normalizeText(title)

        let score = 0
        if (t === q)          score += 120
        if (t.startsWith(q))  score += 80
        if (t.includes(q))    score += 50

        if (preferFuture) {
          if (year && year > nowYear)   score += 80
          if (year && year === nowYear) score += 40
          if (year && year < nowYear)   score -= 60
          if (!date)                    score += 20
        } else {
          if (year) score += Math.max(0, 30 - Math.abs(year - nowYear) / 2)
        }

        return { ...r, _score: score }
      })
      .sort((a, b) => b._score - a._score)

    return { results: scored }
  } catch (e) {
    console.error('TMDB search error:', e.message)
    return { results: [] }
  }
}

// TMDB film/serial to'liq ma'lumoti (credits bilan)
async function getMovieDetails(id, mediaType = 'movie', tmdbKey) {
  if (!tmdbKey || !id) return null
  try {
    const type = mediaType === 'tv' ? 'tv' : 'movie'
    const data = await httpGet(
      TMDB_BASE,
      `/3/${type}/${id}?language=en-US&append_to_response=credits&api_key=${tmdbKey}`
    )
    if (!data || data.success === false) return null

    const nowYear = new Date().getFullYear()
    const dateStr = data.release_date || data.first_air_date || ''
    const year    = parseYear(dateStr)
    const isFuture = year ? year >= nowYear : !dateStr

    let release_date = null
    if (dateStr) {
      const d = new Date(dateStr)
      if (!isNaN(d.getTime()) && d > new Date()) {
        release_date = d.toISOString().slice(0, 10)
      }
    }

    const genres = (data.genres || []).map(g => g.name).join(', ') || null

    let director = null
    if (type === 'movie' && data.credits?.crew) {
      const dir = data.credits.crew.find(c => c.job === 'Director')
      if (dir) director = dir.name
    } else if (type === 'tv' && data.created_by?.length) {
      director = data.created_by.map(c => c.name).join(', ')
    }

    const seasons = type === 'tv' ? `${data.number_of_seasons || '?'} season` : '-'

    return {
      tmdb_id:      data.id || null,
      title:        data.title || data.name || null,
      year:         year ? String(year) : (dateStr ? dateStr.slice(0, 4) : '-'),
      genre:        genres || '-',
      director:     director || '-',
      seasons,
      poster:       parsePoster(data.poster_path),
      release_date,
      is_future:    isFuture,
      media_type:   type,
      overview:     data.overview || null,
    }
  } catch (e) {
    console.error('TMDB details error:', e.message)
    return null
  }
}

// Futured bo'limi uchun asosiy funksiya.
// keywords: ['Christopher Nolan', 'DC', 'Marvel'] kabi massiv
async function resolveFuturedMetadata(title, tmdbKey, keywords = []) {
  if (!tmdbKey || !title) return null

  const nowYear = new Date().getFullYear()
  const { results } = await searchTMDB(title, tmdbKey, true)
  if (!results.length) return null

  // Keywords bo'lsa — top 5 natijani to'liq tekshirib eng mosini topamiz
  if (keywords.length > 0) {
    const candidates = results.slice(0, 5)
    let bestDetails = null
    let bestScore   = -Infinity

    for (const r of candidates) {
      const details = await getMovieDetails(r.id, r.media_type, tmdbKey)
      if (!details) continue

      // Eski filmni futuredga qo'shmaymiz
      const year = parseYear(details.year)
      if (year && year < nowYear) {
        console.log(`[TMDB] skip old: "${details.title}" (${details.year})`)
        continue
      }

      const score = r._score + scoreKeywords(details, keywords)
      console.log(`[TMDB keyword] "${details.title}" (${details.year}) base=${r._score} kw=${scoreKeywords(details, keywords)} total=${score}`)

      if (score > bestScore) {
        bestScore   = score
        bestDetails = details
      }
    }

    if (bestDetails) return bestDetails
  }

  // Keywords yo'q — eng yuqori scored natijani olamiz
  for (const best of results) {
    if (best._score < -10) break  // juda past score — to'xtat

    const details = await getMovieDetails(best.id, best.media_type, tmdbKey)
    if (!details) continue

    // Eski filmni futuredga qo'shmaymiz
    const year = parseYear(details.year)
    if (year && year < nowYear) {
      console.log(`[TMDB] skip old: "${details.title}" (${details.year})`)
      continue
    }

    console.log(`[TMDB] "${details.title}" (${details.year}) score=${best._score}`)
    return details
  }

  return null
}

module.exports = {
  searchTMDB,
  getMovieDetails,
  resolveFuturedMetadata,
}
