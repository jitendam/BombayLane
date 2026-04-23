const express = require('express');
const { body } = require('express-validator');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');
const { commonValidators, handleValidationErrors } = require('../middleware/validation');
const { formatRestaurant } = require('../utils/formatters');

const router = express.Router();

const SORT_MAP = {
  '-averageRating': { averageRating: 'desc' },
  averageRating: { averageRating: 'asc' },
  '-createdAt': { createdAt: 'desc' },
  deliveryTimeMinutes: { deliveryTimeMinutes: 'asc' }
};

router.get('/', async (req, res, next) => {
  try {
    const { cuisine, city, minRating = 0, sort = '-averageRating' } = req.query;
    const where = { isDeleted: false, averageRating: { gte: Number(minRating) } };

    if (cuisine) where.cuisine = { has: cuisine };
    if (city) where.locationCity = { contains: String(city), mode: 'insensitive' };

    const orderBy = SORT_MAP[sort] || { averageRating: 'desc' };
    const restaurants = await prisma.restaurant.findMany({ where, orderBy, take: 100 });
    res.json({ success: true, restaurants: restaurants.map(formatRestaurant) });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', commonValidators.objectIdParam('id'), handleValidationErrors, async (req, res, next) => {
  try {
    const restaurant = await prisma.restaurant.findFirst({
      where: { id: req.params.id, isDeleted: false },
      include: { owner: { select: { id: true, name: true, email: true } } }
    });
    if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });
    res.json({ success: true, restaurant: formatRestaurant(restaurant) });
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
    const { name, description, cuisine, location, openingHours, deliveryTimeMinutes, isOpen } = req.body;
    const restaurant = await prisma.restaurant.create({
      data: {
        name,
        description,
        cuisine: cuisine || [],
        ownerId: req.user.id,
        locationAddress: location.address,
        locationCity: location.city,
        locationLat: location.coordinates?.lat ?? null,
        locationLng: location.coordinates?.lng ?? null,
        openHours: openingHours?.open || '09:00',
        closeHours: openingHours?.close || '22:00',
        deliveryTimeMinutes: deliveryTimeMinutes || 30,
        isOpen: isOpen !== undefined ? isOpen : true
      }
    });
    res.status(201).json({ success: true, restaurant: formatRestaurant(restaurant) });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', authenticate, commonValidators.objectIdParam('id'), handleValidationErrors, async (req, res, next) => {
  try {
    const existing = await prisma.restaurant.findFirst({ where: { id: req.params.id, isDeleted: false } });
    if (!existing) return res.status(404).json({ success: false, message: 'Restaurant not found' });

    if (!(existing.ownerId === req.user.id || req.user.role === 'admin')) {
      return res.status(403).json({ success: false, message: 'Not allowed' });
    }

    const { name, description, cuisine, location, openingHours, deliveryTimeMinutes, isOpen } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (cuisine !== undefined) data.cuisine = cuisine;
    if (deliveryTimeMinutes !== undefined) data.deliveryTimeMinutes = deliveryTimeMinutes;
    if (isOpen !== undefined) data.isOpen = isOpen;
    if (location) {
      if (location.address) data.locationAddress = location.address;
      if (location.city) data.locationCity = location.city;
      if (location.coordinates) {
        data.locationLat = location.coordinates.lat;
        data.locationLng = location.coordinates.lng;
      }
    }
    if (openingHours) {
      if (openingHours.open) data.openHours = openingHours.open;
      if (openingHours.close) data.closeHours = openingHours.close;
    }

    const restaurant = await prisma.restaurant.update({ where: { id: req.params.id }, data });
    res.json({ success: true, restaurant: formatRestaurant(restaurant) });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authenticate, commonValidators.objectIdParam('id'), handleValidationErrors, async (req, res, next) => {
  try {
    const existing = await prisma.restaurant.findFirst({ where: { id: req.params.id, isDeleted: false } });
    if (!existing) return res.status(404).json({ success: false, message: 'Restaurant not found' });

    if (!(existing.ownerId === req.user.id || req.user.role === 'admin')) {
      return res.status(403).json({ success: false, message: 'Not allowed' });
    }

    await prisma.restaurant.update({ where: { id: req.params.id }, data: { isDeleted: true } });
    res.json({ success: true, message: 'Restaurant deleted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
