const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const authenticateToken = require('../middleware/auth');

// Protect all transaction routes
router.use(authenticateToken);

// GET transactions with advanced filtering
router.get('/', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { startDate, endDate, type, categoryId, search, month, year, limit } = req.query;

        let query = `
            SELECT 
                t.transaction_id,
                t.user_id,
                t.category_id,
                t.amount,
                t.transaction_type,
                t.description,
                DATE_FORMAT(t.transaction_date, '%Y-%m-%d') as transaction_date,
                t.created_at,
                c.category_name,
                c.category_type
            FROM transactions t
            LEFT JOIN categories c ON t.category_id = c.category_id
            WHERE t.user_id = ?
        `;
        const params = [userId];

        // Filter by type (income or expense)
        if (type && ['income', 'expense'].includes(type.toLowerCase())) {
            query += ' AND t.transaction_type = ?';
            params.push(type.toLowerCase());
        }

        // Filter by specific category
        if (categoryId && !isNaN(parseInt(categoryId))) {
            query += ' AND t.category_id = ?';
            params.push(parseInt(categoryId));
        }

        // Filter by date range
        if (startDate) {
            query += ' AND t.transaction_date >= ?';
            params.push(startDate);
        }
        if (endDate) {
            query += ' AND t.transaction_date <= ?';
            params.push(endDate);
        }

        // Filter by month & year
        if (month && !isNaN(parseInt(month))) {
            query += ' AND MONTH(t.transaction_date) = ?';
            params.push(parseInt(month));
        }
        if (year && !isNaN(parseInt(year))) {
            query += ' AND YEAR(t.transaction_date) = ?';
            params.push(parseInt(year));
        }

        // Search in description or category name
        if (search && search.trim() !== '') {
            query += ' AND (t.description LIKE ? OR c.category_name LIKE ?)';
            const searchPattern = `%${search.trim()}%`;
            params.push(searchPattern, searchPattern);
        }

        query += ' ORDER BY t.transaction_date DESC, t.transaction_id DESC';

        // Optional limit for dashboard recent transactions
        if (limit && !isNaN(parseInt(limit))) {
            query += ' LIMIT ?';
            params.push(parseInt(limit));
        }

        const [transactions] = await pool.query(query, params);
        return res.json({
            success: true,
            count: transactions.length,
            data: transactions
        });
    } catch (err) {
        console.error('Fetch transactions error:', err);
        return res.status(500).json({ success: false, message: 'Server error fetching transactions.' });
    }
});

// GET single transaction by ID
router.get('/:id', async (req, res) => {
    try {
        const txnId = parseInt(req.params.id);
        const [transactions] = await pool.query(`
            SELECT 
                t.transaction_id,
                t.user_id,
                t.category_id,
                t.amount,
                t.transaction_type,
                t.description,
                DATE_FORMAT(t.transaction_date, '%Y-%m-%d') as transaction_date,
                c.category_name,
                c.category_type
            FROM transactions t
            LEFT JOIN categories c ON t.category_id = c.category_id
            WHERE t.transaction_id = ? AND t.user_id = ?
        `, [txnId, req.user.userId]);

        if (transactions.length === 0) {
            return res.status(404).json({ success: false, message: 'Transaction not found or unauthorized.' });
        }

        return res.json({ success: true, data: transactions[0] });
    } catch (err) {
        console.error('Fetch single transaction error:', err);
        return res.status(500).json({ success: false, message: 'Server error fetching transaction.' });
    }
});

