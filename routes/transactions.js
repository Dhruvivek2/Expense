const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');
const Transaction = require('../models/Transaction');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validation error', data: errors.array() });
  }
  next();
};

// GET /api/transactions/:id
router.get('/:id', async (req, res, next) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) return res.status(404).json({ success: false, message: 'Transaction not found', data: null });
    res.json({ success: true, data: transaction, message: 'Transaction retrieved' });
  } catch (err) {
    next(err);
  }
});

// GET /api/transactions
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { type, category, startDate, endDate, page = 1, limit = 20, sort = 'date', order = 'desc' } = req.query;
      const filter = {};
      if (type) filter.type = type;
      if (category) filter.category = category;
      if (startDate || endDate) {
        filter.date = {};
        if (startDate) filter.date.$gte = new Date(startDate);
        if (endDate) filter.date.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
      }
      const sortObj = { [sort]: order === 'asc' ? 1 : -1 };
      const skip = (parseInt(page) - 1) * parseInt(limit);
      const [transactions, total] = await Promise.all([
        Transaction.find(filter).sort(sortObj).skip(skip).limit(parseInt(limit)),
        Transaction.countDocuments(filter),
      ]);
      res.json({
        success: true,
        data: transactions,
        message: 'Transactions retrieved',
        pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / parseInt(limit)) },
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/transactions
router.post(
  '/',
  [
    body('title').notEmpty().trim().withMessage('Title is required'),
    body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be positive'),
    body('type').isIn(['income', 'expense']).withMessage('Type must be income or expense'),
    body('category').notEmpty().trim().withMessage('Category is required'),
    body('date').optional().isISO8601().withMessage('Invalid date'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const transaction = await Transaction.create(req.body);
      res.status(201).json({ success: true, data: transaction, message: 'Transaction created' });
    } catch (err) {
      next(err);
    }
  }
);

// PUT /api/transactions/:id
router.put(
  '/:id',
  [
    body('title').optional().notEmpty().trim(),
    body('amount').optional().isFloat({ min: 0.01 }),
    body('type').optional().isIn(['income', 'expense']),
    body('date').optional().isISO8601(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const transaction = await Transaction.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
      if (!transaction) return res.status(404).json({ success: false, message: 'Transaction not found', data: null });
      res.json({ success: true, data: transaction, message: 'Transaction updated' });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/transactions/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const transaction = await Transaction.findByIdAndDelete(req.params.id);
    if (!transaction) return res.status(404).json({ success: false, message: 'Transaction not found', data: null });
    res.json({ success: true, data: null, message: 'Transaction deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
