const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const authMiddleware = require('../middleware/auth');

// Create a new group
router.post('/create', authMiddleware, groupController.createGroup);

// Get list of groups the current user belongs to
router.get('/', authMiddleware, groupController.getGroups);

// Add a member to a group
router.post('/add-member', authMiddleware, groupController.addMemberToGroup);

// Remove a member from a group
router.post('/remove-member', authMiddleware, groupController.removeMember);

// Get list of members of a group
router.get('/:id/members', authMiddleware, groupController.getGroupMembers);

module.exports = router;
