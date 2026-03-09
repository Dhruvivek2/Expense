const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');

// GET /api/reports/summary
router.get('/summary', async (req, res, next) => {
  try {
    const { startDate, endDate, category, type } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (category) filter.category = category;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
    }

    const [byCategory, totals] = await Promise.all([
      Transaction.aggregate([
        { $match: filter },
        { $group: { _id: { category: '$category', type: '$type' }, total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } },
      ]),
      Transaction.aggregate([
        { $match: filter },
        { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 }, max: { $max: '$amount' }, avg: { $avg: '$amount' } } },
      ]),
    ]);

    const income = totals.find((t) => t._id === 'income') || { total: 0, count: 0, max: 0, avg: 0 };
    const expense = totals.find((t) => t._id === 'expense') || { total: 0, count: 0, max: 0, avg: 0 };

    res.json({
      success: true,
      data: {
        byCategory,
        income: { total: income.total, count: income.count, max: income.max, avg: income.avg },
        expense: { total: expense.total, count: expense.count, max: expense.max, avg: expense.avg },
        balance: income.total - expense.total,
      },
      message: 'Summary retrieved',
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/monthly
router.get('/monthly', async (req, res, next) => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const data = await Transaction.aggregate([
      { $match: { date: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: '$date' }, month: { $month: '$date' }, type: '$type' },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    res.json({ success: true, data, message: 'Monthly report retrieved' });
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/daily
router.get('/daily', async (req, res, next) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const data = await Transaction.aggregate([
      { $match: { date: { $gte: startOfMonth, $lte: endOfMonth }, type: 'expense' } },
      {
        $group: {
          _id: { day: { $dayOfMonth: '$date' } },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.day': 1 } },
    ]);

    res.json({ success: true, data, message: 'Daily report retrieved' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
