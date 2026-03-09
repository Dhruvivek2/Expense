require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');

const transactionRoutes = require('./routes/transactions');
const categoryRoutes = require('./routes/categories');
const budgetRoutes = require('./routes/budgets');
const reportRoutes = require('./routes/reports');
const emailRoutes = require('./routes/email');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.', data: null },
});

app.use('/api', apiLimiter);
app.use('/api/transactions', transactionRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/email', emailRoutes);

const staticLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
});

app.get('*', staticLimiter, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/expense-tracker';

async function seedDefaultCategories() {
  const Category = require('./models/Category');
  const count = await Category.countDocuments({ isDefault: true });
  if (count === 0) {
    const defaults = [
      { name: 'Food', color: '#FF6384', icon: '🍔', isDefault: true },
      { name: 'Transport', color: '#36A2EB', icon: '🚗', isDefault: true },
      { name: 'Shopping', color: '#FFCE56', icon: '🛍️', isDefault: true },
      { name: 'Bills', color: '#FF9F40', icon: '💡', isDefault: true },
      { name: 'Health', color: '#4BC0C0', icon: '🏥', isDefault: true },
      { name: 'Entertainment', color: '#9966FF', icon: '🎮', isDefault: true },
      { name: 'Salary', color: '#2ECC71', icon: '💼', isDefault: true },
      { name: 'Other', color: '#95A5A6', icon: '📦', isDefault: true },
    ];
    await Category.insertMany(defaults);
    console.log('Default categories seeded.');
  }
}

mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');
    await seedDefaultCategories();
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });

module.exports = app;
