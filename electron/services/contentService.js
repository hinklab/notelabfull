const https = require('https')
const http = require('http')

function fetchJson(url, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) return reject(new Error('Too many redirects'))
    const lib = url.startsWith('https') ? https : http
    lib.get(url, { headers: { 'User-Agent': 'notelab/1.0' } }, (res) => {
      if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
        return fetchJson(res.headers.location, redirectCount + 1).then(resolve).catch(reject)
      }
      if (res.statusCode < 200 || res.statusCode >= 300) {
        return reject(new Error(`HTTP ${res.statusCode}`))
      }
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        try { resolve(JSON.parse(data)) }
        catch { reject(new Error('JSON parse error')) }
      })
    }).on('error', reject)
  })
}

// ─── Google Books (API keysiz) ───────────────────────────────────────────────
function mapBookItem(item) {
  const info = item.volumeInfo || {}
  const cover = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || null
  const authors = (info.authors || []).join(', ') || ''
  const year = info.publishedDate?.slice(0, 4) || ''
  const subtitle = authors && year ? `${authors} · ${year}` : authors || year || ''
  return {
    title: info.title || 'Noma\'lum',
    subtitle,
    year,
    cover_url: cover ? cover.replace('http://', 'https://') : null,
    note: info.description ? info.description.slice(0, 200) : '',
    extra: {
      pages: info.pageCount || null,
      categories: (info.categories || []).join(', ') || '',
      publisher: info.publisher || '',
    },
  }
}

async function searchBooksOpenLibrary(query) {
  const q = encodeURIComponent(query)
  const url = `https://openlibrary.org/search.json?q=${q}&limit=8&fields=title,author_name,first_publish_year,cover_i,key`
  const data = await fetchJson(url)
  return (data.docs || []).map(doc => {
    const authors = (doc.author_name || []).join(', ')
    const year = doc.first_publish_year ? String(doc.first_publish_year) : ''
    const subtitle = authors && year ? `${authors} \u00b7 ${year}` : authors || year || ''
    const cover_url = doc.cover_i
      ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
      : null
    return {
      title: doc.title || 'Noma\'lum',
      subtitle,
      year,
      cover_url,
      note: '',
      extra: { olid: doc.key || '' },
    }
  })
}

async function searchBooks(query) {
  const q = encodeURIComponent(query)
  const url = `https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=8&printType=books`
  let items = []
  try {
    const data = await fetchJson(url)
    items = data.items || []
    if (!items.length) {
      const url2 = `https://www.googleapis.com/books/v1/volumes?q=intitle:${q}&maxResults=8&printType=books`
      const data2 = await fetchJson(url2)
      items = data2.items || []
    }
  } catch (e) { items = [] }

  if (items.length) return items.map(mapBookItem)

  // Google Books topa olmasa — Open Library fallback
  try {
    return await searchBooksOpenLibrary(query)
  } catch (e) {
    return []
  }
}

// ─── Wikipedia (rasm bilan) ──────────────────────────────────────────────────
async function searchWiki(query) {
  const q = encodeURIComponent(query)
  // 1. Search: top 8 natija
  const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${q}&srlimit=8&format=json&origin=*`
  const searchData = await fetchJson(searchUrl)
  const hits = (searchData.query?.search || [])

  // 2. Har birining summary + thumbnail ni olish (parallel)
  const results = await Promise.all(
    hits.map(async (hit) => {
      try {
        const title = encodeURIComponent(hit.title)
        const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${title}`
        const s = await fetchJson(summaryUrl)
        return {
          title: s.title || hit.title,
          subtitle: s.description || '',
          cover_url: s.thumbnail?.source || s.originalimage?.source || null,
          note: s.extract ? s.extract.slice(0, 200) : '',
          extra: { wiki_url: s.content_urls?.desktop?.page || '' },
        }
      } catch {
        return {
          title: hit.title,
          subtitle: '',
          cover_url: null,
          note: hit.snippet?.replace(/<[^>]+>/g, '').slice(0, 200) || '',
          extra: {},
        }
      }
    })
  )
  return results
}

// ─── RAWG (O'yinlar) ─────────────────────────────────────────────────────────
async function searchGames(query, rawgKey) {
  if (!rawgKey) return { error: 'RAWG API kaliti sozlamalarda kiritilmagan' }
  const q = encodeURIComponent(query)
  const url = `https://api.rawg.io/api/games?search=${q}&page_size=8&key=${rawgKey}`
  const data = await fetchJson(url)
  return (data.results || []).map(g => {
    const year = g.released?.slice(0, 4) || ''
    const genres = (g.genres || []).map(x => x.name).join(', ')
    const subtitle = year && genres ? `${genres} · ${year}` : genres || year || ''
    return {
      title: g.name || 'Noma\'lum',
      subtitle,
      year,
      cover_url: g.background_image || null,
      note: '',
      extra: {
        rating: g.rating || null,
        genres,
        metacritic: g.metacritic || null,
      },
    }
  })
}

// ─── Router ──────────────────────────────────────────────────────────────────
async function searchContent(type, query, settings = {}) {
  if (!query?.trim()) return []
  switch (type) {
    case 'books':   return await searchBooks(query)
    case 'travel':  return await searchWiki(query)
    case 'games':   return await searchGames(query, settings.rawg_key)
    case 'movies':  return { redirect: 'use_tmdb' }
    default:        return await searchWiki(query)
  }
}

module.exports = { searchContent, searchBooks, searchWiki, searchGames }
