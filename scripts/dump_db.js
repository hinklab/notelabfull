const fs = require('fs')
const path = require('path')

function findDbPath() {
  const candidates = []
  const appData = process.env.APPDATA || (process.env.USERPROFILE ? path.join(process.env.USERPROFILE, 'AppData', 'Roaming') : null)
  if (appData) candidates.push(path.join(appData, 'notelab', 'notelab.json'))
  // fallback to common locations
  candidates.push(path.join(process.cwd(), 'notelab.json'))
  candidates.push(path.join(process.cwd(), '..', 'notelab.json'))
  return candidates
}

const candidates = findDbPath()
let found = null
for (const p of candidates) {
  try {
    const raw = fs.readFileSync(p, 'utf-8')
    console.log('FOUND_DB_PATH:', p)
    console.log(raw)
    found = p
    break
  } catch (e) {
    // continue
  }
}

if (!found) {
  console.error('Could not find notelab.json in candidate locations:')
  console.error(candidates.join('\n'))
  process.exitCode = 2
}
