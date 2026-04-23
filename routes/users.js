const express = require('express');
const { body } = require('express-validator');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
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
    const user = await User.findByIdAndUpdate(req.user._id, req.body, { new: true }).select('-password');
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
