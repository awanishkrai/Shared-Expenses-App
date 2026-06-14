const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool } = require('../config/db');

// Generate a JWT token for the user session
const generateToken = (userId) => {
  const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_shared_expenses_app';
  const expiresIn = process.env.JWT_EXPIRES_IN || '24h';
  return jwt.sign({ id: userId }, secret, { expiresIn });
};

class AuthController {
  // Handle user registration
  static async register(req, res) {
    try {
      const { name, email, password } = req.body;
      const pool = getPool();

      // Basic field checks
      if (!name || !email || !password) {
        return res.status(400).json({ error: 'All fields (name, email, password) are required.' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      }

      // Check email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Please enter a valid email address.' });
      }

      // Make sure the email isn't already taken
      const [rows] = await pool.query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
      if (rows.length > 0) {
        return res.status(400).json({ error: 'Email is already registered.' });
      }

      // Hash the password before saving to the DB
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Save user to database
      const [result] = await pool.query(
        'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
        [name, email, hashedPassword]
      );
      const userId = result.insertId;

      // Generate login token
      const token = generateToken(userId);

      return res.status(201).json({
        message: 'User registered successfully.',
        token,
        user: {
          id: userId,
          name,
          email
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      return res.status(500).json({ error: 'Server error during registration.' });
    }
  }

  // Handle user login
  static async login(req, res) {
    try {
      const { email, password } = req.body;
      const pool = getPool();

      if (!email || !password) {
        return res.status(400).json({ error: 'Both email and password are required.' });
      }

      // Look up the user by email
      const [rows] = await pool.query('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
      const user = rows[0];
      
      if (!user) {
        // Keep message generic for security
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      // Check if password is correct
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      // Issue token on successful login
      const token = generateToken(user.id);

      return res.status(200).json({
        message: 'Login successful.',
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ error: 'Server error during login.' });
    }
  }

  // Get current user profile
  static async getMe(req, res) {
    try {
      const pool = getPool();
      
      // req.user gets set by the auth middleware if the token is valid
      const [rows] = await pool.query(
        'SELECT id, name, email, created_at, updated_at FROM users WHERE id = ? LIMIT 1',
        [req.user.id]
      );
      const user = rows[0];

      if (!user) {
        return res.status(404).json({ error: 'User not found.' });
      }
      return res.status(200).json({ user });
    } catch (error) {
      console.error('Get profile error:', error);
      return res.status(500).json({ error: 'Server error retrieving user profile.' });
    }
  }
}

module.exports = AuthController;
