# Saif's Personal Expense Tracker Management System

> **A full-stack, responsive personal finance and daily expense tracker management system built using HTML5, CSS3, JavaScript (ES6+), Express.js (Node.js), and MySQL.**
> Developed by: **Saif Shaik** ([@saifshaik27](https://github.com/saifshaik27))

---

## 📌 Project Overview

**Saif's Personal Expense Tracker Management System** helps users manage daily finances seamlessly. It allows users to track their daily income and expenses, categorize transactions, set monthly budgets with intelligent limit notifications, and analyze spending habits through visual charts and downloadable CSV reports.

---

## 🌟 Key Features

- **User Authentication**: Secure user registration and login with encrypted passwords (`bcryptjs`) and JSON Web Tokens (`JWT`).
- **Dynamic Transaction Management**:
  - Add, edit, view, and delete daily income and expense entries.
  - Filter by date range, category, transaction type, or keyword search.
- **Category Customization**:
  - Flexible income and expense categories (Food, Rent, Salary, Freelance, Utilities, Healthcare, etc.).
  - Ability to create and manage custom categories.
- **Monthly Budget Watch**:
  - Set spending thresholds for any month/year.
  - Real-time gauge comparing total spent against budget limit.
  - Visual status alerts: Safe (Green), Caution 80%+ (Yellow), and Over-Budget (Red).
- **Spend Reports & Analytics**:
  - Inflow vs. Outflow summaries and savings rate calculation.
  - Category-wise expense distribution using interactive Doughnut/Pie charts (Chart.js).
  - 12-month Income vs. Expense bar chart trends.
  - One-click CSV report export.
- **Responsive Dashboard**:
  - Built with modern HTML5, clean CSS3 (Flexbox/Grid), and vanilla JavaScript.

---

## 🗄️ Database Architecture (MySQL)

The system strictly follows the required relational database schema with 4 normalized tables:

### Table 1: `users`
| Field Name | Data Type | Key / Constraint | Description |
|---|---|---|---|
| `user_id` | INT | PK, AUTO_INCREMENT | Unique User Identifier |
| `name` | VARCHAR(100) | NOT NULL | User Full Name |
| `email` | VARCHAR(100) | NOT NULL, UNIQUE | User Login Email |
| `password` | VARCHAR(255) | NOT NULL | Bcrypt Hashed Password |

### Table 2: `categories`
| Field Name | Data Type | Key / Constraint | Description |
|---|---|---|---|
| `category_id` | INT | PK, AUTO_INCREMENT | Unique Category Identifier |
| `user_id` | INT | FK -> `users.user_id` | Linked User (ON DELETE CASCADE) |
| `category_name` | VARCHAR(100) | NOT NULL | Name (e.g., Groceries, Salary) |
| `category_type` | VARCHAR(20) | NOT NULL | 'income' or 'expense' |

### Table 3: `transactions`
| Field Name | Data Type | Key / Constraint | Description |
|---|---|---|---|
| `transaction_id` | INT | PK, AUTO_INCREMENT | Unique Transaction Identifier |
| `user_id` | INT | FK -> `users.user_id` | Linked User (ON DELETE CASCADE) |
| `category_id` | INT | FK -> `categories.category_id` | Category (ON DELETE CASCADE) |
| `amount` | DECIMAL(10,2) | NOT NULL | Transaction Value |
| `transaction_type` | VARCHAR(20) | NOT NULL | 'income' or 'expense' |
| `description` | VARCHAR(255) | NULLABLE | Notes / Description |
| `transaction_date` | DATE | NOT NULL | Date of Transaction |

### Table 4: `budgets`
| Field Name | Data Type | Key / Constraint | Description |
|---|---|---|---|
| `budget_id` | INT | PK, AUTO_INCREMENT | Unique Budget Identifier |
| `user_id` | INT | FK -> `users.user_id` | Linked User (ON DELETE CASCADE) |
| `monthly_limit` | DECIMAL(10,2) | NOT NULL | Spending Target |
| `month` | INT | NOT NULL (1 - 12) | Target Month |
| `year` | INT | NOT NULL (e.g., 2026) | Target Year |

---

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+), FontAwesome Icons, Chart.js
- **Backend**: Express.js (Node.js runtime)
- **Database**: MySQL (using `mysql2/promise`)
- **Security**: JWT (`jsonwebtoken`) & `bcryptjs`
- **Environment**: `dotenv`, `cors`

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v16 or higher)
- **MySQL Server** (running locally on port 3306)

### 2. Clone / Setup Project
```bash
git clone https://github.com/saifshaik27/personal-expense-tracker.git
cd personal-expense-tracker
npm install
```

### 3. Configure Database
Ensure MySQL is started, then configure your `.env` file:
```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=expense_tracker_db
DB_PORT=3306
JWT_SECRET=saif_expense_tracker_secret_jwt_key_2026
APP_NAME=Saif's Personal Expense Tracker Management System
```

*(Note: The server automatically checks and creates the database and required tables upon startup! If you prefer manual setup, import `database.sql` into MySQL Workbench or phpMyAdmin).*

### 4. Run the Application
```bash
# Start server
npm start

# Or with auto-reload (development mode):
npm run dev
```

Open your browser and visit: **`http://localhost:5000`**

---

## 📤 Upload to GitHub (`saifshaik27`)

To push this project to your GitHub repository:

1. Create a new repository on [GitHub](https://github.com/new) named:
   `personal-expense-tracker` (or `saif-personal-expense-tracker`)

2. Run the following commands in your project terminal:
```bash
git init
git add .
git commit -m "Initial release: Saif's Personal Expense Tracker Management System"
git branch -M main
git remote add origin https://github.com/saifshaik27/personal-expense-tracker.git
git push -u origin main
```

---

## 📜 License
This project is open-source and available under the [MIT License](LICENSE).
