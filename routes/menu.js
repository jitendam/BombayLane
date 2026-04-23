const express = require('express');
const { body } = require('express-validator');
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');
const { commonValidators, handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

const isRestaurantOwnerOrAdmin = (restaurant, user) =>
  restaurant.ownerId === user.id || user.role === 'admin';

router.get('/restaurants/:id/menu', commonValidators.objectIdParam('id'), handleValidationErrors, async (req, res, next) => {
  try {
    const items = await prisma.menuItem.findMany({
      where: { restaurantId: req.params.id, isDeleted: false, available: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }]
    });
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
    const restaurant = await prisma.restaurant.findFirst({ where: { id: req.params.id, isDeleted: false } });
    if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });
    if (!isRestaurantOwnerOrAdmin(restaurant, req.user)) {
      return res.status(403).json({ success: false, message: 'Not allowed' });
    }

    const { name, description, category, price, image, isVegetarian, available } = req.body;
    const item = await prisma.menuItem.create({
      data: {
        restaurantId: restaurant.id,
        name,
        description,
        category,
        price: Number(price),
        image,
        isVegetarian: Boolean(isVegetarian),
        available: available !== undefined ? Boolean(available) : true
      }
    });
    res.status(201).json({ success: true, item });
  } catch (error) {
    next(error);
  }
});

router.put('/menu/:id', authenticate, commonValidators.objectIdParam('id'), handleValidationErrors, async (req, res, next) => {
  try {
    const item = await prisma.menuItem.findFirst({
      where: { id: req.params.id, isDeleted: false },
      include: { restaurant: true }
    });
    if (!item) return res.status(404).json({ success: false, message: 'Menu item not found' });

    if (!isRestaurantOwnerOrAdmin(item.restaurant, req.user)) {
      return res.status(403).json({ success: false, message: 'Not allowed' });
    }

    const { name, description, category, price, image, isVegetarian, available } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (category !== undefined) data.category = category;
    if (price !== undefined) data.price = Number(price);
    if (image !== undefined) data.image = image;
    if (isVegetarian !== undefined) data.isVegetarian = Boolean(isVegetarian);
    if (available !== undefined) data.available = Boolean(available);

    const updatedItem = await prisma.menuItem.update({ where: { id: req.params.id }, data });
    res.json({ success: true, item: updatedItem });
  } catch (error) {
    next(error);
  }
});

router.delete('/menu/:id', authenticate, commonValidators.objectIdParam('id'), handleValidationErrors, async (req, res, next) => {
  try {
    const item = await prisma.menuItem.findFirst({
      where: { id: req.params.id, isDeleted: false },
      include: { restaurant: true }
    });
    if (!item) return res.status(404).json({ success: false, message: 'Menu item not found' });

    if (!isRestaurantOwnerOrAdmin(item.restaurant, req.user)) {
      return res.status(403).json({ success: false, message: 'Not allowed' });
    }

    await prisma.menuItem.update({ where: { id: req.params.id }, data: { isDeleted: true } });
    res.json({ success: true, message: 'Menu item deleted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
