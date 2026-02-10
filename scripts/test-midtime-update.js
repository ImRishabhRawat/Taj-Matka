/**
 * Test script to update a game with mid_time values
 */

const pool = require("../config/database");
const Game = require("../models/Game");

async function testMidTimeUpdate() {
  try {
    console.log("Testing mid-time update functionality...\n");

    // Get first game
    const gamesResult = await pool.query("SELECT * FROM games LIMIT 1");
    if (gamesResult.rows.length === 0) {
      console.log("No games found in database");
      process.exit(1);
    }

    const game = gamesResult.rows[0];
    console.log("Original game data:");
    console.log(`  ID: ${game.id}`);
    console.log(`  Name: ${game.name}`);
    console.log(`  Open: ${game.open_time}, Close: ${game.close_time}`);
    console.log(`  Mid Time: ${game.mid_time || "NULL"}`);
    console.log(`  Max Bet After Mid: ${game.max_bet_after_mid_time}`);

    // Update with mid-time
    console.log("\nUpdating game with mid-time values...");
    const updated = await Game.update(game.id, {
      midTime: "09:00:00",
      maxBetAfterMidTime: 75.0,
    });

    console.log("\nUpdated game data:");
    console.log(`  ID: ${updated.id}`);
    console.log(`  Name: ${updated.name}`);
    console.log(`  Open: ${updated.open_time}, Close: ${updated.close_time}`);
    console.log(`  Mid Time: ${updated.mid_time || "NULL"}`);
    console.log(`  Max Bet After Mid: ${updated.max_bet_after_mid_time}`);

    console.log("\n✓ Test completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("✗ Test failed:", error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testMidTimeUpdate();
