const {getPool}=require('../config/db');

const getBalances=async(req,res)=>{
    try{
        const pool=getPool();
        const {id}=req.params;

        // what each person paid out of pocket
        const paidQuery='SELECT e.paid_by as user_id,u.name as name,'+
        'SUM(e.amount_inr) as total_paid '+
        'FROM expenses e '+
        'JOIN users u ON u.id=e.paid_by '+
        'JOIN group_memberships gm ON gm.user_id=e.paid_by AND gm.group_id=e.group_id '+
        'WHERE e.group_id=? AND e.status=\'active\' '+
        'AND e.expense_date>=gm.joined_at '+
        'AND (gm.left_at IS NULL OR e.expense_date<=gm.left_at) '+
        'GROUP BY e.paid_by,u.name';
        const [paidRows]=await pool.query(paidQuery,[id]);

        // what each person owes (their share of all expenses)
        const owedQuery='SELECT es.user_id,u.name as name,'+
        'SUM(es.share_amount) as total_owed '+
        'FROM splits es '+
        'JOIN expenses e ON e.id=es.expense_id '+
        'JOIN users u ON u.id=es.user_id '+
        'JOIN group_memberships gm ON gm.user_id=es.user_id AND gm.group_id=e.group_id '+
        'WHERE e.group_id=? AND e.status=\'active\' '+
        'AND e.expense_date>=gm.joined_at '+
        'AND (gm.left_at IS NULL OR e.expense_date<=gm.left_at) '+
        'GROUP BY es.user_id,u.name';
        const [owedRows]=await pool.query(owedQuery,[id]);

        // net balance = what you paid minus what you owe
        // positive = others owe you, negative = you owe others
        const balanceMap={};
        for(const row of paidRows){
            if(!balanceMap[row.user_id]){
                balanceMap[row.user_id]={name:row.name,balance:0};
            }
            balanceMap[row.user_id].balance+=parseFloat(row.total_paid);
        }
        for(const row of owedRows){
            if(!balanceMap[row.user_id]){
                balanceMap[row.user_id]={name:row.name,balance:0};
            }
            balanceMap[row.user_id].balance-=parseFloat(row.total_owed);
        }

        // minimal transfer algorithm — Aisha's requirement
        // sort creditors descending, debtors ascending, greedily match them up
        const balances=Object.entries(balanceMap).map(([user_id,data])=>({
            user_id,
            name:data.name,
            balance:parseFloat(data.balance.toFixed(2))
        }));

        const creditors=balances.filter(b=>b.balance>0).sort((a,b)=>b.balance-a.balance);
        const debtors=balances.filter(b=>b.balance<0).sort((a,b)=>a.balance-b.balance);

        const settlements=[];
        let i=0,j=0;
        while(i<creditors.length&&j<debtors.length){
            const amount=Math.min(creditors[i].balance,Math.abs(debtors[j].balance));
            settlements.push({
                from:debtors[j].name,
                to:creditors[i].name,
                amount:parseFloat(amount.toFixed(2))
            });
            creditors[i].balance-=amount;
            debtors[j].balance+=amount;
            if(creditors[i].balance===0) i++;
            if(debtors[j].balance===0) j++;
        }

        res.status(200).json({balances,settlements});
    }
    catch(err){
        console.log("Error calculating balances",err);
        res.status(500).json({message:'Error calculating balances'});
    }
};

module.exports={getBalances};
