const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const { initializeDatabase } = require('./config/db');

const app = express();

app.use(cors());
app.use(express.json());

// Log requests in development environment
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Route mounts
app.use('/api/auth', require('./routes/auth'));
app.use('/api/groups', require('./routes/group'));
app.use('/api/expenses', require('./routes/expense'));
app.use('/api/settlements', require('./routes/settlement'));
app.use('/api/import', require('./routes/import'));
app.use('/api/balances', require('./routes/balance'));

// Basic health check route
app.get('/', (req, res) => {
  res.json({
    status: 'healthy',
    message: 'Welcome to the Shared Expenses API',
    timestamp: new Date()
  });
});

// Generic fallback error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

const PORT = process.env.PORT || 5000;

// Initialize DB and fire up the server
async function startServer() {
  try {
    await initializeDatabase();
    
    app.listen(PORT, () => {
      console.log(`Server started on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
    });
  } catch (error) {
    console.error('Server failed to start:', error.message);
    process.exit(1);
  }
}

startServer();
