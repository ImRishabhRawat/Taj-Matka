/**
 * View all games data in a cleaner format
 */

const pool = require("../config/database");

async function viewAllGames() {
  try {
    const result = await pool.query("SELECT * FROM games ORDER BY id");

    console.log("=== ALL GAMES ===\n");
    result.rows.forEach((game) => {
      console.log(`Game #${game.id}: ${game.name}`);
      console.log(`  Times: ${game.open_time} - ${game.close_time}`);
      console.log(`  Mid Time: ${game.mid_time || "Not Set"}`);
      console.log(`  Max Bet After Mid: ₹${game.max_bet_after_mid_time}`);
      console.log(`  Status: ${game.is_active ? "Active" : "Inactive"}`);
      console.log("");
    });

    process.exit(0);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

viewAllGames();
