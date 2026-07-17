const https = require('https')
const fs = require('fs')

const db = JSON.parse(fs.readFileSync('C:/Users/Ozod/AppData/Roaming/notelab/notelab.json'))
const key = db.settings.gemini_key

const req = https.request({
  hostname: 'generativelanguage.googleapis.com',
  path: '/v1beta/models?key=' + key,
  method: 'GET',
}, (res) => {
  let d = ''
  res.on('data', c => d += c)
  res.on('end', () => {
    const parsed = JSON.parse(d)
    const models = (parsed.models || []).map(m => m.name)
    console.log('Mavjud modellar:\n' + models.join('\n'))
  })
})
req.on('error', e => console.error(e))
req.end()
