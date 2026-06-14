const { getPool } = require('../config/db');

// Create a new group and add the creator as the first member
const createGroup = async (req, res) => {
  try {
    const pool = getPool();
    const { name } = req.body;
    const userId = req.user.id;

    if (!name) {
      return res.status(400).json({ message: 'Group name is required' });
    }

    // Insert the new group record
    const groupQuery = 'INSERT INTO `groups` (name) VALUES (?)';
    const [groupResult] = await pool.query(groupQuery, [name]);
    const groupId = groupResult.insertId;

    // Add the creator as the first member
    const membershipQuery = 'INSERT INTO `group_memberships` (group_id, user_id) VALUES (?, ?)';
    await pool.query(membershipQuery, [groupId, userId]);

    res.status(201).json({
      message: 'Group created successfully',
      groupId
    });
  } catch (err) {
    console.error('Error creating group:', err);
    res.status(500).json({ message: 'Error creating group' });
  }
};

// Add a user to an existing group
const addMemberToGroup = async (req, res) => {
  try {
    const pool = getPool();
    const { groupId, memberId } = req.body;

    if (!groupId || !memberId) {
      return res.status(400).json({ message: 'Group ID and Member ID are required' });
    }

    // Check if the user is already a member of the group
    const checkQuery = 'SELECT id FROM `group_memberships` WHERE group_id = ? AND user_id = ? AND left_at IS NULL';
    const [existing] = await pool.query(checkQuery, [groupId, memberId]);

    if (existing.length > 0) {
      return res.status(400).json({ message: 'User is already a member of this group' });
    }

    // Insert new membership record
    const query = 'INSERT INTO `group_memberships` (group_id, user_id) VALUES (?, ?)';
    const [result] = await pool.query(query, [groupId, memberId]);

    res.status(200).json({
      message: 'User added to group successfully',
      membershipId: result.insertId
    });
  } catch (err) {
    console.error('Error adding member to group:', err);
    res.status(500).json({ message: 'Error adding member to group' });
  }
};

// Remove a user from a group (soft-delete membership by setting left_at)
const removeMember = async (req, res) => {
  try {
    const pool = getPool();
    const { groupId, memberId } = req.body;

    if (!groupId || !memberId) {
      return res.status(400).json({ message: 'Group ID and Member ID are required' });
    }

    // Soft-delete the membership by setting the left_at timestamp
    const query = 'UPDATE `group_memberships` SET left_at = CURRENT_TIMESTAMP WHERE group_id = ? AND user_id = ? AND left_at IS NULL';
    const [result] = await pool.query(query, [groupId, memberId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Active membership not found for this user and group' });
    }

    res.status(200).json({ message: 'Member removed successfully' });
  } catch (err) {
    console.error('Error removing member:', err);
    res.status(500).json({ message: 'Error removing member' });
  }
};

// Get all members of a group
const getGroupMembers = async (req, res) => {
  try {
    const pool = getPool();
    const { id } = req.params;

    // Retrieve active and former members with username and email
    const query = `
      SELECT u.id, u.username, u.email, gm.joined_at, gm.left_at
      FROM \`group_memberships\` gm
      JOIN users u ON u.id = gm.user_id
      WHERE gm.group_id = ?
    `;
    const [rows] = await pool.query(query, [id]);

    res.status(200).json({ members: rows });
  } catch (err) {
    console.error('Error getting group members:', err);
    res.status(500).json({ message: 'Error getting group members' });
  }
};

// Get all groups that the logged-in user belongs to
const getGroups = async (req, res) => {
  try {
    const pool = getPool();
    const userId = req.user.id;

    // Fetch active groups for the user
    const query = `
      SELECT g.id, g.name, g.created_at
      FROM \`groups\` g
      JOIN \`group_memberships\` gm ON gm.group_id = g.id
      WHERE gm.user_id = ? AND gm.left_at IS NULL
    `;
    const [rows] = await pool.query(query, [userId]);

    res.status(200).json({ groups: rows });
  } catch (err) {
    console.error('Error getting groups:', err);
    res.status(500).json({ message: 'Error getting groups' });
  }
};

module.exports = {
  createGroup,
  addMemberToGroup,
  removeMember,
  getGroupMembers,
  getGroups
};
