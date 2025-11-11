// comparator.js
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Client } = pg;

// Connect to old and new DB
const oldClient = new Client({
  host: process.env.OLD_DB_HOST,
  port: process.env.OLD_DB_PORT,
  user: process.env.OLD_DB_USER,
  password: process.env.OLD_DB_PASSWORD,
  database: process.env.OLD_DB_NAME,
});

const newClient = new Client({
  host: process.env.NEW_DB_HOST,
  port: process.env.NEW_DB_PORT,
  user: process.env.NEW_DB_USER,
  password: process.env.NEW_DB_PASSWORD,
  database: process.env.NEW_DB_NAME,
});

async function compareData() {
  try {
    await oldClient.connect();
    await newClient.connect();

    // Compare row counts first
    const oldCountRes = await oldClient.query("SELECT COUNT(*) FROM users");
    const newCountRes = await newClient.query("SELECT COUNT(*) FROM users");

    const oldCount = parseInt(oldCountRes.rows[0].count, 10);
    const newCount = parseInt(newCountRes.rows[0].count, 10);

    console.log(`Old DB row count: ${oldCount}`);
    console.log(`New DB row count: ${newCount}`);

    if (oldCount !== newCount) {
      console.error("❌ Row counts do not match!");
      return;
    }

    console.log("✅ Row counts match. Checking sample data...");

    // Fetch 5 random rows from old and new DBs
    const oldRows = await oldClient.query(
      "SELECT * FROM users ORDER BY RANDOM() LIMIT 5"
    );
    const newRows = await newClient.query(
      "SELECT * FROM users ORDER BY RANDOM() LIMIT 5"
    );

    console.log("Old DB sample rows:", oldRows.rows);
    console.log("New DB sample rows:", newRows.rows);

    console.log("✅ Comparison complete.");
  } catch (err) {
    console.error("Error comparing data:", err);
  } finally {
    await oldClient.end();
    await newClient.end();
  }
}

compareData();
