const db = require('../services/sqlite')
const { resolveMovieMetadata } = require('../services/omdbService')
const { resolveFuturedMetadata } = require('../services/tmdbService')

module.exports = function movieHandlers(ipcMain) {
  ipcMain.handle('movies:getAll', (_, note_id = null) => db.getAllMovies(note_id))

  ipcMain.handle('movies:add', async (_, data) => {
    const settings    = db.getSettings()
    const tmdbKey     = settings?.tmdb_key || ''
    const omdbKey     = settings?.omdb_key || ''
    const preferFuture = data.section === 'futured'

    // --- FUTURED: avval TMDB, topilmasa OMDB fallback ---
    if (preferFuture && tmdbKey && data.title) {
      try {
        const keywords = data.keywords || []
        const tmdb = await resolveFuturedMetadata(data.title, tmdbKey, keywords)
        if (tmdb) {
          data = {
            ...data,
            title:        tmdb.title        || data.title,
            release_year: tmdb.year         || data.release_year,
            genre:        tmdb.genre        || data.genre,
            director:     tmdb.director     || data.director,
            seasons:      tmdb.seasons      || data.seasons,
            poster_path:  tmdb.poster       || data.poster_path,
            release_date: tmdb.release_date || data.release_date,
            tmdb_id:      tmdb.tmdb_id      || data.tmdb_id,
            rating:       null,
            vote_count:   null,
          }
          return db.addMovie(data)
        }
      } catch (e) {
        console.error('TMDB resolve failed:', e.message)
      }
    }

    // --- OMDB (barcha bo'limlar uchun, futured uchun fallback) ---
    if (omdbKey && data.title) {
      try {
        const resolved = await resolveMovieMetadata(data.title, {
          omdbKey,
          preferFuture,
          release_year: data.release_year,
          imdb_id:      data.imdb_id,
        })
        if (resolved) {
          data = {
            ...data,
            title:        resolved.title        || data.title,
            release_year: resolved.year         || data.release_year,
            rating:       resolved.rating       ?? data.rating,
            vote_count:   resolved.vote_count   ?? data.vote_count,
            genre:        resolved.genre        || data.genre,
            director:     resolved.director     || data.director,
            seasons:      resolved.seasons      || data.seasons,
            poster_path:  resolved.poster       || data.poster_path,
            imdb_id:      resolved.imdb_id      || data.imdb_id,
            release_date: resolved.release_date || data.release_date,
          }
        }
      } catch (e) {
        console.error('OMDB resolve failed:', e.message)
      }
    }

    return db.addMovie(data)
  })

  // Barcha filmlarni yangilash: futured → TMDB, qolganlar → OMDB
  ipcMain.handle('movies:refreshAll', async () => {
    const settings = db.getSettings()
    const tmdbKey  = settings?.tmdb_key || ''
    const omdbKey  = settings?.omdb_key || ''

    if (!tmdbKey && !omdbKey) {
      return { success: false, message: 'API kalitlar yo\'q', updated: 0 }
    }

    const allMovies = db.getAllMoviesRaw()
    let updated = 0

    for (const movie of allMovies) {
      try {
        if (movie.section === 'futured' && tmdbKey) {
          // Futured: TMDB dan yangilash
          const tmdb = await resolveFuturedMetadata(movie.title, tmdbKey)
          if (tmdb) {
            db.updateMovie(movie.id, {
              title:        tmdb.title        || movie.title,
              release_year: tmdb.year         || movie.release_year,
              genre:        tmdb.genre && tmdb.genre !== '-'       ? tmdb.genre     : movie.genre,
              director:     tmdb.director && tmdb.director !== '-' ? tmdb.director  : movie.director,
              seasons:      tmdb.seasons && tmdb.seasons !== '-'   ? tmdb.seasons   : movie.seasons,
              poster_path:  tmdb.poster       || movie.poster_path,
              tmdb_id:      tmdb.tmdb_id      || movie.tmdb_id,
              release_date: tmdb.release_date || movie.release_date,
              rating:       null,
              vote_count:   null,
            })
            updated++
          }
        } else if (movie.section !== 'futured' && omdbKey) {
          // Qolgan bo'limlar: OMDB dan yangilash
          const resolved = await resolveMovieMetadata(movie.title, {
            omdbKey,
            preferFuture: false,
            release_year: movie.release_year,
            imdb_id:      movie.imdb_id,
          })
          if (resolved) {
            db.updateMovie(movie.id, {
              title:        resolved.title        || movie.title,
              release_year: resolved.year && resolved.year !== '-' ? resolved.year : movie.release_year,
              rating:       resolved.rating       ?? movie.rating,
              vote_count:   resolved.vote_count   ?? movie.vote_count,
              genre:        resolved.genre && resolved.genre !== '-'       ? resolved.genre    : movie.genre,
              director:     resolved.director && resolved.director !== '-' ? resolved.director : movie.director,
              seasons:      resolved.seasons && resolved.seasons !== '-'   ? resolved.seasons  : movie.seasons,
              poster_path:  resolved.poster   || movie.poster_path,
              imdb_id:      resolved.imdb_id  || movie.imdb_id,
              release_date: resolved.release_date || movie.release_date,
            })
            updated++
          }
        }
      } catch (e) {
        console.error(`Refresh error for "${movie.title}":`, e.message)
      }
    }

    return { success: true, updated, total: allMovies.length }
  })

  ipcMain.handle('movies:update',  (_, id, data)              => db.updateMovie(id, data))
  ipcMain.handle('movies:delete',  (_, id)                    => db.deleteMovie(id))
  ipcMain.handle('movies:move',    (_, id, section, position) => db.moveMovie(id, section, position ?? null))
  ipcMain.handle('movies:reorder', (_, section, ids)          => db.reorderMovies(section, ids))
}
