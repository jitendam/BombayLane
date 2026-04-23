const express = require('express');
const { body } = require('express-validator');
const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');
const { commonValidators, handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

const recalculateRating = async (restaurantId) => {
  const result = await prisma.review.aggregate({
    where: { restaurantId, isDeleted: false },
    _avg: { rating: true }
  });
  const averageRating = Number((result._avg.rating || 0).toFixed(2));
  await prisma.restaurant.update({ where: { id: restaurantId }, data: { averageRating } });
};

router.post('/restaurants/:id/reviews', authenticate, [
  ...commonValidators.objectIdParam('id'),
  body('rating').isInt({ min: 1, max: 5 }),
  body('comment').optional().isString().isLength({ max: 500 })
], handleValidationErrors, async (req, res, next) => {
  try {
    const restaurantId = req.params.id;
    const restaurant = await prisma.restaurant.findFirst({ where: { id: restaurantId, isDeleted: false } });
    if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });

    const userId = req.user.id;
    const review = await prisma.review.upsert({
      where: { restaurantId_userId: { restaurantId, userId } },
      update: {
        rating: Number(req.body.rating),
        comment: req.body.comment || null,
        photos: Array.isArray(req.body.photos) ? req.body.photos : []
      },
      create: {
        restaurantId,
        userId,
        rating: Number(req.body.rating),
        comment: req.body.comment || null,
        photos: Array.isArray(req.body.photos) ? req.body.photos : []
      }
    });

    await recalculateRating(restaurantId);
    res.status(201).json({ success: true, review });
  } catch (error) {
    next(error);
  }
});

router.get('/restaurants/:id/reviews', commonValidators.objectIdParam('id'), handleValidationErrors, async (req, res, next) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { restaurantId: req.params.id, isDeleted: false },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, reviews });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
