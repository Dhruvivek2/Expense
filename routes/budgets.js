const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Budget = require('../models/Budget');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validation error', data: errors.array() });
  }
  next();
};

// GET /api/budgets
router.get('/', async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const filter = {};
    if (month) filter.month = parseInt(month);
    if (year) filter.year = parseInt(year);
    const budgets = await Budget.find(filter).sort({ category: 1 });
    res.json({ success: true, data: budgets, message: 'Budgets retrieved' });
  } catch (err) {
    next(err);
  }
});

// POST /api/budgets
router.post(
  '/',
  [
    body('category').notEmpty().trim().withMessage('Category is required'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be positive'),
    body('month').isInt({ min: 1, max: 12 }).withMessage('Month must be 1-12'),
    body('year').isInt({ min: 2000, max: new Date().getFullYear() + 100 }).withMessage('Invalid year'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { category, amount, month, year } = req.body;
      const budget = await Budget.findOneAndUpdate(
        { category, month, year },
        { amount },
        { upsert: true, new: true, runValidators: true }
      );
      res.status(201).json({ success: true, data: budget, message: 'Budget saved' });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/budgets/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const budget = await Budget.findByIdAndDelete(req.params.id);
    if (!budget) return res.status(404).json({ success: false, message: 'Budget not found', data: null });
    res.json({ success: true, data: null, message: 'Budget deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
