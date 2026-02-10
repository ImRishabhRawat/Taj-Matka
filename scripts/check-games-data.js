/**
 * Check games table data to verify mid_time columns exist and have data
 */

const pool = require("../config/database");

async function checkGamesData() {
  try {
    console.log("Checking games table structure and data...\n");

    // Check table structure
    const columnsResult = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'games'
      ORDER BY ordinal_position
    `);

    console.log("=== GAMES TABLE COLUMNS ===");
    columnsResult.rows.forEach((col) => {
      console.log(
        `${col.column_name}: ${col.data_type} (default: ${col.column_default || "none"})`,
      );
    });

    // Check actual data
    const gamesResult = await pool.query("SELECT * FROM games ORDER BY id");

    console.log("\n=== GAMES DATA ===");
    gamesResult.rows.forEach((game) => {
      console.log(`\nGame ID ${game.id}: ${game.name}`);
      console.log(`  Open: ${game.open_time}, Close: ${game.close_time}`);
      console.log(`  Mid Time: ${game.mid_time || "NULL"}`);
      console.log(
        `  Max Bet After Mid: ${game.max_bet_after_mid_time || "NULL"}`,
      );
      console.log(`  Active: ${game.is_active}`);
    });

    process.exit(0);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

checkGamesData();
