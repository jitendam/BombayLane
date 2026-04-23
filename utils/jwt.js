const jwt = require('jsonwebtoken');

const getSecret = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is required');
  }
  return process.env.JWT_SECRET;
};

const generateToken = (payload) => jwt.sign(payload, getSecret(), {
  expiresIn: process.env.JWT_EXPIRES_IN || '7d'
});

const verifyToken = (token) => jwt.verify(token, getSecret());

module.exports = {
  generateToken,
  verifyToken
};
