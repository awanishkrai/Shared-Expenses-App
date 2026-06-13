const express=require('express');
const router=express.Router();
const {upload,importCSV}=require('../controllers/importController');
const authMiddleware=require('../middleware/auth');

// upload a CSV and import expenses for a group
// the file field should be named "file" in the multipart form
router.post('/:groupId/upload',authMiddleware,upload.single('file'),importCSV);

module.exports=router;
