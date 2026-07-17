const https = require('https')
const fs = require('fs')

const db = JSON.parse(fs.readFileSync('C:/Users/Ozod/AppData/Roaming/notelab/notelab.json'))
const key = db.settings.gemini_key
console.log('Key:', key ? key.slice(0, 10) + '...' : 'YOQ!')

const body = JSON.stringify({
  contents: [{ role: 'user', parts: [{ text: 'Reply with only valid JSON: {"action":"chat","reply":"Salom! Men agelab."}' }] }],
  generationConfig: { temperature: 0.1, maxOutputTokens: 200 }
})

const req = https.request({
  hostname: 'generativelanguage.googleapis.com',
  path: '/v1beta/models/gemini-2.5-flash:generateContent?key=' + key,
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
}, (res) => {
  let d = ''
  res.on('data', c => d += c)
  res.on('end', () => {
    console.log('Status:', res.statusCode)
    const parsed = JSON.parse(d)
    const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text || ''
    console.log('Gemini javob:', text)
  })
})
req.on('error', e => console.error('Xato:', e))
req.write(body)
req.end()
