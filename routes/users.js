const express = require('express');
const { body } = require('express-validator');
const User = require('../models/User');
const { authenticate, authorize } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

router.get('/me', authenticate, async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');
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

    const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true }).select('-password');
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
});

router.get('/', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const users = await User.find({ isDeleted: false }).select('-password').sort('-createdAt').limit(200);
    res.json({ success: true, users });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
