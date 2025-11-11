// cutover.js
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

function cutover() {
  try {
    // Simulate switching config from OLD -> NEW
    const appConfig = {
      DB_HOST: process.env.NEW_DB_HOST,
      DB_PORT: process.env.NEW_DB_PORT,
      DB_USER: process.env.NEW_DB_USER,
      DB_PASS: process.env.NEW_DB_PASSWORD,
      DB_NAME: process.env.NEW_DB_NAME,
    };

    fs.writeFileSync("active-db.json", JSON.stringify(appConfig, null, 2));

    console.log("✅ Cutover complete. Application now points to NEW DB.");
    console.log("Check 'active-db.json' for the active DB connection.");
  } catch (err) {
    console.error("❌ Cutover failed:", err);
  }
}

cutover();
