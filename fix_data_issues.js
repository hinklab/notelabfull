require('dotenv').config({ path: 'notelab-api/.env' })
const { createClient } = require('./notelab-api/node_modules/@supabase/supabase-js')
const fs = require('fs')
const https = require('https')

const DB_PATH = './notelab-api/data/notelab.json'
const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'))
const TMDB_KEY = db.settings.tmdb_key
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let d = ''
      res.on('data', c => d += c)
      res.on('end', () => { try { resolve(JSON.parse(d)) } catch(e) { reject(e) } })
    }).on('error', reject)
  })
}

async function main() {
  // Issue 13: Clear stale user_rating on non-done movies
  console.log('\n--- ISSUE #13: Stale user_rating on non-done movies ---')
  const stale = db.movies.filter(m => m.user_rating != null && m.section !== 'done')
  console.log('Found', stale.length, 'movies:')
  stale.forEach(m => console.log('  id:' + m.id + ' title=' + m.title + ' section=' + m.section + ' user_rating=' + m.user_rating))
  for (const m of stale) {
    m.user_rating = null
    m.avg_rating = null
    m.avg_user_rating = null
    const { error } = await supabase.from('movies').update({ user_rating: null, avg_rating: null, avg_user_rating: null }).eq('id', m.id)
    console.log('  Fixed id:' + m.id + ' ' + m.title + ' -', error ? ('SUPABASE ERR: ' + error.message) : 'Supabase OK')
  }

  // Issue 15a: Fix Ring of Bright Water (id:95)
  console.log('\n--- ISSUE #15a: Ring of Bright Water (id:95) ---')
  const rotbw = db.movies.find(m => m.id === 95)
  if (rotbw) {
    console.log('BEFORE: tmdb_id=' + rotbw.tmdb_id + ', director=' + rotbw.director + ', genre=' + rotbw.genre)
    const oldTmdb = rotbw.tmdb_id
    const searchUrl = 'https://api.themoviedb.org/3/search/movie?api_key=' + TMDB_KEY + '&query=Ring%20of%20Bright%20Water&year=1969&language=en-US'
    const search = await httpsGet(searchUrl)
    let hit = search.results && search.results.find(r => r.release_date && r.release_date.startsWith('1969'))
    if (!hit && search.results && search.results.length > 0) hit = search.results[0]
    if (hit) {
      console.log('TMDB found: id=' + hit.id + ' title=' + hit.title + ' (' + hit.release_date + ')')
      const detailUrl = 'https://api.themoviedb.org/3/movie/' + hit.id + '?api_key=' + TMDB_KEY + '&append_to_response=credits&language=en-US'
      const detail = await httpsGet(detailUrl)
      const directorEntry = detail.credits && detail.credits.crew && detail.credits.crew.find(c => c.job === 'Director')
      const director = directorEntry ? directorEntry.name : '-'
      const genres = (detail.genres || []).map(g => g.name).join(', ') || '-'
      const poster = hit.poster_path ? ('https://image.tmdb.org/t/p/w500' + hit.poster_path) : rotbw.poster_path
      rotbw.tmdb_id = hit.id
      rotbw.poster_path = poster
      rotbw.cover_url = poster
      rotbw.director = director
      rotbw.genre = genres
      rotbw.overview = detail.overview || ''
      rotbw.note = detail.overview || rotbw.note || ''
      console.log('AFTER: tmdb_id=' + rotbw.tmdb_id + ', director=' + rotbw.director + ', genre=' + rotbw.genre)
      console.log('Old wrong tmdb_id was: ' + oldTmdb)
      const { error } = await supabase.from('movies').update({ tmdb_id: rotbw.tmdb_id, poster_path: poster, cover_url: poster, director: rotbw.director, genre: rotbw.genre, note: rotbw.note }).eq('id', 95)
      console.log('Supabase:', error ? ('ERR: ' + error.message) : 'OK')
    } else {
      console.log('WARNING: No TMDB results for Ring of Bright Water 1969')
    }
  }

  // Issue 15b: Remove Especes duplicate (id:86), clear wrong note on id:85
  console.log("\n--- ISSUE #15b: Especes duplicates ---")
  const esp85 = db.movies.find(m => m.id === 85)
  const esp86 = db.movies.find(m => m.id === 86)
  if (esp85) console.log('id:85 section=' + esp85.section + ', tmdb_id=' + esp85.tmdb_id + ', note(first 60)=' + String(esp85.note || '').substring(0, 60))
  if (esp86) console.log('id:86 section=' + esp86.section + ', tmdb_id=' + esp86.tmdb_id)
  if (esp85 && esp86) console.log('Same tmdb_id?', String(esp85.tmdb_id) === String(esp86.tmdb_id))
  if (esp85) {
    esp85.note = ''
    const { error: e85 } = await supabase.from('movies').update({ note: '' }).eq('id', 85)
    console.log('Cleared wrong note on id:85:', e85 ? ('ERR: ' + e85.message) : 'OK')
  }
  if (esp86) {
    db.movies = db.movies.filter(m => m.id !== 86)
    const { error: e86 } = await supabase.from('movies').delete().eq('id', 86)
    console.log('Deleted duplicate id:86:', e86 ? ('ERR: ' + e86.message) : 'OK')
  } else {
    console.log('id:86 not found (may already be deleted)')
  }

  // Issue 15c: Remove Obsession duplicate (id:113), keep id:115
  console.log('\n--- ISSUE #15c: Obsession duplicates ---')
  const obs113 = db.movies.find(m => m.id === 113)
  const obs115 = db.movies.find(m => m.id === 115)
  if (obs113) console.log('id:113 section=' + obs113.section + ', user_rating=' + obs113.user_rating + ', tmdb_id=' + obs113.tmdb_id)
  if (obs115) console.log('id:115 section=' + obs115.section + ', user_rating=' + obs115.user_rating + ', tmdb_id=' + obs115.tmdb_id)
  if (obs113 && obs115) {
    console.log('Same tmdb_id?', String(obs113.tmdb_id) === String(obs115.tmdb_id))
    db.movies = db.movies.filter(m => m.id !== 113)
    const { error: e113 } = await supabase.from('movies').delete().eq('id', 113)
    console.log('Deleted id:113 (todo, no rating), kept id:115 (done, rating=' + obs115.user_rating + '):', e113 ? ('ERR: ' + e113.message) : 'OK')
  } else {
    console.log('One or both not found - skipping')
  }

  // Issue 15d: Normalize tmdb_id string -> integer
  console.log('\n--- ISSUE #15d: Normalize tmdb_id types ---')
  const strIds = db.movies.filter(m => typeof m.tmdb_id === 'string')
  console.log('Found', strIds.length, 'movies with string tmdb_id')
  for (const m of strIds) {
    const oldVal = m.tmdb_id
    m.tmdb_id = parseInt(m.tmdb_id, 10)
    const { error } = await supabase.from('movies').update({ tmdb_id: m.tmdb_id }).eq('id', m.id)
    console.log('  id:' + m.id + ' ' + m.title + ': "' + oldVal + '" -> ' + m.tmdb_id + (error ? (' SUPABASE ERR: ' + error.message) : ''))
  }

  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2))
  console.log('\nAll changes written to notelab.json. Total movies:', db.movies.length)

  console.log('\n=== FINAL VERIFICATION ===')
  const freshDB = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'))
  const s2 = freshDB.movies.filter(m => m.user_rating != null && m.section !== 'done')
  const espCheck = freshDB.movies.filter(m => String(m.tmdb_id) === '70523')
  const obsCheck = freshDB.movies.filter(m => String(m.tmdb_id) === '1339713')
  const strCheck2 = freshDB.movies.filter(m => typeof m.tmdb_id === 'string')
  const rotbwFinal = freshDB.movies.find(m => m.id === 95)
  console.log('Stale ratings remaining:', s2.length, '(expect 0)')
  console.log('Especes entries:', espCheck.length, '(expect 1)')
  console.log('Obsession entries:', obsCheck.length, '(expect 1)')
  console.log('String tmdb_ids remaining:', strCheck2.length, '(expect 0)')
  console.log('Ring of Bright Water new tmdb_id:', rotbwFinal && rotbwFinal.tmdb_id, '(should NOT be 59427)')
  console.log('Ring of Bright Water new director:', rotbwFinal && rotbwFinal.director)
}

main().catch(e => { console.error('FATAL:', e); process.exit(1) })
