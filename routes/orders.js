const express = require('express');
const { body } = require('express-validator');
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');
const { commonValidators, handleValidationErrors } = require('../middleware/validation');

const router = express.Router();
const TAX_RATE = Number(process.env.TAX_RATE || 0.05);
const FREE_DELIVERY_THRESHOLD = Number(process.env.FREE_DELIVERY_THRESHOLD || 500);
const BASE_DELIVERY_FEE = Number(process.env.BASE_DELIVERY_FEE || 40);

router.post('/', authenticate, [
  body('restaurantId').isUUID(),
  body('items').isArray({ min: 1 }),
  body('deliveryAddress').isString().isLength({ min: 5 })
], handleValidationErrors, async (req, res, next) => {
  try {
    const { restaurantId, items, deliveryAddress } = req.body;
    const restaurant = await prisma.restaurant.findFirst({ where: { id: restaurantId, isDeleted: false } });
    if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });

    const itemIds = items.map((item) => String(item.menuItemId));
    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: itemIds }, restaurantId, isDeleted: false }
    });

    const orderItems = items.map((item) => {
      const menuItem = menuItems.find((it) => it.id === String(item.menuItemId));
      if (!menuItem) throw new Error('One or more menu items are invalid');
      return {
        menuItemId: menuItem.id,
        name: menuItem.name,
        quantity: Number(item.quantity || 1),
        price: menuItem.price
      };
    });

    const subtotal = orderItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const tax = Number((subtotal * TAX_RATE).toFixed(2));
    const deliveryFee = subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : BASE_DELIVERY_FEE;
    const total = subtotal + tax + deliveryFee;

    const order = await prisma.order.create({
      data: {
        customerId: req.user.id,
        restaurantId,
        subtotal,
        tax,
        deliveryFee,
        total,
        deliveryAddress,
        estimatedDeliveryAt: new Date(Date.now() + (restaurant.deliveryTimeMinutes || 30) * 60000),
        items: { create: orderItems }
      },
      include: { items: true }
    });

    res.status(201).json({ success: true, order });
  } catch (error) {
    next(error);
  }
});

router.get('/', authenticate, async (req, res, next) => {
  try {
    const where = { isDeleted: false };
    if (req.user.role === 'customer') where.customerId = req.user.id;
    const orders = await prisma.order.findMany({ where, include: { items: true }, orderBy: { createdAt: 'desc' } });
    res.json({ success: true, orders });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', authenticate, commonValidators.objectIdParam('id'), handleValidationErrors, async (req, res, next) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, isDeleted: false },
      include: {
        items: true,
        restaurant: { select: { id: true, name: true, ownerId: true } }
      }
    });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const isCustomer = order.customerId === req.user.id;
    const isOwner = order.restaurant && order.restaurant.ownerId === req.user.id;

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
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, isDeleted: false },
      include: { restaurant: { select: { ownerId: true } } }
    });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const isOwner = order.restaurant && order.restaurant.ownerId === req.user.id;
    if (!(isOwner || req.user.role === 'admin')) {
      return res.status(403).json({ success: false, message: 'Only restaurant owner or admin can update status' });
    }

    const updated = await prisma.order.update({
      where: { id: req.params.id },
      data: { status: req.body.status },
      include: { items: true }
    });
    res.json({ success: true, order: updated });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
