const express = require('express');
const prisma = require('../lib/prisma');
const { commonValidators, handleValidationErrors } = require('../middleware/validation');
const { formatRestaurant } = require('../utils/formatters');

const router = express.Router();

const SORT_MAP = {
  rating: { averageRating: 'desc' },
  delivery: { deliveryTimeMinutes: 'asc' },
  price: { name: 'asc' },
  popularity: { createdAt: 'desc' }
};

router.get('/', commonValidators.searchQuery, handleValidationErrors, async (req, res, next) => {
  try {
    const { q = '', cuisine, sort = 'rating' } = req.query;
    const restaurantWhere = { isDeleted: false };

    if (cuisine) restaurantWhere.cuisine = { has: cuisine };
    if (q) {
      restaurantWhere.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { locationCity: { contains: q, mode: 'insensitive' } }
      ];
    }

    const orderBy = SORT_MAP[sort] || { averageRating: 'desc' };
    const restaurants = await prisma.restaurant.findMany({ where: restaurantWhere, orderBy, take: 50 });

    const menuItems = q
      ? await prisma.menuItem.findMany({
        where: { isDeleted: false, name: { contains: q, mode: 'insensitive' } },
        take: 50
      })
      : [];

    res.json({ success: true, restaurants: restaurants.map(formatRestaurant), menuItems });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
