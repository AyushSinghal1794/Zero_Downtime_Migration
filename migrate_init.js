// migrate_init.js
require('dotenv').config();
const { Pool } = require('pg');

const oldDbConfig = {
  host: process.env.OLD_DB_HOST,
  port: process.env.OLD_DB_PORT,
  user: process.env.OLD_DB_USER,
  password: process.env.OLD_DB_PASSWORD,
  database: process.env.OLD_DB_NAME,
};

const newDbConfig = {
  host: process.env.NEW_DB_HOST,
  port: process.env.NEW_DB_PORT,
  user: process.env.NEW_DB_USER,
  password: process.env.NEW_DB_PASSWORD,
  database: process.env.NEW_DB_NAME,
};

const createTableQuery = `
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
`;

async function initDb(pool, dbName) {
  try {
    await pool.query(createTableQuery);
    console.log(`✅ Users table created in ${dbName}`);
  } catch (err) {
    console.error(`❌ Error creating table in ${dbName}:`, err);
  } finally {
    await pool.end();
  }
}

async function main() {
  const oldPool = new Pool(oldDbConfig);
  const newPool = new Pool(newDbConfig);

  await initDb(oldPool, 'Old DB');
  await initDb(newPool, 'New DB');
}

main();