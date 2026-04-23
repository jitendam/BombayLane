const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const securityMiddleware = [
  helmet(),
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
  }),
  compression()
];

module.exports = securityMiddleware;
