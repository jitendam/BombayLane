const levels = ['error', 'warn', 'info', 'debug'];

const log = (level, message, meta = {}) => {
  if (!levels.includes(level)) return;
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...meta
  };
  const method = level === 'debug' ? 'log' : level;
  console[method](JSON.stringify(payload));
};

module.exports = {
  error: (message, meta) => log('error', message, meta),
  warn: (message, meta) => log('warn', message, meta),
  info: (message, meta) => log('info', message, meta),
  debug: (message, meta) => log('debug', message, meta)
};
