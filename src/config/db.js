const mysql = require('mysql2/promise');
require('dotenv').config();

const UserSchema = require('../models/userModel');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
};

const dbName = process.env.DB_NAME || 'shared_expenses';

let pool;

async function initializeDatabase() {
  try {
    console.log('Connecting to database server...');
    const connection = await mysql.createConnection(dbConfig);
    
    // Create the database if it doesn't exist yet
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
    await connection.end();

    // Set up the connection pool pointing to our database
    pool = mysql.createPool({
      ...dbConfig,
      database: dbName,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    // Make sure our tables are set up
    await createTables();

    console.log('Database is ready.');
    return pool;
  } catch (error) {
    console.error('Database connection failed:', error.message);
    throw error;
  }
}

async function createTables() {
  // Construct the fields SQL dynamically from the schema definition in the model
  const fieldsSql = Object.entries(UserSchema.fields)
    .map(([name, type]) => `\`${name}\` ${type}`)
    .join(',\n      ');

  const createUserTableQuery = `
    CREATE TABLE IF NOT EXISTS \`${UserSchema.tableName}\` (
      ${fieldsSql}
    ) ENGINE=InnoDB;
  `;

  try {
    const connection = await pool.getConnection();
    await connection.query(createUserTableQuery);
    connection.release();
  } catch (error) {
    console.error(`Failed to create ${UserSchema.tableName} table:`, error.message);
    throw error;
  }
}

function getPool() {
  if (!pool) {
    throw new Error('Database pool not initialized. Run initializeDatabase first.');
  }
  return pool;
}

module.exports = {
  initializeDatabase,
  getPool,
};
