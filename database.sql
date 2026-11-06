-- ====================================================================
-- SAIF'S PERSONAL EXPENSE TRACKER MANAGEMENT SYSTEM
-- Database Schema & Initial Setup Script
-- Developed with Express.js, MySQL, HTML5, CSS3, and JavaScript
-- Author: Saif Shaik (saifshaik27)
-- ====================================================================

-- 1. Create database if it does not already exist
CREATE DATABASE IF NOT EXISTS expense_tracker_db
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE expense_tracker_db;

-- --------------------------------------------------------------------
-- TABLE 1: users
-- Fields: user_id (PK), name, email, password
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- --------------------------------------------------------------------
-- TABLE 2: categories
-- Fields: category_id (PK), user_id (FK), category_name, category_type
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    category_name VARCHAR(100) NOT NULL,
    category_type VARCHAR(20) NOT NULL, -- 'income' or 'expense'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_categories_user FOREIGN KEY (user_id) 
        REFERENCES users(user_id) 
        ON DELETE CASCADE
) ENGINE=InnoDB;

-- --------------------------------------------------------------------
-- TABLE 3: transactions
-- Fields: transaction_id (PK), user_id (FK), category_id (FK),
--         amount, transaction_type, description, transaction_date
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transactions (
    transaction_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    category_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    transaction_type VARCHAR(20) NOT NULL, -- 'income' or 'expense'
    description VARCHAR(255),
    transaction_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_transactions_user FOREIGN KEY (user_id) 
        REFERENCES users(user_id) 
        ON DELETE CASCADE,
    CONSTRAINT fk_transactions_category FOREIGN KEY (category_id) 
        REFERENCES categories(category_id) 
        ON DELETE CASCADE
) ENGINE=InnoDB;

-- --------------------------------------------------------------------
-- TABLE 4: budgets
-- Fields: budget_id (PK), user_id (FK), monthly_limit, month, year
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS budgets (
    budget_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    monthly_limit DECIMAL(10,2) NOT NULL,
    month INT NOT NULL, -- 1 to 12
    year INT NOT NULL,  -- e.g. 2026
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_month_year UNIQUE (user_id, month, year),
    CONSTRAINT fk_budgets_user FOREIGN KEY (user_id) 
        REFERENCES users(user_id) 
        ON DELETE CASCADE
) ENGINE=InnoDB;

-- --------------------------------------------------------------------
-- OPTIONAL SEED DATA (For instant testing)
-- Default demo user password is: 'password123' (hashed with bcrypt)
-- --------------------------------------------------------------------
INSERT INTO users (user_id, name, email, password) VALUES
(1, 'Saif Shaik', 'saif@example.com', '$2a$10$wT0l0hXvI9k0mHfxYqD3UevsXzRzKqjDmgmK/oO302u/nF.4dE7yW')
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- Default categories for Saif (user_id = 1)
INSERT INTO categories (category_id, user_id, category_name, category_type) VALUES
(1, 1, 'Salary', 'income'),
(2, 1, 'Freelance', 'income'),
(3, 1, 'Investments', 'income'),
(4, 1, 'Food & Groceries', 'expense'),
(5, 1, 'Rent & Housing', 'expense'),
(6, 1, 'Utilities & Bills', 'expense'),
(7, 1, 'Transportation', 'expense'),
(8, 1, 'Entertainment & Leisure', 'expense'),
(9, 1, 'Healthcare', 'expense'),
(10, 1, 'Shopping', 'expense')
ON DUPLICATE KEY UPDATE category_name=VALUES(category_name);

-- Default monthly budget for Current Month (e.g. November 2026)
INSERT INTO budgets (user_id, monthly_limit, month, year) VALUES
(1, 45000.00, 11, 2026)
ON DUPLICATE KEY UPDATE monthly_limit=VALUES(monthly_limit);

-- Sample initial transactions
INSERT INTO transactions (user_id, category_id, amount, transaction_type, description, transaction_date) VALUES
(1, 1, 75000.00, 'income', 'Monthly Salary Deposit', '2026-11-01'),
(1, 2, 15000.00, 'income', 'Freelance Web Design Project', '2026-11-03'),
(1, 5, 20000.00, 'expense', 'Apartment Rent Payment', '2026-11-02'),
(1, 4, 3500.00, 'expense', 'Supermarket Monthly Grocery Run', '2026-11-04'),
(1, 6, 2200.00, 'expense', 'Electricity & Internet Bills', '2026-11-05'),
(1, 7, 1800.00, 'expense', 'Fuel and Metro Transit Pass', '2026-11-05'),
(1, 8, 1200.00, 'expense', 'Weekend Movie & Dinner', '2026-11-06')
ON DUPLICATE KEY UPDATE amount=VALUES(amount);
