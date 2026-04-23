const express = require('express');
const { body } = require('express-validator');
const MenuItem = require('../models/MenuItem');
const Restaurant = require('../models/Restaurant');
const { authenticate } = require('../middleware/auth');
const { commonValidators, handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

const isRestaurantOwnerOrAdmin = (restaurant, user) => String(restaurant.owner) === String(user._id) || user.role === 'admin';

router.get('/restaurants/:id/menu', commonValidators.objectIdParam('id'), handleValidationErrors, async (req, res, next) => {
  try {
    const items = await MenuItem.find({ restaurant: req.params.id, isDeleted: false, available: true }).sort('category name');
    res.json({ success: true, items });
  } catch (error) {
    next(error);
  }
});

router.post('/restaurants/:id/menu', authenticate, [
  ...commonValidators.objectIdParam('id'),
  body('name').trim().isLength({ min: 2 }),
  body('price').isFloat({ min: 0 })
], handleValidationErrors, async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findOne({ _id: req.params.id, isDeleted: false });
    if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });
    if (!isRestaurantOwnerOrAdmin(restaurant, req.user)) {
      return res.status(403).json({ success: false, message: 'Not allowed' });
    }

    const item = await MenuItem.create({ ...req.body, restaurant: restaurant._id });
    res.status(201).json({ success: true, item });
  } catch (error) {
    next(error);
  }
});

router.put('/menu/:id', authenticate, commonValidators.objectIdParam('id'), handleValidationErrors, async (req, res, next) => {
  try {
    const item = await MenuItem.findOne({ _id: req.params.id, isDeleted: false }).populate('restaurant');
    if (!item) return res.status(404).json({ success: false, message: 'Menu item not found' });

    if (!isRestaurantOwnerOrAdmin(item.restaurant, req.user)) {
      return res.status(403).json({ success: false, message: 'Not allowed' });
    }

    Object.assign(item, req.body);
    await item.save();
    res.json({ success: true, item });
  } catch (error) {
    next(error);
  }
});

router.delete('/menu/:id', authenticate, commonValidators.objectIdParam('id'), handleValidationErrors, async (req, res, next) => {
  try {
    const item = await MenuItem.findOne({ _id: req.params.id, isDeleted: false }).populate('restaurant');
    if (!item) return res.status(404).json({ success: false, message: 'Menu item not found' });

    if (!isRestaurantOwnerOrAdmin(item.restaurant, req.user)) {
      return res.status(403).json({ success: false, message: 'Not allowed' });
    }

    item.isDeleted = true;
    await item.save();
    res.json({ success: true, message: 'Menu item deleted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
