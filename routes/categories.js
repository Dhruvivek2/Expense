const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Category = require('../models/Category');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validation error', data: errors.array() });
  }
  next();
};

// GET /api/categories
router.get('/', async (req, res, next) => {
  try {
    const categories = await Category.find().sort({ isDefault: -1, name: 1 });
    res.json({ success: true, data: categories, message: 'Categories retrieved' });
  } catch (err) {
    next(err);
  }
});

// POST /api/categories
router.post(
  '/',
  [
    body('name').notEmpty().trim().withMessage('Name is required'),
    body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Color must be a valid hex color'),
    body('icon').optional().isString(),
  ],
  validate,
  async (req, res, next) => {
    try {
      const existing = await Category.findOne({ name: req.body.name });
      if (existing) return res.status(409).json({ success: false, message: 'Category already exists', data: null });
      const category = await Category.create({ ...req.body, isDefault: false });
      res.status(201).json({ success: true, data: category, message: 'Category created' });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/categories/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: 'Category not found', data: null });
    if (category.isDefault) return res.status(403).json({ success: false, message: 'Cannot delete default category', data: null });
    await category.deleteOne();
    res.json({ success: true, data: null, message: 'Category deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
