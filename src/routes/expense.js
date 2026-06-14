const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
const authMiddleware = require('../middleware/auth');

router.post('/create', authMiddleware, expenseController.createExpense);
router.get('/:id', authMiddleware, expenseController.getExpense);
router.get('/group/:id', authMiddleware, expenseController.getGroupExpenses);
router.delete('/:id', authMiddleware, expenseController.deleteExpense);

module.exports = router;
