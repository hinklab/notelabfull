const { app, BrowserWindow, shell } = require('electron')
const path = require('path')
const { spawn } = require('child_process')

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

let win
let apiServer

function getApiPath() {
  // In dev: electron/../notelab-api/src/index.js
  // In production: resources/notelab-api/src/index.js (asar unpacked)
  if (isDev) {
    return path.join(__dirname, '../notelab-api/src/index.js')
  }
  // Production: app is in resources/app.asar, API is in resources/notelab-api
  return path.join(process.resourcesPath, 'notelab-api/src/index.js')
}

function startApiServer() {
  const apiPath = getApiPath()
  const apiCwd = isDev 
    ? path.join(__dirname, '../notelab-api')
    : path.join(process.resourcesPath, 'notelab-api')
  
  console.log('Starting API server from:', apiPath)
  console.log('API working directory:', apiCwd)
  
  apiServer = spawn('node', [apiPath], {
    stdio: 'inherit',
    cwd: apiCwd,
    env: { ...process.env, PORT: '3000' }
  })
  
  apiServer.on('error', (err) => {
    console.error('API server failed to start:', err)
  })
  
  console.log('API server started on port 3000')
}

function createWindow() {
  win = new BrowserWindow({
    width: 1600,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    backgroundColor: '#0b0b0b',
    frame: true,
    autoHideMenuBar: true,
    title: 'notelab',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile(path.join(__dirname, '../renderer/dist/index.html'))
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

app.whenReady().then(async () => {
  startApiServer()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (apiServer) {
    apiServer.kill()
    apiServer = null
  }
  if (process.platform !== 'darwin') app.quit()
})
