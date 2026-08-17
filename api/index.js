const serverless = require('serverless-http');
const app = require('../notelab-api/src/index.js');

module.exports = serverless(app);