// CREATE new transaction
router.post('/', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { category_id, amount, transaction_type, description, transaction_date } = req.body;

        if (!category_id || amount === undefined || !transaction_type) {
            return res.status(400).json({
                success: false,
                message: 'Please provide category_id, amount, and transaction_type.'
            });
        }

        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            return res.status(400).json({ success: false, message: 'Amount must be a positive number.' });
        }

        const validTypes = ['income', 'expense'];
        const normalizedType = transaction_type.toLowerCase().trim();
        if (!validTypes.includes(normalizedType)) {
            return res.status(400).json({ success: false, message: "transaction_type must be 'income' or 'expense'." });
        }

        // Verify category belongs to user
        const [cats] = await pool.query(
            'SELECT * FROM categories WHERE category_id = ? AND user_id = ?',
            [category_id, userId]
        );

        if (cats.length === 0) {
            return res.status(400).json({ success: false, message: 'Selected category does not exist or does not belong to you.' });
        }

        const finalDate = transaction_date ? transaction_date : new Date().toISOString().slice(0, 10);

        const [result] = await pool.query(`
            INSERT INTO transactions (user_id, category_id, amount, transaction_type, description, transaction_date)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [userId, category_id, parsedAmount, normalizedType, description ? description.trim() : null, finalDate]);

        const [newTxn] = await pool.query(`
            SELECT 
                t.transaction_id,
                t.user_id,
                t.category_id,
                t.amount,
                t.transaction_type,
                t.description,
                DATE_FORMAT(t.transaction_date, '%Y-%m-%d') as transaction_date,
                c.category_name
            FROM transactions t
            LEFT JOIN categories c ON t.category_id = c.category_id
            WHERE t.transaction_id = ?
        `, [result.insertId]);

        return res.status(201).json({
            success: true,
            message: 'Transaction recorded successfully!',
            data: newTxn[0]
        });
    } catch (err) {
        console.error('Create transaction error:', err);
        return res.status(500).json({ success: false, message: 'Server error creating transaction.' });
    }
});

// UPDATE transaction
router.put('/:id', async (req, res) => {
    try {
        const txnId = parseInt(req.params.id);
        const userId = req.user.userId;
        const { category_id, amount, transaction_type, description, transaction_date } = req.body;

        const [existing] = await pool.query(
            'SELECT * FROM transactions WHERE transaction_id = ? AND user_id = ?',
            [txnId, userId]
        );

        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Transaction not found or unauthorized.' });
        }

        const current = existing[0];
        const newAmount = amount !== undefined ? parseFloat(amount) : current.amount;
        if (isNaN(newAmount) || newAmount <= 0) {
            return res.status(400).json({ success: false, message: 'Amount must be a positive number.' });
        }

        const newType = transaction_type ? transaction_type.toLowerCase().trim() : current.transaction_type;
        const newCategoryId = category_id !== undefined ? parseInt(category_id) : current.category_id;
        const newDesc = description !== undefined ? description : current.description;
        const newDate = transaction_date ? transaction_date : current.transaction_date;

        // Verify category belongs to user
        const [cats] = await pool.query(
            'SELECT * FROM categories WHERE category_id = ? AND user_id = ?',
            [newCategoryId, userId]
        );

        if (cats.length === 0) {
            return res.status(400).json({ success: false, message: 'Category not valid.' });
        }

        await pool.query(`
            UPDATE transactions 
            SET category_id = ?, amount = ?, transaction_type = ?, description = ?, transaction_date = ?
            WHERE transaction_id = ? AND user_id = ?
        `, [newCategoryId, newAmount, newType, newDesc, newDate, txnId, userId]);

        const [updated] = await pool.query(`
            SELECT 
                t.transaction_id,
                t.user_id,
                t.category_id,
                t.amount,
                t.transaction_type,
                t.description,
                DATE_FORMAT(t.transaction_date, '%Y-%m-%d') as transaction_date,
                c.category_name
            FROM transactions t
            LEFT JOIN categories c ON t.category_id = c.category_id
            WHERE t.transaction_id = ?
        `, [txnId]);

        return res.json({
            success: true,
            message: 'Transaction updated successfully!',
            data: updated[0]
        });
    } catch (err) {
        console.error('Update transaction error:', err);
        return res.status(500).json({ success: false, message: 'Server error updating transaction.' });
    }
});

// DELETE transaction
router.delete('/:id', async (req, res) => {
    try {
        const txnId = parseInt(req.params.id);
        const [existing] = await pool.query(
            'SELECT * FROM transactions WHERE transaction_id = ? AND user_id = ?',
            [txnId, req.user.userId]
        );

        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Transaction not found or unauthorized.' });
        }

        await pool.query('DELETE FROM transactions WHERE transaction_id = ? AND user_id = ?', [txnId, req.user.userId]);

        return res.json({ success: true, message: 'Transaction deleted successfully.' });
    } catch (err) {
        console.error('Delete transaction error:', err);
        return res.status(500).json({ success: false, message: 'Server error deleting transaction.' });
    }
});

module.exports = router;
