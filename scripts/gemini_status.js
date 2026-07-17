const https = require('https')
const fs = require('fs')

const db = JSON.parse(fs.readFileSync('C:/Users/Ozod/AppData/Roaming/notelab/notelab.json'))
const key = db.settings?.gemini_key
if (!key) {
  console.error('gemini_key yoq')
  process.exit(1)
}

function req(path, body) {
  return new Promise((resolve) => {
    const opts = {
      hostname: 'generativelanguage.googleapis.com',
      path: path + '?key=' + key,
      method: body ? 'POST' : 'GET',
      headers: body ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } : {},
    }
    const r = https.request(opts, (res) => {
      let d = ''
      res.on('data', c => d += c)
      res.on('end', () => resolve({ status: res.statusCode, body: d }))
    })
    r.on('error', e => resolve({ status: 0, body: e.message }))
    if (body) r.write(body)
    r.end()
  })
}

;(async () => {
  console.log('Key:', key.slice(0, 10) + '...')

  const models = await req('/v1beta/models')
  console.log('\n[GET models]', models.status)
  console.log(models.body.slice(0, 400))

  const body = JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: 'Reply JSON only: {"ok":true}' }] }],
    generationConfig: { temperature: 0, maxOutputTokens: 100 },
  })
  const gen = await req('/v1beta/models/gemini-2.5-flash:generateContent', body)
  console.log('\n[POST generate]', gen.status)
  console.log(gen.body.slice(0, 800))
})()
