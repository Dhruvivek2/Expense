const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validation error', data: errors.array() });
  }
  next();
};

// POST /api/email/reminder
router.post(
  '/reminder',
  [
    body('email').isEmail().withMessage('Valid email required'),
    body('category').notEmpty().withMessage('Category is required'),
    body('spent').isFloat({ min: 0 }).withMessage('Spent must be a number'),
    body('budget').isFloat({ min: 0.01 }).withMessage('Budget must be positive'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { email, category, spent, budget } = req.body;
      const percentage = ((spent / budget) * 100).toFixed(1);

      const html = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <h2 style="color:#6C63FF;">⚠️ Budget Alert — ${category}</h2>
          <p>You have used <strong>${percentage}%</strong> of your <strong>${category}</strong> budget this month.</p>
          <table style="width:100%;border-collapse:collapse;margin:20px 0;">
            <tr style="background:#f8f9fa;">
              <td style="padding:10px;border:1px solid #dee2e6;"><strong>Budget</strong></td>
              <td style="padding:10px;border:1px solid #dee2e6;">$${parseFloat(budget).toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding:10px;border:1px solid #dee2e6;"><strong>Spent</strong></td>
              <td style="padding:10px;border:1px solid #dee2e6;color:#E74C3C;">$${parseFloat(spent).toFixed(2)}</td>
            </tr>
            <tr style="background:#f8f9fa;">
              <td style="padding:10px;border:1px solid #dee2e6;"><strong>Remaining</strong></td>
              <td style="padding:10px;border:1px solid #dee2e6;color:#2ECC71;">$${Math.max(0, budget - spent).toFixed(2)}</td>
            </tr>
          </table>
          <p style="color:#666;font-size:14px;">Review your spending in the <a href="#" style="color:#6C63FF;">Expense Tracker</a>.</p>
        </div>
      `;

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: email,
        subject: `⚠️ Budget Alert: ${category} at ${percentage}%`,
        html,
      });

      res.json({ success: true, data: null, message: 'Reminder email sent' });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
