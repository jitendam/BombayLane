const express = require('express');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const { commonValidators, handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

router.get('/', commonValidators.searchQuery, handleValidationErrors, async (req, res, next) => {
  try {
    const { q = '', cuisine, sort = 'rating' } = req.query;

    const restaurantFilter = {
      isDeleted: false,
      ...(cuisine ? { cuisine: { $in: [cuisine] } } : {}),
      ...(q
        ? {
            $or: [
              { name: { $regex: q, $options: 'i' } },
              { description: { $regex: q, $options: 'i' } },
              { 'location.city': { $regex: q, $options: 'i' } }
            ]
          }
        : {})
    };

    const sortMap = {
      rating: '-averageRating',
      delivery: 'deliveryTimeMinutes',
      price: 'name',
      popularity: '-createdAt'
    };

    const restaurants = await Restaurant.find(restaurantFilter).sort(sortMap[sort] || '-averageRating').limit(50);

    const menuItems = q
      ? await MenuItem.find({ isDeleted: false, name: { $regex: q, $options: 'i' } }).limit(50)
      : [];

    res.json({ success: true, restaurants, menuItems });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
