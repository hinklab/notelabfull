const db = require('../services/sqlite')

module.exports = function noteHandlers(ipcMain) {
  ipcMain.handle('notes:getAll',    ()              => db.getNotes())
  ipcMain.handle('notes:create',    (_, data)       => db.createNote(data))
  ipcMain.handle('notes:update',    (_, id, data)   => db.updateNote(id, data))
  ipcMain.handle('notes:delete',    (_, id)         => db.deleteNote(id))
  ipcMain.handle('notes:getMovies', (_, note_id)    => db.getAllMovies(note_id))

  ipcMain.handle('groups:getAll',   (_, note_id)       => db.getGroups(note_id))
  ipcMain.handle('groups:create',   (_, note_id, name) => db.createGroup(note_id, name))
  ipcMain.handle('groups:update',   (_, id, data)      => db.updateGroup(id, data))
  ipcMain.handle('groups:delete',   (_, id)            => db.deleteGroup(id))
  ipcMain.handle('groups:reorder',  (_, note_id, ids)  => db.reorderGroups(note_id, ids))

  ipcMain.handle('items:getAll',    (_, group_id)      => db.getItems(group_id))
  ipcMain.handle('items:add',       (_, group_id, data)=> db.addItem(group_id, data))
  ipcMain.handle('items:update',    (_, id, data)      => db.updateItem(id, data))
  ipcMain.handle('items:delete',    (_, id)            => db.deleteItem(id))
  ipcMain.handle('items:move',      (_, id, to_group_id, position) => db.moveItem(id, to_group_id, position))
  ipcMain.handle('items:reorder',   (_, group_id, ids) => db.reorderItems(group_id, ids))
}
