const handler = require('../api/index.js');
const http = require('http');

// Helper to mock request & response
function mockReqRes({ method = 'GET', url = '/api/content/search?query=arcane', headers = {}, body = null }) {
  return new Promise((resolve) => {
    const req = {
      method,
      url,
      headers: {
        host: 'localhost:3000',
        'x-user-id': '0d3da195-1d0e-458b-9f88-2879561e0da6',
        ...headers
      },
      on: (event, cb) => {
        if (event === 'data' && body) cb(JSON.stringify(body));
        if (event === 'end') cb();
      }
    };

    let statusCode = 200;
    const resHeaders = {};
    let responseData = null;

    const res = {
      setHeader: (k, v) => { resHeaders[k] = v; },
      status: (code) => {
        statusCode = code;
        return res;
      },
      json: (data) => {
        responseData = data;
        resolve({ statusCode, headers: resHeaders, data: responseData });
      },
      end: () => {
        resolve({ statusCode, headers: resHeaders, data: responseData });
      }
    };

    handler(req, res);
  });
}

(async () => {
  console.log('--- 1. Testing GET /api/content/search?query=arcane ---');
  const r1 = await mockReqRes({ url: '/api/content/search?query=arcane' });
  console.log('Status:', r1.statusCode, 'Results count:', Array.isArray(r1.data) ? r1.data.length : r1.data);
  if (Array.isArray(r1.data) && r1.data.length > 0) {
    console.log('Sample result:', { title: r1.data[0].title, tmdb_id: r1.data[0].tmdb_id, media_type: r1.data[0].media_type });
  }

  console.log('\n--- 2. Testing GET /api/content/images?tmdb_id=94605&media_type=tv ---');
  const r2 = await mockReqRes({ url: '/api/content/images?tmdb_id=94605&media_type=tv' });
  console.log('Status:', r2.statusCode, 'Images count:', r2.data?.backdrops?.length);

  console.log('\n--- 3. Testing GET /api/notes ---');
  const r3 = await mockReqRes({ url: '/api/notes' });
  console.log('Status:', r3.statusCode, 'Notes count:', Array.isArray(r3.data) ? r3.data.length : r3.data);

  console.log('\n--- 4. Testing GET /api/groups?note_id=6 ---');
  const r4 = await mockReqRes({ url: '/api/groups?note_id=6' });
  console.log('Status:', r4.statusCode, 'Groups count:', Array.isArray(r4.data) ? r4.data.length : r4.data);

  console.log('\n--- 5. Testing GET /api/movies?note_id=6 ---');
  const r5 = await mockReqRes({ url: '/api/movies?note_id=6' });
  console.log('Status:', r5.statusCode, 'Movies count:', Array.isArray(r5.data) ? r5.data.length : r5.data);

  console.log('\n--- 6. Testing GET /api/notifications ---');
  const r6 = await mockReqRes({ url: '/api/notifications' });
  console.log('Status:', r6.statusCode, 'Notifications count:', Array.isArray(r6.data) ? r6.data.length : r6.data);

  console.log('\n--- 7. Testing GET /api/franchises/viewed ---');
  const r7 = await mockReqRes({ url: '/api/franchises/viewed' });
  console.log('Status:', r7.statusCode, 'Viewed count:', Array.isArray(r7.data) ? r7.data.length : r7.data);
})();
