// app.js
require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const amqp = require('amqplib');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());

// Feature flags
const WRITE_NEW_DB = process.env.WRITE_NEW_DB === 'true';
const READ_NEW_DB_PERCENT = parseInt(process.env.READ_NEW_DB_PERCENT || '0', 10);

// Postgres pools
const oldPool = new Pool({
  host: process.env.OLD_DB_HOST,
  port: process.env.OLD_DB_PORT,
  user: process.env.OLD_DB_USER,
  password: process.env.OLD_DB_PASSWORD,
  database: process.env.OLD_DB_NAME,
});

const newPool = new Pool({
  host: process.env.NEW_DB_HOST,
  port: process.env.NEW_DB_PORT,
  user: process.env.NEW_DB_USER,
  password: process.env.NEW_DB_PASSWORD,
  database: process.env.NEW_DB_NAME,
});

// RabbitMQ setup
let channel;
async function setupRabbit() {
  const conn = await amqp.connect(process.env.RABBITMQ_URL);
  channel = await conn.createChannel();
  await channel.assertQueue('user_changes', { durable: true });
}
setupRabbit().then(() => console.log('✅ RabbitMQ connected')).catch(console.error);

// Utility: simple hash for canary reads
function userInCanary(userId) {
  const hash = parseInt(userId.replace(/-/g, '').slice(0, 8), 16);
  return (hash % 100) < READ_NEW_DB_PERCENT;
}

// Create user
app.post('/users', async (req, res) => {
  const { name, email } = req.body;
  const id = uuidv4();
  const createdAt = new Date();

  try {
    // Always write to old DB
    await oldPool.query(
      'INSERT INTO users (id, name, email, created_at) VALUES ($1, $2, $3, $4)',
      [id, name, email, createdAt]
    );

    // Conditional write to new DB
    if (WRITE_NEW_DB) {
      await newPool.query(
        'INSERT INTO users (id, name, email, created_at) VALUES ($1, $2, $3, $4)',
        [id, name, email, createdAt]
      );

      // Publish change event to RabbitMQ
      const message = JSON.stringify({ id, name, email, created_at: createdAt });
      channel.sendToQueue('user_changes', Buffer.from(message), { persistent: true });
    }

    res.json({ success: true, id });
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Read user
app.get('/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    let user;
    if (userInCanary(id) && WRITE_NEW_DB) {
      // Read from new DB for canary users
      const newResult = await newPool.query('SELECT * FROM users WHERE id=$1', [id]);
      user = newResult.rows[0];

      // Compare with old DB for divergence
      const oldResult = await oldPool.query('SELECT * FROM users WHERE id=$1', [id]);
      const oldUser = oldResult.rows[0];
      if (JSON.stringify(user) !== JSON.stringify(oldUser)) {
        console.log(`⚠️ Divergence detected for user ${id}`);
        console.log('Old:', oldUser);
        console.log('New:', user);
      }
    } else {
      // Read from old DB
      const oldResult = await oldPool.query('SELECT * FROM users WHERE id=$1', [id]);
      user = oldResult.rows[0];
    }

    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    console.error('Error reading user:', err);
    res.status(500).json({ error: 'Failed to read user' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
