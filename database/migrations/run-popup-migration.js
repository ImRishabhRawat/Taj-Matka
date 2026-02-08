const pool = require("../../config/database");
const fs = require("fs");
const path = require("path");

async function runMigration() {
  try {
    console.log("Running popup image migration...");

    const sql = fs.readFileSync(
      path.join(__dirname, "add_popup_image.sql"),
      "utf8",
    );

    await pool.query(sql);
    console.log("✅ Migration completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

runMigration();
