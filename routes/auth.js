const express = require('express');
const bcrypt = require('bcryptjs');
const { body } = require('express-validator');
const prisma = require('../lib/prisma');
const { generateToken } = require('../utils/jwt');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');
const { authValidators, handleValidationErrors } = require('../middleware/validation');

const router = express.Router();
const BCRYPT_ROUNDS = Number(process.env.BCRYPT_ROUNDS || 12);

const USER_SAFE_SELECT = {
  id: true, name: true, email: true, role: true,
  phone: true, address: true, preferences: true,
  isDeleted: true, createdAt: true, updatedAt: true
};

router.post('/register', authValidators.register, handleValidationErrors, async (req, res, next) => {
  try {
    const { name, password, role, phone, address } = req.body;
    const email = String(req.body.email || '').trim().toLowerCase();

    const existing = await prisma.user.findFirst({ where: { email, isDeleted: false } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already in use' });
    }

    const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, role, phone, address },
      select: USER_SAFE_SELECT
    });

    const token = generateToken({ id: user.id, role: user.role });
    return res.status(201).json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/login', authLimiter, authValidators.login, handleValidationErrors, async (req, res, next) => {
  try {
    const password = req.body.password;
    const email = String(req.body.email || '').trim().toLowerCase();
    const user = await prisma.user.findFirst({ where: { email, isDeleted: false } });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = generateToken({ id: user.id, role: user.role });
    return res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/logout', authenticate, (_req, res) => res.json({ success: true, message: 'Logged out successfully' }));

router.get('/me', authenticate, (req, res) => {
  res.json({ success: true, user: req.user });
});

router.put('/profile', authenticate, [
  body('name').optional().trim().isLength({ min: 2 }),
  body('phone').optional().isString(),
  body('address').optional().isString()
], handleValidationErrors, async (req, res, next) => {
  try {
    const updates = {
      ...(req.body.name && { name: req.body.name }),
      ...(req.body.phone && { phone: req.body.phone }),
      ...(req.body.address && { address: req.body.address }),
      ...(req.body.preferences && { preferences: req.body.preferences })
    };

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: updates,
      select: USER_SAFE_SELECT
    });
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
