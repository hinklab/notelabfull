const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')

// Clear Vite cache before starting
const viteCacheDir = path.join(__dirname, '..', 'renderer', 'node_modules', '.vite')
if (fs.existsSync(viteCacheDir)) {
  fs.rmSync(viteCacheDir, { recursive: true, force: true })
  console.log('Vite cache tozalandi')
}

// Start Vite
const vite = spawn('npx', ['vite', 'renderer', '--port', '5173', '--force'], {
  shell: true,
  stdio: 'inherit',
  cwd: path.join(__dirname, '..'),
})

// Wait 5 seconds for Vite to start, then launch Electron
setTimeout(() => {
  const electron = spawn('npx', ['electron', '.'], {
    shell: true,
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development' },
    cwd: path.join(__dirname, '..'),
  })

  electron.on('close', () => {
    vite.kill()
    process.exit(0)
  })
}, 5000)

vite.on('error', (e) => console.error('Vite xato:', e))
