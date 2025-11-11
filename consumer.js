// consumer.js
require('dotenv').config();
const amqp = require('amqplib');
const { Pool } = require('pg');

// Postgres (new_db only)
const newPool = new Pool({
  host: process.env.NEW_DB_HOST,
  port: process.env.NEW_DB_PORT,
  user: process.env.NEW_DB_USER,
  password: process.env.NEW_DB_PASSWORD,
  database: process.env.NEW_DB_NAME,
});

async function startConsumer() {
  try {
    // Connect to RabbitMQ
    const conn = await amqp.connect(process.env.RABBITMQ_URL);
    const channel = await conn.createChannel();
    await channel.assertQueue('user_changes', { durable: true });

    console.log('✅ Consumer connected to RabbitMQ. Waiting for messages...');

    channel.consume('user_changes', async (msg) => {
      if (msg !== null) {
        const event = JSON.parse(msg.content.toString());
        console.log('📩 Received event:', event);

        try {
          // Insert or update user in new_db
          await newPool.query(
            `INSERT INTO users (id, name, email, created_at)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (id)
             DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email`,
            [event.id, event.name, event.email, event.created_at]
          );

          channel.ack(msg);
        } catch (err) {
          console.error('❌ Error syncing user to new DB:', err);
          // Don’t ack → message will be retried
        }
      }
    });
  } catch (err) {
    console.error('❌ Consumer error:', err);
    process.exit(1);
  }
}

startConsumer();
