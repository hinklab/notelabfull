const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')

// Clear Vite cache
const viteCacheDir = path.join(__dirname, '..', 'renderer', 'node_modules', '.vite')
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

// Wait 2 seconds for API to start
setTimeout(() => {
  // Start Vite
  const vite = spawn('npx', ['vite', 'renderer', '--port', '5173', '--force'], {
    shell: true,
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
  })

  // Wait 5 seconds for Vite, then launch Electron
  setTimeout(() => {
    const electron = spawn('npx', ['electron', '.'], {
      shell: true,
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'development' },
      cwd: path.join(__dirname, '..'),
    })

    electron.on('close', () => {
      vite.kill()
      api.kill()
      process.exit(0)
    })
  }, 5000)

  vite.on('error', (e) => console.error('Vite xato:', e))
}, 2000)

api.on('error', (e) => console.error('API xato:', e))
