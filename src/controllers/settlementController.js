const {getPool}=require('../config/db');

// record a settlement between two people (e.g. "Rohan paid Aisha back ₹2000")
const createSettlement=async(req,res)=>{
    try{
        const pool=getPool();
        const userId=req.user.id;
        const {group_id,payee_id,amount,currency,settlement_date,transaction_type,notes}=req.body;

        if(!group_id||!payee_id||!amount||!settlement_date){
            return res.status(400).json({message:'group_id, payee_id, amount, and settlement_date are required'});
        }

        // payer is whoever is logged in — payee comes from the request body
        const query='INSERT INTO settlements (group_id,payer_id,payee_id,amount,currency,transaction_type,settlement_date,notes) VALUES (?,?,?,?,?,?,?,?)';
        const [result]=await pool.query(query,[
            group_id,
            userId,
            payee_id,
            amount,
            currency||'INR',
            transaction_type||'settlement',
            settlement_date,
            notes||null
        ]);

        res.status(201).json({message:'Settlement recorded',settlement_id:result.insertId});
    }
    catch(err){
        console.log("Error creating settlement",err);
        res.status(500).json({message:'Error creating settlement'});
    }
};

// get all settlements for a group — shows who paid whom and when
const getGroupSettlements=async(req,res)=>{
    try{
        const pool=getPool();
        const {id}=req.params;

        const query='SELECT s.*,'+
            'payer.name as payer_name,payee.name as payee_name '+
            'FROM settlements s '+
            'JOIN users payer ON payer.id=s.payer_id '+
            'JOIN users payee ON payee.id=s.payee_id '+
            'WHERE s.group_id=? ORDER BY s.settlement_date DESC';
        const [rows]=await pool.query(query,[id]);

        res.status(200).json({settlements:rows});
    }
    catch(err){
        console.log("Error getting settlements",err);
        res.status(500).json({message:'Error getting settlements'});
    }
};

module.exports={createSettlement,getGroupSettlements};
