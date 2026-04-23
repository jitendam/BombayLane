const logger = require('../utils/logger');

const notFoundHandler = (req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` });
};

const errorHandler = (err, req, res, _next) => {
  logger.error('Unhandled error', {
    path: req.originalUrl,
    method: req.method,
    error: err.message
  });

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: statusCode === 500 ? 'Internal server error' : err.message
  });
};

module.exports = {
  notFoundHandler,
  errorHandler
};
