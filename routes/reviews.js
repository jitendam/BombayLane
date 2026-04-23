const express = require('express');
const mongoose = require('mongoose');
const { body } = require('express-validator');
const Review = require('../models/Review');
const Restaurant = require('../models/Restaurant');
const { authenticate } = require('../middleware/auth');
const { commonValidators, handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

const recalculateRating = async (restaurantId) => {
  const stats = await Review.aggregate([
    { $match: { restaurant: restaurantId, isDeleted: false } },
    { $group: { _id: '$restaurant', avg: { $avg: '$rating' } } }
  ]);
  const averageRating = stats[0]?.avg || 0;
  await Restaurant.findByIdAndUpdate(restaurantId, { averageRating: Number(averageRating.toFixed(2)) });
};

router.post('/restaurants/:id/reviews', authenticate, [
  ...commonValidators.objectIdParam('id'),
  body('rating').isInt({ min: 1, max: 5 }),
  body('comment').optional().isString().isLength({ max: 500 })
], handleValidationErrors, async (req, res, next) => {
  try {
    const restaurantId = mongoose.Types.ObjectId.createFromHexString(String(req.params.id));
    const restaurant = await Restaurant.findById(restaurantId).where('isDeleted').equals(false);
    if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });

    const userId = mongoose.Types.ObjectId.createFromHexString(String(req.user._id));
    const review = await Review.findOneAndUpdate(
      { restaurant: restaurantId, user: userId },
      {
        $set: {
          rating: Number(req.body.rating),
          comment: req.body.comment,
          photos: Array.isArray(req.body.photos) ? req.body.photos : []
        },
        $setOnInsert: {
          restaurant: restaurantId,
          user: userId
        }
      },
      { upsert: true, new: true }
    );

    await recalculateRating(restaurantId);
    res.status(201).json({ success: true, review });
  } catch (error) {
    next(error);
  }
});

router.get('/restaurants/:id/reviews', commonValidators.objectIdParam('id'), handleValidationErrors, async (req, res, next) => {
  try {
    const reviews = await Review.find({ restaurant: req.params.id, isDeleted: false })
      .populate('user', 'name')
      .sort('-createdAt');

    res.json({ success: true, reviews });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
