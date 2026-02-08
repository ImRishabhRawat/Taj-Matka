const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function runMigration() {
  try {
    console.log("🔄 Running database migration...\n");

    // Read the migration file
    const migrationPath = path.join(
      __dirname,
      "..",
      "database",
      "migrations",
      "add_admin_panel_tables.sql",
    );
    const migrationSQL = fs.readFileSync(migrationPath, "utf8");

    // Execute the migration
    await pool.query(migrationSQL);

    console.log("✅ Migration completed successfully!\n");
    console.log("Tables added/updated:");
    console.log("  - notifications");
    console.log("  - popups");
    console.log("  - transactions (updated)");
    console.log("  - withdrawal_requests (updated)");
    console.log("  - game_sessions (updated)\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    console.error("\nFull error:", error);
    process.exit(1);
  }
}

runMigration();
