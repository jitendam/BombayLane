const express = require('express');
const mongoose = require('mongoose');
const { body } = require('express-validator');
const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const MenuItem = require('../models/MenuItem');
const { authenticate } = require('../middleware/auth');
const { commonValidators, handleValidationErrors } = require('../middleware/validation');

const router = express.Router();
const TAX_RATE = Number(process.env.TAX_RATE || 0.05);
const FREE_DELIVERY_THRESHOLD = Number(process.env.FREE_DELIVERY_THRESHOLD || 500);
const BASE_DELIVERY_FEE = Number(process.env.BASE_DELIVERY_FEE || 40);

router.post('/', authenticate, [
  body('restaurantId').isMongoId(),
  body('items').isArray({ min: 1 }),
  body('deliveryAddress').isString().isLength({ min: 5 })
], handleValidationErrors, async (req, res, next) => {
  try {
    const { restaurantId, items, deliveryAddress } = req.body;
    const restaurantObjectId = mongoose.Types.ObjectId.createFromHexString(String(restaurantId));
    const restaurant = await Restaurant.findById(restaurantObjectId).where('isDeleted').equals(false);
    if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });

    const itemObjectIds = items.map((item) => mongoose.Types.ObjectId.createFromHexString(String(item.menuItemId)));
    const menuItems = await MenuItem.find()
      .where('_id').in(itemObjectIds)
      .where('restaurant').equals(restaurantObjectId)
      .where('isDeleted').equals(false);

    const orderItems = items.map((item) => {
      const menuItem = menuItems.find((it) => String(it._id) === String(item.menuItemId));
      if (!menuItem) throw new Error('One or more menu items are invalid');
      return {
        menuItem: menuItem._id,
        name: menuItem.name,
        quantity: Number(item.quantity || 1),
        price: menuItem.price
      };
    });

    const subtotal = orderItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const tax = Number((subtotal * TAX_RATE).toFixed(2));
    const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : BASE_DELIVERY_FEE;
    const total = subtotal + tax + deliveryFee;

    const order = await Order.create({
      customer: req.user._id,
      restaurant: restaurantObjectId,
      items: orderItems,
      subtotal,
      tax,
      deliveryFee,
      total,
      deliveryAddress,
      estimatedDeliveryAt: new Date(Date.now() + (restaurant.deliveryTimeMinutes || 30) * 60000)
    });

    res.status(201).json({ success: true, order });
  } catch (error) {
    next(error);
  }
});

router.get('/', authenticate, async (req, res, next) => {
  try {
    const filter = req.user.role === 'customer' ? { customer: req.user._id } : {};
    const orders = await Order.find({ ...filter, isDeleted: false }).sort('-createdAt');
    res.json({ success: true, orders });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', authenticate, commonValidators.objectIdParam('id'), handleValidationErrors, async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, isDeleted: false }).populate('restaurant', 'name owner');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const isCustomer = String(order.customer) === String(req.user._id);
    const isOwner = order.restaurant && String(order.restaurant.owner) === String(req.user._id);

    if (!(isCustomer || isOwner || req.user.role === 'admin')) {
      return res.status(403).json({ success: false, message: 'Not allowed' });
    }

    res.json({ success: true, order });
  } catch (error) {
    next(error);
  }
});

router.put('/:id/status', authenticate, [
  ...commonValidators.objectIdParam('id'),
  body('status').isIn(['placed', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'])
], handleValidationErrors, async (req, res, next) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, isDeleted: false }).populate('restaurant', 'owner');
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const isOwner = order.restaurant && String(order.restaurant.owner) === String(req.user._id);
    if (!(isOwner || req.user.role === 'admin')) {
      return res.status(403).json({ success: false, message: 'Only restaurant owner or admin can update status' });
    }

    order.status = req.body.status;
    await order.save();

    res.json({ success: true, order });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
