const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const authenticateToken = require('../middleware/auth');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'saif_expense_tracker_secret_jwt_key_2026';

// Default categories created for newly registered users
const DEFAULT_CATEGORIES = [
    { name: 'Salary', type: 'income' },
    { name: 'Freelance & Bonus', type: 'income' },
    { name: 'Investments', type: 'income' },
    { name: 'Other Income', type: 'income' },
    { name: 'Food & Groceries', type: 'expense' },
    { name: 'Rent & Housing', type: 'expense' },
    { name: 'Utilities & Bills', type: 'expense' },
    { name: 'Transportation', type: 'expense' },
    { name: 'Entertainment & Leisure', type: 'expense' },
    { name: 'Healthcare & Fitness', type: 'expense' },
    { name: 'Shopping', type: 'expense' },
    { name: 'Education', type: 'expense' },
    { name: 'Miscellaneous', type: 'expense' }
];

// REGISTER USER
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: 'Please provide name, email, and password.' });
        }

        const trimmedEmail = email.trim().toLowerCase();

        // Check if user already exists
        const [existing] = await pool.query('SELECT user_id FROM users WHERE email = ?', [trimmedEmail]);
        if (existing.length > 0) {
            return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insert user into users table
        const [result] = await pool.query(
            'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
            [name.trim(), trimmedEmail, hashedPassword]
        );

        const userId = result.insertId;

        // Auto-seed default categories for the new user
        const categoryValues = DEFAULT_CATEGORIES.map(cat => [userId, cat.name, cat.type]);
        await pool.query(
            'INSERT INTO categories (user_id, category_name, category_type) VALUES ?',
            [categoryValues]
        );

        // Generate JWT token
        const token = jwt.sign(
            { userId: userId, email: trimmedEmail, name: name.trim() },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        return res.status(201).json({
            success: true,
            message: 'User registered successfully!',
            token,
            user: {
                user_id: userId,
                name: name.trim(),
                email: trimmedEmail
            }
        });
    } catch (err) {
        console.error('Registration error:', err);
        return res.status(500).json({ success: false, message: 'Server error during registration.', error: err.message });
    }
});

// LOGIN USER
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Please enter both email and password.' });
        }

        const trimmedEmail = email.trim().toLowerCase();

        // Check user
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [trimmedEmail]);
        if (users.length === 0) {
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }

        const user = users[0];

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid email or password.' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.user_id, email: user.email, name: user.name },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        return res.json({
            success: true,
            message: 'Logged in successfully!',
            token,
            user: {
                user_id: user.user_id,
                name: user.name,
                email: user.email
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        return res.status(500).json({ success: false, message: 'Server error during login.', error: err.message });
    }
});

// GET CURRENT USER PROFILE
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const [users] = await pool.query(
            'SELECT user_id, name, email, created_at FROM users WHERE user_id = ?',
            [req.user.userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        return res.json({ success: true, user: users[0] });
    } catch (err) {
        console.error('Profile fetch error:', err);
        return res.status(500).json({ success: false, message: 'Server error fetching profile.' });
    }
});

module.exports = router;
