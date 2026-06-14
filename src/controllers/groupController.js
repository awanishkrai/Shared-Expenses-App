const {getPool}=require('../config/db');

const createGroup=async(req,res)=>{
    try{
        const pool=getPool();
        const {name}=req.body;
        const userId=req.user.id;
        if(!name){
            return res.status(400).json({message:'Group name is required'});
        }
        const query='INSERT INTO `groups` (name) VALUES (?)';
        const [result]=await pool.query(query,[name]);
        const joinDate=new Date().toISOString().split('T')[0];
        const memQuery='INSERT INTO `group_memberships` (group_id,user_id,joined_at) VALUES (?,?,?)';
        await pool.query(memQuery,[result.insertId,userId,joinDate]);
        res.status(201).json({message:'Group created successfully',groupId:result.insertId});
    }
    catch(err){
        console.log('Error creating group',err);
        res.status(500).json({message:'Error creating group'});
    }
};

const addMemberToGroup=async(req,res)=>{
    try{
        const pool=getPool();
        const {groupId,memberId,joined_at}=req.body;
        const joinDate=joined_at||new Date().toISOString().split('T')[0];
        if(!groupId||!memberId){
            return res.status(400).json({message:'groupId and memberId are required'});
        }
        const checkQuery='SELECT * FROM `group_memberships` WHERE group_id=? AND user_id=? AND left_at IS NULL';
        const [rows]=await pool.query(checkQuery,[groupId,memberId]);
        if(rows.length>0){
            return res.status(400).json({message:'User is already an active member'});
        }
        const query='INSERT INTO `group_memberships` (group_id,user_id,joined_at) VALUES (?,?,?)';
        const [result]=await pool.query(query,[groupId,memberId,joinDate]);
        res.status(201).json({message:'Member added successfully',membershipId:result.insertId});
    }
    catch(err){
        console.log('Error adding member to group',err);
        res.status(500).json({message:'Error adding member to group'});
    }
};

const removeMember=async(req,res)=>{
    try{
        const pool=getPool();
        const {groupId,memberId,left_at}=req.body;
        const leftDate=left_at||new Date().toISOString().split('T')[0];
        if(!groupId||!memberId){
            return res.status(400).json({message:'groupId and memberId are required'});
        }
        const checkQuery='SELECT * FROM `group_memberships` WHERE group_id=? AND user_id=? AND left_at IS NULL';
        const [rows]=await pool.query(checkQuery,[groupId,memberId]);
        if(rows.length===0){
            return res.status(400).json({message:'User is not an active member'});
        }
        const query='UPDATE `group_memberships` SET left_at=? WHERE group_id=? AND user_id=? AND left_at IS NULL';
        await pool.query(query,[leftDate,groupId,memberId]);
        res.status(200).json({message:'Member removed successfully'});
    }
    catch(err){
        console.log('Error removing member',err);
        res.status(500).json({message:'Error removing member'});
    }
};

const getGroupMembers=async(req,res)=>{
    try{
        const pool=getPool();
        const {id}=req.params;
        const query='SELECT u.id,u.name,u.email,gm.joined_at,gm.left_at '+
        'FROM `group_memberships` gm '+
        'JOIN users u ON u.id=gm.user_id '+
        'WHERE gm.group_id=?';
        const [rows]=await pool.query(query,[id]);
        res.status(200).json({members:rows});
    }
    catch(err){
        console.log('Error getting group members',err);
        res.status(500).json({message:'Error getting group members'});
    }
};

const getGroupById=async(req,res)=>{
    try{
        const pool=getPool();
        const {id}=req.params;
        const query='SELECT g.id,g.name,g.created_at FROM `groups` g WHERE g.id=?';
        const [rows]=await pool.query(query,[id]);
        if(rows.length===0){
            return res.status(404).json({message:'Group not found'});
        }
        res.status(200).json({group:rows[0]});
    }
    catch(err){
        console.log('Error getting group',err);
        res.status(500).json({message:'Error getting group'});
    }
};

const getGroups=async(req,res)=>{
    try{
        const pool=getPool();
        const userId=req.user.id;
        const query='SELECT g.id,g.name,g.created_at '+
        'FROM `groups` g '+
        'JOIN `group_memberships` gm ON gm.group_id=g.id '+
        'WHERE gm.user_id=? AND gm.left_at IS NULL';
        const [rows]=await pool.query(query,[userId]);
        res.status(200).json({groups:rows});
    }
    catch(err){
        console.log('Error getting groups',err);
        res.status(500).json({message:'Error getting groups'});
    }
};

module.exports={createGroup,addMemberToGroup,removeMember,getGroupMembers,getGroupById,getGroups};
