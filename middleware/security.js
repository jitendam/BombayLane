const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const defaultOrigins = ['http://localhost:3000', 'http://127.0.0.1:8000'];
const configuredOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = configuredOrigins.length ? configuredOrigins : defaultOrigins;

const securityMiddleware = [
  helmet(),
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('CORS origin denied'));
    },
    credentials: true
  }),
  compression()
];

module.exports = securityMiddleware;
