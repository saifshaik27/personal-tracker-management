const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const authenticateToken = require('../middleware/auth');

router.use(authenticateToken);

// GET all budgets for current user
router.get('/', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { year } = req.query;

        let query = 'SELECT * FROM budgets WHERE user_id = ?';
        const params = [userId];

        if (year && !isNaN(parseInt(year))) {
            query += ' AND year = ?';
            params.push(parseInt(year));
        }

        query += ' ORDER BY year DESC, month DESC';

        const [budgets] = await pool.query(query, params);
        return res.json({ success: true, count: budgets.length, data: budgets });
    } catch (err) {
        console.error('Fetch budgets error:', err);
        return res.status(500).json({ success: false, message: 'Server error fetching budgets.' });
    }
});

// GET budget status and actual expense comparison for a specific month and year
router.get('/status', async (req, res) => {
    try {
        const userId = req.user.userId;
        const now = new Date();
        const month = req.query.month ? parseInt(req.query.month) : (now.getMonth() + 1);
        const year = req.query.year ? parseInt(req.query.year) : now.getFullYear();

        // 1. Get budget for this month/year
        const [budgets] = await pool.query(
            'SELECT * FROM budgets WHERE user_id = ? AND month = ? AND year = ?',
            [userId, month, year]
        );

        const budget = budgets.length > 0 ? budgets[0] : null;
        const monthlyLimit = budget ? parseFloat(budget.monthly_limit) : 0;

        // 2. Get total expense for this month/year
        const [expenseResult] = await pool.query(`
            SELECT COALESCE(SUM(amount), 0) AS total_expense 
            FROM transactions 
            WHERE user_id = ? 
              AND transaction_type = 'expense'
              AND MONTH(transaction_date) = ? 
              AND YEAR(transaction_date) = ?
        `, [userId, month, year]);

        const totalSpent = parseFloat(expenseResult[0].total_expense) || 0;
        const remaining = monthlyLimit > 0 ? (monthlyLimit - totalSpent) : 0;
        const percentageUsed = monthlyLimit > 0 ? Math.min(Math.round((totalSpent / monthlyLimit) * 100 * 10) / 10, 999) : 0;

        const isOverBudget = monthlyLimit > 0 && totalSpent > monthlyLimit;
        const isNearLimit = monthlyLimit > 0 && percentageUsed >= 80 && !isOverBudget;

        return res.json({
            success: true,
            data: {
                has_budget: budget !== null,
                budget_id: budget ? budget.budget_id : null,
                month,
                year,
                monthly_limit: monthlyLimit,
                total_spent: totalSpent,
                remaining_budget: Math.round(remaining * 100) / 100,
                percentage_used: percentageUsed,
                is_over_budget: isOverBudget,
                is_near_limit: isNearLimit
            }
        });
    } catch (err) {
        console.error('Fetch budget status error:', err);
        return res.status(500).json({ success: false, message: 'Server error calculating budget status.' });
    }
});

// SET or UPDATE budget (Upsert)
router.post('/', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { monthly_limit, month, year } = req.body;

        if (monthly_limit === undefined || !month || !year) {
            return res.status(400).json({
                success: false,
                message: 'monthly_limit, month (1-12), and year are required.'
            });
        }

        const limit = parseFloat(monthly_limit);
        const m = parseInt(month);
        const y = parseInt(year);

        if (isNaN(limit) || limit <= 0) {
            return res.status(400).json({ success: false, message: 'monthly_limit must be a positive number.' });
        }

        if (isNaN(m) || m < 1 || m > 12) {
            return res.status(400).json({ success: false, message: 'month must be between 1 and 12.' });
        }

        if (isNaN(y) || y < 2000 || y > 2100) {
            return res.status(400).json({ success: false, message: 'year is invalid.' });
        }

        // Upsert query
        await pool.query(`
            INSERT INTO budgets (user_id, monthly_limit, month, year)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE monthly_limit = VALUES(monthly_limit)
        `, [userId, limit, m, y]);

        const [saved] = await pool.query(
            'SELECT * FROM budgets WHERE user_id = ? AND month = ? AND year = ?',
            [userId, m, y]
        );

        return res.status(200).json({
            success: true,
            message: `Budget of $${limit.toFixed(2)} set for ${m}/${y} successfully!`,
            data: saved[0]
        });
    } catch (err) {
        console.error('Save budget error:', err);
        return res.status(500).json({ success: false, message: 'Server error saving budget.' });
    }
});

// DELETE budget
router.delete('/:id', async (req, res) => {
    try {
        const budgetId = parseInt(req.params.id);
        const [existing] = await pool.query('SELECT * FROM budgets WHERE budget_id = ? AND user_id = ?', [budgetId, req.user.userId]);

        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Budget not found or unauthorized.' });
        }

        await pool.query('DELETE FROM budgets WHERE budget_id = ? AND user_id = ?', [budgetId, req.user.userId]);

        return res.json({ success: true, message: 'Budget deleted successfully.' });
    } catch (err) {
        console.error('Delete budget error:', err);
        return res.status(500).json({ success: false, message: 'Server error deleting budget.' });
    }
});

module.exports = router;
