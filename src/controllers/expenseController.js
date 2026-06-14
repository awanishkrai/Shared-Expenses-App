const { getPool } = require('../config/db');

const createExpense = async (req, res) => {
    try {
        const pool = getPool();
        let { amount, description, group_id, split_type, paid_by, splits, currency, expense_date, notes } = req.body;
        if (!amount || !description || !group_id || !split_type || !paid_by || !splits || !currency || !expense_date) {
            return res.status(400).json({ message: 'All fields are required' });
        }
        //fx conversion if not INR
        let amount_inr = amount;
        let fx_rate_used = 1;
        if (currency !== 'INR') {
            const fxQuery = 'SELECT rate FROM fx_rates WHERE from_currency=? AND to_currency=? AND effective_date<=? ORDER BY effective_date DESC LIMIT 1';
            const [fxRows] = await pool.query(fxQuery, [currency, 'INR', expense_date]);
            if (fxRows.length === 0) {
                return res.status(400).json({ message: 'FX rate not found for the given date' });
            }
            fx_rate_used = fxRows[0].rate;
            amount_inr = amount * fx_rate_used;
        }
        //insert expense
        const query = 'INSERT INTO `expenses` (group_id,description,paid_by,amount,currency,amount_inr,fx_rate_used,expense_date,split_type,notes) VALUES (?,?,?,?,?,?,?,?,?,?)';
        const [result] = await pool.query(query, [group_id, description, paid_by, amount, currency, amount_inr, fx_rate_used, expense_date, split_type, notes || null]);
        const expense_id = result.insertId;
        //calculate and insert splits
        const splitInsertQuery = 'INSERT INTO `splits` (expense_id,user_id,share_amount,share_pct,share_units) VALUES (?,?,?,?,?)';
        if (split_type === 'equal') {
            //divide equally among all participants
            const share = parseFloat((amount_inr / splits.length).toFixed(2));
            for (const userId of splits) {
                await pool.query(splitInsertQuery, [expense_id, userId, share, null, null]);
            }
        }
        else if (split_type === 'unequal') {
            //splits is array of {user_id,amount}
            for (const split of splits) {
                await pool.query(splitInsertQuery, [expense_id, split.user_id, split.amount, null, null]);
            }
        }
        else if (split_type === 'percentage') {
            //splits is array of {user_id,percentage}
            for (const split of splits) {
                const share = parseFloat(((split.percentage / 100) * amount_inr).toFixed(2));
                await pool.query(splitInsertQuery, [expense_id, split.user_id, share, split.percentage, null]);
            }
        }
        else if (split_type === 'share') {
            //splits is array of {user_id,units}
            const totalUnits = splits.reduce((sum, s) => sum + s.units, 0);
            for (const split of splits) {
                const share = parseFloat(((split.units / totalUnits) * amount_inr).toFixed(2));
                await pool.query(splitInsertQuery, [expense_id, split.user_id, share, null, split.units]);
            }
        }
        res.status(201).json({ message: 'Expense created successfully', expense_id });
    }
    catch (err) {
        console.log("Error creating expense", err);
        res.status(500).json({ message: 'Error creating expense' });
    }
};

const getExpense = async (req, res) => {
    try {
        const pool = getPool();
        const { id } = req.params;
        //get expense details
        const expQuery = 'SELECT e.*,u.username as paid_by_name FROM `expenses` e ' +
            'JOIN users u ON u.id=e.paid_by ' +
            'WHERE e.id=?';
        const [expRows] = await pool.query(expQuery, [id]);
        if (expRows.length === 0) {
            return res.status(404).json({ message: 'Expense not found' });
        }
        //get splits for this expense - Rohan requirement
        const splitQuery = 'SELECT es.*,u.username as user_name FROM `splits` es ' +
            'JOIN users u ON u.id=es.user_id ' +
            'WHERE es.expense_id=?';
        const [splitRows] = await pool.query(splitQuery, [id]);
        res.status(200).json({ expense: expRows[0], splits: splitRows });
    }
    catch (err) {
        console.log("Error getting expense", err);
        res.status(500).json({ message: 'Error getting expense' });
    }
};

const getGroupExpenses = async (req, res) => {
    try {
        const pool = getPool();
        const { id } = req.params;
        //get all active expenses for a group
        const query = 'SELECT e.*,u.username as paid_by_name FROM `expenses` e ' +
            'JOIN users u ON u.id=e.paid_by ' +
            'WHERE e.group_id=? AND e.status=\'active\' ' +
            'ORDER BY e.expense_date DESC';
        const [rows] = await pool.query(query, [id]);
        res.status(200).json({ expenses: rows });
    }
    catch (err) {
        console.log("Error getting group expenses", err);
        res.status(500).json({ message: 'Error getting group expenses' });
    }
};

const deleteExpense = async (req, res) => {
    try {
        const pool = getPool();
        const { id } = req.params;
        //soft delete - set status to voided
        const query = 'UPDATE `expenses` SET status=\'voided\' WHERE id=?';
        await pool.query(query, [id]);
        res.status(200).json({ message: 'Expense deleted successfully' });
    }
    catch (err) {
        console.log("Error deleting expense", err);
        res.status(500).json({ message: 'Error deleting expense' });
    }
};

module.exports = { createExpense, getExpense, getGroupExpenses, deleteExpense };