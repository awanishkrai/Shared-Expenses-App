const express=require('express');
const router=express.Router();
const {createSettlement,getGroupSettlements}=require('../controllers/settlementController');
const authMiddleware=require('../middleware/auth');

// record a new settlement ("I paid X back")
router.post('/create',authMiddleware,createSettlement);

// get all settlements for a group
router.get('/group/:id',authMiddleware,getGroupSettlements);

module.exports=router;
