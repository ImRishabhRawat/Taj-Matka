const pool = require("../../config/database");
const fs = require("fs");
const path = require("path");

async function runMigration() {
  try {
    console.log("Running banners table migration...");

    const sql = fs.readFileSync(
      path.join(__dirname, "create_banners_table.sql"),
      "utf8",
    );

    await pool.query(sql);
    console.log("✅ Banners table created successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

runMigration();
