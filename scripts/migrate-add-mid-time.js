/**
 * Migration Script: Add mid_time and max_bet_after_mid_time to games table
 * Run this script once to update the database schema
 */

const pool = require("../config/database");

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log(
      "Starting migration: Add mid_time and max_bet_after_mid_time to games table...",
    );

    await client.query("BEGIN");

    // Add mid_time column
    await client.query(`
      ALTER TABLE games 
      ADD COLUMN IF NOT EXISTS mid_time TIME
    `);
    console.log("✓ Added mid_time column");

    // Add max_bet_after_mid_time column
    await client.query(`
      ALTER TABLE games 
      ADD COLUMN IF NOT EXISTS max_bet_after_mid_time DECIMAL(10, 2) DEFAULT 100.00
    `);
    console.log("✓ Added max_bet_after_mid_time column");

    await client.query("COMMIT");

    console.log("✓ Migration completed successfully!");
    process.exit(0);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("✗ Migration failed:", error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
