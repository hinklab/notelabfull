const path = require('path')
const fs = require('fs')
const { app } = require('electron')

function readDB() {
  try {
    const dbPath = path.join(app.getPath('userData'), 'notelab.json')
    return JSON.parse(fs.readFileSync(dbPath, 'utf-8'))
  } catch (e) {
    return { movies: [], settings: {}, agent_memory: [] }
  }
}

function writeDB(db) {
  const dbPath = path.join(app.getPath('userData'), 'notelab.json')
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf-8')
}

module.exports = function settingsHandlers(ipcMain) {
  ipcMain.handle('settings:get', () => readDB().settings || {})
  ipcMain.handle('settings:save', (_, data) => {
    const db = readDB()
    db.settings = { ...db.settings, ...data }
    writeDB(db)
    return { success: true }
  })
}
