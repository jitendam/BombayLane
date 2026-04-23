const express = require('express');
const { body } = require('express-validator');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

const USER_SAFE_SELECT = {
  id: true, name: true, email: true, role: true,
  phone: true, address: true, preferences: true,
  isDeleted: true, createdAt: true, updatedAt: true
};

router.get('/me', authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id }, select: USER_SAFE_SELECT });
  res.json({ success: true, user });
});

router.put('/me', authenticate, [
  body('name').optional().trim().isLength({ min: 2 }),
  body('address').optional().trim().isLength({ min: 5 })
], handleValidationErrors, async (req, res, next) => {
  try {
    const updates = {};
    if (typeof req.body.name === 'string') updates.name = req.body.name;
    if (typeof req.body.address === 'string') updates.address = req.body.address;
    if (typeof req.body.phone === 'string') updates.phone = req.body.phone;
    if (req.body.preferences && typeof req.body.preferences === 'object') updates.preferences = req.body.preferences;

    const user = await prisma.user.update({ where: { id: req.user.id }, data: updates, select: USER_SAFE_SELECT });
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
});

router.get('/', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { isDeleted: false },
      select: USER_SAFE_SELECT,
      orderBy: { createdAt: 'desc' },
      take: 200
    });
    res.json({ success: true, users });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
