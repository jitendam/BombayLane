const express = require('express');
const { body } = require('express-validator');
const Restaurant = require('../models/Restaurant');
const { authenticate, authorize } = require('../middleware/auth');
const { commonValidators, handleValidationErrors } = require('../middleware/validation');

const router = express.Router();
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

router.get('/', async (req, res, next) => {
  try {
    const { cuisine, city, minRating = 0, sort = '-averageRating' } = req.query;
    const filter = { isDeleted: false, averageRating: { $gte: Number(minRating) } };

    if (cuisine) filter.cuisine = { $in: [cuisine] };
    if (city) filter['location.city'] = new RegExp(escapeRegex(String(city)), 'i');

    const restaurants = await Restaurant.find(filter).sort(sort).limit(100);
    res.json({ success: true, restaurants });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', commonValidators.objectIdParam('id'), handleValidationErrors, async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findOne({ _id: req.params.id, isDeleted: false }).populate('owner', 'name email');
    if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });
    res.json({ success: true, restaurant });
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticate, authorize('restaurant_owner', 'admin'), [
  body('name').trim().isLength({ min: 2 }),
  body('location.address').trim().isLength({ min: 5 }),
  body('location.city').trim().isLength({ min: 2 })
], handleValidationErrors, async (req, res, next) => {
  try {
    const restaurant = await Restaurant.create({ ...req.body, owner: req.user._id });
    res.status(201).json({ success: true, restaurant });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', authenticate, commonValidators.objectIdParam('id'), handleValidationErrors, async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findOne({ _id: req.params.id, isDeleted: false });
    if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });

    const ownerMatch = String(restaurant.owner) === String(req.user._id);
    if (!(ownerMatch || req.user.role === 'admin')) {
      return res.status(403).json({ success: false, message: 'Not allowed' });
    }

    Object.assign(restaurant, req.body);
    await restaurant.save();
    res.json({ success: true, restaurant });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authenticate, commonValidators.objectIdParam('id'), handleValidationErrors, async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findOne({ _id: req.params.id, isDeleted: false });
    if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });

    const ownerMatch = String(restaurant.owner) === String(req.user._id);
    if (!(ownerMatch || req.user.role === 'admin')) {
      return res.status(403).json({ success: false, message: 'Not allowed' });
    }

    restaurant.isDeleted = true;
    await restaurant.save();

    res.json({ success: true, message: 'Restaurant deleted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
