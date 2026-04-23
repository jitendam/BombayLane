const mongoose = require('mongoose');

const connectDatabase = async () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bombaylane';

  mongoose.set('strictQuery', true);
  mongoose.set('sanitizeFilter', true);

  await mongoose.connect(mongoUri, {
    autoIndex: true,
    serverSelectionTimeoutMS: 5000
  });

  return mongoose.connection;
};

module.exports = connectDatabase;
