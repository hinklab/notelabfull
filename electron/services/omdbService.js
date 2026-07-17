const https = require('https')

function httpGet(hostname, path, headers = {}) {
  return new Promise((resolve, reject) => {
    https.get({ hostname, path, headers: { 'User-Agent': 'notelab/1.0', ...headers } }, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => { try { resolve(JSON.parse(data)) } catch (e) { reject(e) } })
    }).on('error', reject)
  })
}

function normalizeText(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\u0400-\u04FF\u00C0-\u017F ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function simplifyTitle(title) {
  return normalizeText(title)
    .replace(/:\s*/g, ' ')
    .replace(/born again/g, '')
    .replace(/season\s*\d+/g, '')
    .replace(/s\d+/g, '')
    .replace(/\bpart\b|\bchapter\b|\bepisode\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseYear(yearStr) {
  if (!yearStr) return null
  const match = String(yearStr).match(/\d{4}/)
  return match ? parseInt(match[0], 10) : null
}

function parsePoster(url) {
  if (!url || url === 'N/A') return null
  return url
}

function inferPreferredType(title, releaseYear) {
  const t = String(title || '')
  if (/season|serial|series|s\d{1,2}\b/i.test(t)) return 'series'
  if (releaseYear && String(releaseYear).includes('-')) return 'series'
  return null
}

function scoreTitleMatch(query, title) {
  const q = normalizeText(query)
  const simpleQ = simplifyTitle(query)
  const t = normalizeText(title)
  const simpleT = simplifyTitle(title)
  let score = 0
  if (t === q) score += 120
  if (simpleT === simpleQ) score += 100
  if (t.startsWith(q)) score += 80
  if (simpleT.startsWith(simpleQ)) score += 70
  if (t.includes(q)) score += 50
  if (simpleT.includes(simpleQ)) score += 40
  if (t.includes('born again') && !q.includes('born again')) score -= 20
  return score
}

// keywords massivi bo'yicha meta ma'lumotlarni tekshirish (studio, janr, rejissyor)
function scoreKeywordMatch(meta, keywords) {
  if (!keywords || !keywords.length) return 0
  let score = 0
  const fields = [
    normalizeText(meta.title || ''),
    normalizeText(meta.genre || ''),
    normalizeText(meta.director || ''),
    normalizeText(meta.production || ''),
    normalizeText(meta.writer || ''),
  ].join(' ')
  for (const kw of keywords) {
    const k = normalizeText(kw)
    if (!k) continue
    if (fields.includes(k)) score += 50
  }
  return score
}

function pickBestOMDBResult(query, results, preferFuture = false, options = {}) {
  const q = normalizeText(query)
  if (!q) return results[0] || null
  const nowYear = new Date().getFullYear()
  const preferredType = options.preferredType || inferPreferredType(query, options.releaseYear)
  const scored = results.map(item => {
    let score = scoreTitleMatch(query, item.Title || '')
    const year = parseYear(item.Year)
    if (preferredType === 'series') {
      if (item.Type === 'series') score += 45
      if (item.Type === 'movie') score -= 50
    } else if (preferredType === 'movie') {
      if (item.Type === 'movie') score += 25
      if (item.Type === 'series') score -= 20
    }
    if (preferFuture) {
      if (year && year > nowYear) score += 80
      if (year && year === nowYear) score += 40
      // Aniq eski va reyting bor bo'lsa — bu kelajakdagi film emas
      if (year && year < nowYear - 1) score -= 70
      if (item.Year === 'N/A') score += 20
    } else if (year) {
      score += Math.max(0, 30 - Math.abs(year - nowYear) / 2)
    }
    const wantYear = parseYear(options.releaseYear)
    if (wantYear && year) {
      if (year === wantYear) score += 40
      if (Math.abs(year - wantYear) > 3) score -= 25
    }
    return { item, score }
  })
  scored.sort((a, b) => b.score - a.score)
  return scored[0]?.item || results[0] || null
}

const OMDB_TITLE_ALIASES = {
  'kurdlar vadisi pusu': ['Valley of the Wolves: Ambush', 'Kurtlar Vadisi: Pusu', 'Kurdlar Vadisi Pusu'],
  'kurdlar vadisi': ['Valley of the Wolves', 'Kurtlar Vadisi'],
  'kurtlar vadisi pusu': ['Valley of the Wolves: Ambush', 'Kurdlar Vadisi: Pusu'],
  daredevil: ['Daredevil 2015'],
  'daredevil s1 s3': ['Daredevil 2015'],
}

function buildOMDBQueries(title, preferFuture, releaseYear) {
  const queries = [title]
  const norm = normalizeText(title)
  const noColon = title.replace(/:/g, ' ').replace(/\s+/g, ' ').trim()
  if (noColon !== title) queries.push(noColon)
  const aliases = OMDB_TITLE_ALIASES[norm] || OMDB_TITLE_ALIASES[simplifyTitle(title)]
  if (aliases) queries.push(...aliases)
  const startYear = parseYear(releaseYear)
  if (startYear) queries.push(`${title} ${startYear}`)
  const y = new Date().getFullYear()
  if (preferFuture) {
    queries.push(`${title} ${y + 1}`)
    queries.push(`${title} ${y}`)
  }
  return [...new Set(queries.map(q => q.trim()).filter(Boolean))]
}

async function getOMDBDetails(title, year, omdbKey, imdbId = null) {
  if (!omdbKey) return null
  try {
    const path = imdbId
      ? `/?i=${imdbId}&plot=short&apikey=${omdbKey}`
      : `/?t=${encodeURIComponent(title || '')}${year ? `&y=${year}` : ''}&plot=short&apikey=${omdbKey}`
    const data = await httpGet('www.omdbapi.com', path)
    if (data.Response !== 'True') return null
    const rating = parseFloat(data.imdbRating)
    const votes = parseInt(String(data.imdbVotes || '').replace(/,/g, ''), 10)
    const parsedYear = parseYear(data.Year)
    const nowYear = new Date().getFullYear()
    const isFuture = parsedYear ? parsedYear > nowYear : false
    let release_date = null
    if (data.Released && data.Released !== 'N/A') {
      const d = new Date(data.Released)
      if (!isNaN(d.getTime()) && d > new Date()) release_date = d.toISOString().slice(0, 10)
    }
    const seasons = data.Type === 'series' ? `${data.totalSeasons || '?'} season` : '-'
    const director = data.Director && data.Director !== 'N/A'
      ? data.Director
      : (data.Writer && data.Writer !== 'N/A' ? data.Writer.split(',')[0].trim() : null)
    return {
      title: data.Title || null,
      year: data.Year || null,
      genre: data.Genre && data.Genre !== 'N/A' ? data.Genre : null,
      director,
      production: data.Production && data.Production !== 'N/A' ? data.Production : null,
      writer: data.Writer && data.Writer !== 'N/A' ? data.Writer : null,
      rating: isNaN(rating) ? null : rating,
      vote_count: isNaN(votes) ? null : votes,
      imdb_id: data.imdbID || imdbId || null,
      poster: parsePoster(data.Poster),
      type: data.Type || null,
      is_future: isFuture,
      release_date,
      seasons,
    }
  } catch (e) {
    console.error('OMDB error:', e.message)
    return null
  }
}

// Barcha search natijalarini qaytaradi (max 10)
async function searchOMDBAll(query, omdbKey, preferFuture = false, options = {}) {
  if (!omdbKey) return []
  try {
    const typeParam = options.preferredType === 'series' ? '&type=series'
      : options.preferredType === 'movie' ? '&type=movie' : ''
    const data = await httpGet('www.omdbapi.com', `/?s=${encodeURIComponent(query)}&apikey=${omdbKey}${typeParam}`)
    if (data.Response !== 'True' || !Array.isArray(data.Search)) return []
    return data.Search
  } catch (e) {
    console.error('OMDB search error:', e.message)
    return []
  }
}

async function searchOMDB(query, omdbKey, preferFuture = false, options = {}) {
  const results = await searchOMDBAll(query, omdbKey, preferFuture, options)
  if (!results.length) return null
  return pickBestOMDBResult(query, results, preferFuture, options)
}

async function searchOMDBBest(title, omdbKey, preferFuture = false, options = {}) {
  const queries = buildOMDBQueries(title, preferFuture, options.releaseYear)
  let bestHit = null
  let bestScore = -Infinity
  for (const query of queries) {
    const hit = await searchOMDB(query, omdbKey, preferFuture, options)
    if (!hit) continue
    const score = scoreTitleMatch(title, hit.Title || '')
    if (score > bestScore) { bestScore = score; bestHit = hit }
  }
  return bestHit
}

// keywords bo'yicha barcha natijalarni tekshirib eng mosini topish
async function resolveWithKeywords(title, omdbKey, preferFuture, options, keywords) {
  const queries = buildOMDBQueries(title, preferFuture, options.releaseYear)
  const nowYear = new Date().getFullYear()
  const seen = new Set()
  const candidates = []

  for (const query of queries) {
    const results = await searchOMDBAll(query, omdbKey, preferFuture, options)
    for (const item of results) {
      if (!item.imdbID || seen.has(item.imdbID)) continue
      seen.add(item.imdbID)
      candidates.push(item)
    }
  }

  if (!candidates.length) return null

  let bestMeta = null
  let bestScore = -Infinity

  for (const item of candidates) {
    const meta = await getOMDBDetails(null, null, omdbKey, item.imdbID)
    if (!meta) continue

    const year = parseYear(meta.year)
    let score = scoreTitleMatch(title, meta.title || '')
    if (meta.poster) score += 15
    if (options.preferredType && meta.type === options.preferredType) score += 30
    score += scoreKeywordMatch(meta, keywords)

    if (preferFuture) {
      if (year && year > nowYear) score += 80
      if (year && year === nowYear) score += 40
      // Aniq eski va reyting bor — past ball
      if (year && year < nowYear - 1 && meta.rating) score -= 60
      if (!year) score += 10
    }

    console.log(`[keyword] "${meta.title}" (${meta.year}) score=${score}`)
    if (score > bestScore) { bestScore = score; bestMeta = meta }
  }

  return bestMeta
}

async function resolveMovieMetadata(title, { omdbKey = '', preferFuture = false, release_year, imdb_id, keywords = [] } = {}) {
  const userTitle = String(title || '').trim()
  if (!userTitle || !omdbKey) return null

  const options = {
    releaseYear: release_year,
    preferredType: inferPreferredType(userTitle, release_year),
  }

  if (imdb_id) {
    const byId = await getOMDBDetails(null, null, omdbKey, imdb_id)
    if (byId) {
      const resolved = formatResolved(byId, userTitle, preferFuture)
      if (resolved) return resolved
    }
  }

  // Keywords bo'lsa — barcha natijalarni tekshirib eng mosini topamiz
  if (keywords && keywords.length > 0) {
    const meta = await resolveWithKeywords(userTitle, omdbKey, preferFuture, options, keywords)
    if (meta) {
      const resolved = formatResolved(meta, userTitle, preferFuture)
      if (resolved) return resolved
    }
  }

  // Oddiy qidiruv
  const queries = buildOMDBQueries(userTitle, preferFuture, release_year)
  let bestMeta = null
  let bestScore = -Infinity

  for (const query of queries) {
    let meta = await getOMDBDetails(query, release_year, omdbKey)
    if (!meta) {
      const hit = await searchOMDB(query, omdbKey, preferFuture, options)
      if (hit?.imdbID) meta = await getOMDBDetails(null, null, omdbKey, hit.imdbID)
      else if (hit) meta = await getOMDBDetails(hit.Title, hit.Year, omdbKey)
    }
    if (!meta) continue
    const resolved = formatResolved(meta, userTitle, preferFuture)
    if (!resolved) continue
    let score = scoreTitleMatch(userTitle, meta.title)
    if (meta.poster) score += 15
    if (options.preferredType && meta.type === options.preferredType) score += 30
    if (score > bestScore) { bestScore = score; bestMeta = meta }
  }

  if (!bestMeta) {
    const hit = await searchOMDBBest(userTitle, omdbKey, preferFuture, options)
    if (hit?.imdbID) {
      const meta = await getOMDBDetails(null, null, omdbKey, hit.imdbID)
      if (meta && formatResolved(meta, userTitle, preferFuture)) bestMeta = meta
    } else if (hit) {
      const meta = await getOMDBDetails(hit.Title, hit.Year, omdbKey)
      if (meta && formatResolved(meta, userTitle, preferFuture)) bestMeta = meta
    }
  }

  if (!bestMeta) return null
  return formatResolved(bestMeta, userTitle, preferFuture)
}

function formatResolved(meta, userTitle, preferFuture) {
  const nowYear = new Date().getFullYear()
  const parsedYear = parseYear(meta.year)

  // preferFuture=true bo'lganda: eski filmni (aniq o'tgan, reyting bor, yili aniq)
  // faqat shu film kelajakdagi versiyasi bo'lmasa rad etamiz.
  // Lekin OMDB da ko'p hollarda kelajakdagi film hali yo'q bo'ladi —
  // shuning uchun faqat "aniq eski va reyting bor" filmlarni rad etamiz.
  if (preferFuture && parsedYear && parsedYear < nowYear - 1 && meta.rating && meta.vote_count) {
    return null
  }

  const isFuture = preferFuture || meta.is_future
  return {
    title: meta.title || userTitle,
    year: meta.year || '-',
    rating: isFuture ? null : (meta.rating ?? null),
    vote_count: isFuture ? null : (meta.vote_count ?? null),
    genre: meta.genre || '-',
    director: meta.director || '-',
    seasons: meta.seasons || '-',
    poster: meta.poster || null,
    imdb_id: meta.imdb_id || null,
    release_date: isFuture ? meta.release_date : null,
  }
}

module.exports = {
  getOMDBDetails,
  searchOMDB,
  resolveMovieMetadata,
}
