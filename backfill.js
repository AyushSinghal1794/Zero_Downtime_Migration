// backfill.js
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const oldDb = new pg.Pool({
  user: process.env.OLD_DB_USER,
  host: process.env.OLD_DB_HOST,
  database: process.env.OLD_DB_NAME,
  password: process.env.OLD_DB_PASSWORD,
  port: process.env.OLD_DB_PORT,
});

const newDb = new pg.Pool({
  user: process.env.NEW_DB_USER,
  host: process.env.NEW_DB_HOST,
  database: process.env.NEW_DB_NAME,
  password: process.env.NEW_DB_PASSWORD,
  port: process.env.NEW_DB_PORT,
});

const BATCH_SIZE = 500;

async function backfill() {
  let lastId = 0;
  let totalCopied = 0;

  while (true) {
    console.log(`Fetching batch from old_db (id > ${lastId})...`);

    // Fetch rows in ascending ID order → stable pagination
    const res = await oldDb.query(
      `SELECT * FROM users WHERE id > $1 ORDER BY id ASC LIMIT $2`,
      [lastId, BATCH_SIZE]
    );

    if (res.rows.length === 0) {
      console.log("✅ Backfill complete. No more rows to migrate.");
      break;
    }

    for (const user of res.rows) {
      await newDb.query(
        `INSERT INTO users (id, name, email, created_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           email = EXCLUDED.email,
           created_at = EXCLUDED.created_at`,
        [user.id, user.name, user.email, user.created_at]
      );
      lastId = user.id;
      totalCopied++;
    }

    console.log(`✔ Copied ${res.rows.length} users (lastId=${lastId})`);
  }

  console.log(`🎉 Backfill finished. Total migrated: ${totalCopied} users.`);
  process.exit(0);
}

backfill().catch((err) => {
  console.error("❌ Backfill failed:", err);
  process.exit(1);
});
