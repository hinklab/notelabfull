const { searchContent } = require('../services/contentService')
const { getSettings } = require('../services/sqlite')

module.exports = function contentHandlers(ipcMain) {
  ipcMain.handle('content:search', async (_, type, query) => {
    try {
      const settings = getSettings()
      return await searchContent(type, query, settings)
    } catch (err) {
      console.error('content:search error:', err.message)
      return { error: err.message }
    }
  })
}
