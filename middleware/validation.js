const { body, param, query, validationResult } = require('express-validator');

const passwordRule = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

const handleValidationErrors = (req, res, next) => {
  const result = validationResult(req);
  if (!result.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: result.array().map((err) => ({ field: err.path, message: err.msg }))
    });
  }
  return next();
};

const authValidators = {
  register: [
    body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').matches(passwordRule).withMessage('Password must be strong'),
    body('phone').optional().isString().isLength({ min: 7, max: 15 }),
    body('address').optional().isString().isLength({ min: 5 }),
    body('role').optional().isIn(['customer', 'restaurant_owner', 'admin'])
  ],
  login: [
    body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
    body('password').isString().notEmpty().withMessage('Password is required')
  ]
};

const commonValidators = {
  objectIdParam: (key = 'id') => [param(key).isUUID().withMessage(`${key} must be a valid id`)],
  searchQuery: [query('q').optional().trim().isLength({ min: 1, max: 100 })]
};

module.exports = {
  body,
  authValidators,
  commonValidators,
  handleValidationErrors
};
