const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')

// Clear Vite cache
const viteCacheDir = path.join(__dirname, '..', 'node_modules', '.vite')
if (fs.existsSync(viteCacheDir)) {
  fs.rmSync(viteCacheDir, { recursive: true, force: true })
  console.log('Vite cache tozalandi')
}

// Start API server
const api = spawn('node', ['src/index.js'], {
  shell: true,
  stdio: 'inherit',
  cwd: path.join(__dirname, '..', 'notelab-api'),
  env: { ...process.env, PORT: '3000' }
})

// Start Vite (browser-only, no Electron)
const vite = spawn('npx', ['vite', 'renderer', '--port', '5173'], {
  shell: true,
  stdio: 'inherit',
  cwd: path.join(__dirname, '..'),
})

vite.on('error', (e) => console.error('Vite error:', e))
api.on('error', (e) => console.error('API error:', e))

process.on('SIGINT', () => {
  vite.kill()
  api.kill()
  process.exit(0)
})
