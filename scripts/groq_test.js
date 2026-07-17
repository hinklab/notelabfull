const fs = require('fs')
const path = require('path')
const https = require('https')

const dbPath = path.join(process.env.APPDATA, 'notelab', 'notelab.json')
if (!fs.existsSync(dbPath)) {
  console.error('NOT_FOUND', dbPath)
  process.exit(1)
}
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'))
const apiKey = db.settings?.groq_key
if (!apiKey) {
  console.error('NO_GROQ_KEY')
  process.exit(1)
}

const payload = JSON.stringify({
  model: 'llama-3.3-70b-versatile',
  messages: [{ role: 'user', content: 'salom' }],
})

const options = {
  hostname: 'api.groq.com',
  path: '/openai/v1/chat/completions',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: 'Bearer ' + apiKey,
    'Content-Length': Buffer.byteLength(payload),
  },
  timeout: 10000,
}

const req = https.request(options, (res) => {
  let data = ''
  res.on('data', (chunk) => { data += chunk })
  res.on('end', () => {
    console.log('STATUS', res.statusCode, res.statusMessage)
    console.log(data.slice(0, 1000))
  })
})

req.on('error', (err) => {
  console.error('REQUEST_ERROR', err.message)
})
req.on('timeout', () => {
  console.error('REQUEST_TIMEOUT')
  req.destroy()
})

req.write(payload)
req.end()
