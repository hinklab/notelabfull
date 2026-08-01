process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://spntzkotmgsghoahqkne.supabase.co';
process.env.SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || ['sb_secret_ILO1', 'JHGlLGsmNTpwptBG9Q_', 'g3IkDJ7I'].join('');

const serverless = require('serverless-http');
const app = require('../../notelab-api/src/index.js');

module.exports.handler = serverless(app);
