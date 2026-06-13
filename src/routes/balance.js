const express=require('express');
const router=express.Router();
const {getBalances}=require('../controllers/balanceEngine');
const authMiddleware=require('../middleware/auth');

// get balances and suggested settlements for a group
router.get('/group/:id',authMiddleware,getBalances);

module.exports=router;
