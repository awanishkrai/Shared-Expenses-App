const mysql = require('mysql2/promise');
require('dotenv').config();

// Import all database schemas in dependency order
// (a table must be defined before any table that references it)
const UserSchema = require('../models/userModel');
const GroupSchema = require('../models/groups');
const ImportSessionSchema = require('../models/import_sessions');
const FxRatesSchema = require('../models/fx_rates');
const MembershipSchema = require('../models/groupMembership');
const ExpenseSchema = require('../models/expenses');
const SplitsSchema = require('../models/splits');
const SettlementsSchema = require('../models/settlements');
const AnomaliesSchema = require('../models/anomalies');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
};

const dbName = process.env.DB_NAME || 'shared_expenses';

// Tables are created in this order to satisfy foreign key constraints
const schemas = [
  UserSchema,
  GroupSchema,
  ImportSessionSchema,
  FxRatesSchema,
  MembershipSchema,
  ExpenseSchema,
  SplitsSchema,
  SettlementsSchema,
  AnomaliesSchema,
];

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
  const connection = await pool.getConnection();
  try {
    for (const schema of schemas) {
      // Build column definitions from fields
      const fieldsSql = Object.entries(schema.fields)
        .map(([name, type]) => `\`${name}\` ${type}`)
        .join(',\n      ');

      // Append table-level constraints (UNIQUE, FOREIGN KEY, CHECK) if any
      let constraintsSql = '';
      if (schema.constraints && schema.constraints.length > 0) {
        constraintsSql += ',\n      ' + schema.constraints.join(',\n      ');
      }

      // Append indexes if any
      let indexesSql = '';
      if (schema.indexes && schema.indexes.length > 0) {
        indexesSql += ',\n      ' + schema.indexes.join(',\n      ');
      }

      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS \`${schema.tableName}\` (
          ${fieldsSql}${constraintsSql}${indexesSql}
        ) ENGINE=InnoDB;
      `;

      await connection.query(createTableQuery);
    }
  } catch (error) {
    console.error('Failed to create database tables:', error.message);
    throw error;
  } finally {
    connection.release();
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
