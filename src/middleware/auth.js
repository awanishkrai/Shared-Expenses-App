const jwt = require('jsonwebtoken');

// Middleware to verify JWT token and attach user data to the request
module.exports = function (req, res, next) {
  const authHeader = req.header('Authorization');
  let token = null;

  // Extract token from header, supporting the 'Bearer <token>' format
  if (authHeader) {
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else {
      token = authHeader;
    }
  }

  if (!token) {
    return res.status(401).json({ error: 'No token, authorization denied.' });
  }

  try {
    const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_shared_expenses_app';
    const decoded = jwt.verify(token, secret);
    
    // Set decoded payload on the request object for downstream route handlers
    req.user = decoded;
    next();
  } catch (error) {
    console.error('JWT validation failed:', error.message);
    return res.status(401).json({ error: 'Token is not valid or has expired.' });
  }
};
