const prisma = require('../lib/prisma');
const { verifyToken } = require('../utils/jwt');

const USER_SAFE_SELECT = {
  id: true, name: true, email: true, role: true,
  phone: true, address: true, preferences: true,
  isDeleted: true, createdAt: true, updatedAt: true
};

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const decoded = verifyToken(token);
    const user = await prisma.user.findUnique({ where: { id: decoded.id }, select: USER_SAFE_SELECT });

    if (!user || user.isDeleted) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    req.user = user;
    req.token = token;
    return next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Insufficient permissions' });
  }

  return next();
};

module.exports = {
  authenticate,
  authorize
};
