const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const authenticateToken = require('../middleware/auth');

router.use(authenticateToken);

// 1. Overall Financial Summary (Total Income, Total Expense, Net Balance, Savings Rate)
router.get('/summary', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { month, year } = req.query;

        let dateCondition = '';
        const params = [userId];

        if (month && !isNaN(parseInt(month))) {
            dateCondition += ' AND MONTH(transaction_date) = ?';
            params.push(parseInt(month));
        }
        if (year && !isNaN(parseInt(year))) {
            dateCondition += ' AND YEAR(transaction_date) = ?';
            params.push(parseInt(year));
        }

        const query = `
            SELECT 
                COALESCE(SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END), 0) AS total_income,
                COALESCE(SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END), 0) AS total_expense,
                COUNT(transaction_id) as transaction_count
            FROM transactions
            WHERE user_id = ? ${dateCondition}
        `;

        const [results] = await pool.query(query, params);
        const totalIncome = parseFloat(results[0].total_income) || 0;
        const totalExpense = parseFloat(results[0].total_expense) || 0;
        const netBalance = totalIncome - totalExpense;
        const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100 * 10) / 10 : 0;

        return res.json({
            success: true,
            data: {
                total_income: totalIncome,
                total_expense: totalExpense,
                net_balance: netBalance,
                savings_rate: savingsRate,
                transaction_count: results[0].transaction_count
            }
        });
    } catch (err) {
        console.error('Report summary error:', err);
        return res.status(500).json({ success: false, message: 'Server error generating summary report.' });
    }
});

// 2. Spending breakdown grouped by category (for doughnut / pie charts)
router.get('/category-breakdown', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { month, year, type = 'expense' } = req.query;

        let query = `
            SELECT 
                c.category_id,
                c.category_name,
                c.category_type,
                COALESCE(SUM(t.amount), 0) AS total_amount,
                COUNT(t.transaction_id) AS transaction_count
            FROM transactions t
            INNER JOIN categories c ON t.category_id = c.category_id
            WHERE t.user_id = ? AND t.transaction_type = ?
        `;
        const params = [userId, type.toLowerCase()];

        if (month && !isNaN(parseInt(month))) {
            query += ' AND MONTH(t.transaction_date) = ?';
            params.push(parseInt(month));
        }
        if (year && !isNaN(parseInt(year))) {
            query += ' AND YEAR(t.transaction_date) = ?';
            params.push(parseInt(year));
        }

        query += ' GROUP BY c.category_id, c.category_name, c.category_type ORDER BY total_amount DESC';

        const [rows] = await pool.query(query, params);
        const grandTotal = rows.reduce((acc, row) => acc + parseFloat(row.total_amount), 0);

        const breakdown = rows.map(item => {
            const amount = parseFloat(item.total_amount);
            const percentage = grandTotal > 0 ? Math.round((amount / grandTotal) * 100 * 10) / 10 : 0;
            return {
                category_id: item.category_id,
                category_name: item.category_name,
                category_type: item.category_type,
                total_amount: amount,
                percentage: percentage,
                count: item.transaction_count
            };
        });

        return res.json({
            success: true,
            grand_total: grandTotal,
            data: breakdown
        });
    } catch (err) {
        console.error('Category breakdown error:', err);
        return res.status(500).json({ success: false, message: 'Server error generating category report.' });
    }
});

// 3. Monthly trend report (all 12 months for a given year)
router.get('/monthly-trend', async (req, res) => {
    try {
        const userId = req.user.userId;
        const targetYear = req.query.year ? parseInt(req.query.year) : new Date().getFullYear();

        const query = `
            SELECT 
                MONTH(transaction_date) AS month,
                COALESCE(SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END), 0) AS income,
                COALESCE(SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END), 0) AS expense
            FROM transactions
            WHERE user_id = ? AND YEAR(transaction_date) = ?
            GROUP BY MONTH(transaction_date)
            ORDER BY month ASC
        `;

        const [rows] = await pool.query(query, [userId, targetYear]);

        const monthsData = [];
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        for (let m = 1; m <= 12; m++) {
            const found = rows.find(r => r.month === m);
            const income = found ? parseFloat(found.income) : 0;
            const expense = found ? parseFloat(found.expense) : 0;
            monthsData.push({
                month_num: m,
                month_name: monthNames[m - 1],
                income: income,
                expense: expense,
                net_savings: income - expense
            });
        }

        return res.json({
            success: true,
            year: targetYear,
            data: monthsData
        });
    } catch (err) {
        console.error('Monthly trend error:', err);
        return res.status(500).json({ success: false, message: 'Server error generating monthly trend.' });
    }
});

// 4. Export transactions as CSV
router.get('/export-csv', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { startDate, endDate, type } = req.query;

        let query = `
            SELECT 
                t.transaction_id,
                DATE_FORMAT(t.transaction_date, '%Y-%m-%d') as date,
                t.transaction_type as type,
                c.category_name as category,
                t.description,
                t.amount
            FROM transactions t
            LEFT JOIN categories c ON t.category_id = c.category_id
            WHERE t.user_id = ?
        `;
        const params = [userId];

        if (type && ['income', 'expense'].includes(type.toLowerCase())) {
            query += ' AND t.transaction_type = ?';
            params.push(type.toLowerCase());
        }
        if (startDate) {
            query += ' AND t.transaction_date >= ?';
            params.push(startDate);
        }
        if (endDate) {
            query += ' AND t.transaction_date <= ?';
            params.push(endDate);
        }

        query += ' ORDER BY t.transaction_date DESC';

        const [rows] = await pool.query(query, params);

        let csv = 'Transaction ID,Date,Type,Category,Description,Amount\n';
        rows.forEach(r => {
            const desc = (r.description || '').replace(/"/g, '""');
            csv += `"${r.transaction_id}","${r.date}","${r.type}","${r.category || 'Uncategorized'}","${desc}","${r.amount}"\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=expense_report_${new Date().toISOString().slice(0, 10)}.csv`);
        return res.send(csv);
    } catch (err) {
        console.error('CSV export error:', err);
        return res.status(500).json({ success: false, message: 'Server error generating CSV export.' });
    }
});

module.exports = router;
