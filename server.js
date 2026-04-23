require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const path = require('path');

const connectDatabase = require('./config/database');
const securityMiddleware = require('./middleware/security');
const sanitizeInputs = require('./middleware/sanitization');
const { globalLimiter } = require('./middleware/rateLimit');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const restaurantRoutes = require('./routes/restaurants');
const menuRoutes = require('./routes/menu');
const orderRoutes = require('./routes/orders');
const reviewRoutes = require('./routes/reviews');
const searchRoutes = require('./routes/search');

const app = express();

securityMiddleware.forEach((middleware) => app.use(middleware));
app.use(globalLimiter);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(sanitizeInputs);
app.use(morgan('dev'));

app.use(express.static(path.join(__dirname)));
app.use('/public', express.static(path.join(__dirname, 'public')));

app.get('/health', (_req, res) => {
  res.json({ success: true, status: 'ok', service: 'BombayLane API' });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api', reviewRoutes);
app.use('/api/search', searchRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const startServer = async () => {
  try {
    await connectDatabase();
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = app;
