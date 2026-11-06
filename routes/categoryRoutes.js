const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const authenticateToken = require('../middleware/auth');

// Protect all category routes
router.use(authenticateToken);

// GET all categories for the logged-in user
router.get('/', async (req, res) => {
    try {
        const { type } = req.query; // 'income' or 'expense'
        let query = 'SELECT * FROM categories WHERE user_id = ?';
        const params = [req.user.userId];

        if (type && ['income', 'expense'].includes(type.toLowerCase())) {
            query += ' AND category_type = ?';
            params.push(type.toLowerCase());
        }

        query += ' ORDER BY category_type ASC, category_name ASC';

        const [categories] = await pool.query(query, params);
        return res.json({ success: true, count: categories.length, data: categories });
    } catch (err) {
        console.error('Fetch categories error:', err);
        return res.status(500).json({ success: false, message: 'Server error fetching categories.' });
    }
});

// CREATE a new category
router.post('/', async (req, res) => {
    try {
        const { category_name, category_type } = req.body;

        if (!category_name || !category_type) {
            return res.status(400).json({ success: false, message: 'Category name and category type (income/expense) are required.' });
        }

        const validTypes = ['income', 'expense'];
        const normalizedType = category_type.toLowerCase().trim();

        if (!validTypes.includes(normalizedType)) {
            return res.status(400).json({ success: false, message: "category_type must be either 'income' or 'expense'." });
        }

        // Check if category name already exists for this user and type
        const [existing] = await pool.query(
            'SELECT category_id FROM categories WHERE user_id = ? AND LOWER(category_name) = ? AND category_type = ?',
            [req.user.userId, category_name.trim().toLowerCase(), normalizedType]
        );

        if (existing.length > 0) {
            return res.status(409).json({ success: false, message: `Category '${category_name}' already exists in ${normalizedType}s.` });
        }

        const [result] = await pool.query(
            'INSERT INTO categories (user_id, category_name, category_type) VALUES (?, ?, ?)',
            [req.user.userId, category_name.trim(), normalizedType]
        );

        const [newCat] = await pool.query('SELECT * FROM categories WHERE category_id = ?', [result.insertId]);

        return res.status(201).json({
            success: true,
            message: 'Category added successfully!',
            data: newCat[0]
        });
    } catch (err) {
        console.error('Create category error:', err);
        return res.status(500).json({ success: false, message: 'Server error creating category.' });
    }
});

// UPDATE category
router.put('/:id', async (req, res) => {
    try {
        const categoryId = parseInt(req.params.id);
        const { category_name, category_type } = req.body;

        if (!category_name) {
            return res.status(400).json({ success: false, message: 'Category name is required.' });
        }

        const [existing] = await pool.query(
            'SELECT * FROM categories WHERE category_id = ? AND user_id = ?',
            [categoryId, req.user.userId]
        );

        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Category not found or unauthorized.' });
        }

        let typeToUpdate = existing[0].category_type;
        if (category_type && ['income', 'expense'].includes(category_type.toLowerCase())) {
            typeToUpdate = category_type.toLowerCase();
        }

        await pool.query(
            'UPDATE categories SET category_name = ?, category_type = ? WHERE category_id = ? AND user_id = ?',
            [category_name.trim(), typeToUpdate, categoryId, req.user.userId]
        );

        const [updated] = await pool.query('SELECT * FROM categories WHERE category_id = ?', [categoryId]);
        return res.json({ success: true, message: 'Category updated successfully!', data: updated[0] });
    } catch (err) {
        console.error('Update category error:', err);
        return res.status(500).json({ success: false, message: 'Server error updating category.' });
    }
});

// DELETE category
router.delete('/:id', async (req, res) => {
    try {
        const categoryId = parseInt(req.params.id);

        const [existing] = await pool.query(
            'SELECT * FROM categories WHERE category_id = ? AND user_id = ?',
            [categoryId, req.user.userId]
        );

        if (existing.length === 0) {
            return res.status(404).json({ success: false, message: 'Category not found or unauthorized.' });
        }

        // Check if there are transactions associated
        const [txn] = await pool.query(
            'SELECT COUNT(*) as txn_count FROM transactions WHERE category_id = ? AND user_id = ?',
            [categoryId, req.user.userId]
        );

        if (txn[0].txn_count > 0) {
            return res.status(400).json({
                success: false,
                message: `Cannot delete category. It is linked to ${txn[0].txn_count} transaction(s). Please delete or reassign those transactions first.`
            });
        }

        await pool.query('DELETE FROM categories WHERE category_id = ? AND user_id = ?', [categoryId, req.user.userId]);

        return res.json({ success: true, message: 'Category deleted successfully!' });
    } catch (err) {
        console.error('Delete category error:', err);
        return res.status(500).json({ success: false, message: 'Server error deleting category.' });
    }
});

module.exports = router;
