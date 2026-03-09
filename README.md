# 💰 Expense Tracker

A full-stack **Expense Tracker** web application built with Node.js, Express, MongoDB, and vanilla HTML/CSS/JavaScript.

---

## 🚀 Features

- **Dashboard** — Summary cards (Income, Expenses, Net Balance, Savings Rate) with recent transactions and charts
- **Transactions** — Add, edit, delete transactions with pagination, sorting, and filtering
- **Categories** — Default + custom categories with icons and colors
- **Budget Goals** — Monthly budget per category with progress bars and over-budget alerts
- **Data Visualization** — Doughnut (expenses by category), Bar (6-month income vs expenses), Line (daily spending)
- **Reports** — Filter by date range / category / type, stats summary, CSV export
- **Email Reminders** — Budget alert emails via Nodemailer when spending exceeds 80% of budget
- **Dark / Light Mode** — Persisted in localStorage
- **Responsive Design** — Mobile-friendly layout

---

## 📁 Project Structure

```
Expense/
├── server.js              # Express server + MongoDB connection + seeding
├── package.json
├── .env.example
├── .gitignore
├── models/
│   ├── Transaction.js
│   ├── Category.js
│   └── Budget.js
├── routes/
│   ├── transactions.js
│   ├── categories.js
│   ├── budgets.js
│   ├── reports.js
│   └── email.js
├── middleware/
│   └── errorHandler.js
└── public/
    ├── index.html
    ├── css/
    │   └── style.css
    └── js/
        ├── app.js           # Shared utilities, theme, navigation
        ├── transactions.js  # Transaction CRUD
        ├── charts.js        # Chart.js visualizations
        ├── budget.js        # Budget management
        └── reports.js       # Reports & CSV export
```

---

## ⚙️ Setup

### Prerequisites

- Node.js >= 16
- MongoDB (local or Atlas)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/Dhruvivek2/Expense.git
cd Expense

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
# Edit .env and set your MONGODB_URI and optional email settings

# 4. Start the server
npm start
```

The app will be available at **http://localhost:3000**

For development with auto-reload:

```bash
npm run dev
```

---

## 🔧 Environment Variables

| Variable       | Default                                        | Description                   |
|----------------|------------------------------------------------|-------------------------------|
| `PORT`         | `3000`                                         | Server port                   |
| `MONGODB_URI`  | `mongodb://localhost:27017/expense-tracker`    | MongoDB connection string      |
| `EMAIL_HOST`   | `smtp.gmail.com`                               | SMTP host for email reminders |
| `EMAIL_PORT`   | `587`                                          | SMTP port                     |
| `EMAIL_USER`   | —                                              | SMTP username / email address |
| `EMAIL_PASS`   | —                                              | SMTP password / app password  |
| `EMAIL_FROM`   | —                                              | Sender display name + email   |

---

## 🔌 API Reference

All responses follow the format:
```json
{ "success": true, "data": ..., "message": "..." }
```

### Transactions

| Method | Endpoint                   | Description                                     |
|--------|----------------------------|-------------------------------------------------|
| GET    | `/api/transactions`        | List (filters: type, category, startDate, endDate, page, limit) |
| POST   | `/api/transactions`        | Create transaction                              |
| PUT    | `/api/transactions/:id`    | Update transaction                              |
| DELETE | `/api/transactions/:id`    | Delete transaction                              |

### Categories

| Method | Endpoint                  | Description                  |
|--------|---------------------------|------------------------------|
| GET    | `/api/categories`         | Get all categories           |
| POST   | `/api/categories`         | Create custom category       |
| DELETE | `/api/categories/:id`     | Delete category (non-default)|

### Budgets

| Method | Endpoint              | Description                           |
|--------|-----------------------|---------------------------------------|
| GET    | `/api/budgets`        | Get budgets (filter by month/year)    |
| POST   | `/api/budgets`        | Set / update budget for a category    |
| DELETE | `/api/budgets/:id`    | Delete a budget                       |

### Reports

| Method | Endpoint                   | Description                              |
|--------|----------------------------|------------------------------------------|
| GET    | `/api/reports/summary`     | Totals by category + income vs expense   |
| GET    | `/api/reports/monthly`     | Monthly breakdown for last 6 months      |
| GET    | `/api/reports/daily`       | Daily spending for current month         |

### Email

| Method | Endpoint                  | Description                                        |
|--------|---------------------------|----------------------------------------------------|
| POST   | `/api/email/reminder`     | Send budget alert email `{ email, category, spent, budget }` |

---

## 🎨 Screenshots

_Add screenshots here after running the application._

---

## 📦 Dependencies

| Package             | Purpose                         |
|---------------------|---------------------------------|
| express             | Web framework                   |
| mongoose            | MongoDB ODM                     |
| dotenv              | Environment variable loading    |
| cors                | Cross-Origin Resource Sharing   |
| nodemailer          | Email sending                   |
| express-validator   | Request validation              |
| nodemon (dev)       | Auto-restart during development |
