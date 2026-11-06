const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { initializeDatabase } = require('./db');
const authRoutes = require('./routes/authRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const budgetRoutes = require('./routes/budgetRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();
const PORT = process.env.PORT || 5000;
const APP_NAME = process.env.APP_NAME || "Saif's Personal Expense Tracker Management System";

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/reports', reportRoutes);

// Health & System Info
app.get('/api/health', (req, res) => {
    res.json({
        status: 'UP',
        appName: APP_NAME,
        author: 'Saif Shaik (saifshaik27)',
        timestamp: new Date().toISOString()
    });
});

// Explicit frontend routes
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled Server Error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error occurred.',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start Server
app.listen(PORT, () => {
    console.log('====================================================');
    console.log(`🚀 ${APP_NAME}`);
    console.log(`🌐 Server running at: http://localhost:${PORT}`);
    console.log(`👤 Developer: Saif Shaik (GitHub: github.com/saifshaik27)`);
    console.log('====================================================');

    // Run automatic DB & table initialization asynchronously
    initializeDatabase().catch(err => {
        console.error('Async DB initialization notice:', err.message);
    });
});
