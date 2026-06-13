const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

// Public routes
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);

// Private route (requires valid JWT token)
router.get('/me', authMiddleware, AuthController.getMe);

module.exports = router;
