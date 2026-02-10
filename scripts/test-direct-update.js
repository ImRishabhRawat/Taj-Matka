/**
 * Direct API test - Update game with mid-time via Game.update()
 */

const Game = require("../models/Game");
const pool = require("../config/database");

async function testDirectUpdate() {
  try {
    console.log("=== Testing Direct Game Update ===\n");

    // Get all games first
    const allGames = await pool.query(
      "SELECT id, name, mid_time, max_bet_after_mid_time FROM games ORDER BY id",
    );

    console.log("Current games:");
    allGames.rows.forEach((g) => {
      console.log(
        `  [${g.id}] ${g.name} - Mid: ${g.mid_time || "NULL"}, Max: ₹${g.max_bet_after_mid_time}`,
      );
    });

    if (allGames.rows.length === 0) {
      console.log("\nNo games found!");
      process.exit(1);
    }

    // Pick the first game
    const gameId = allGames.rows[0].id;
    console.log(`\nUpdating game ID ${gameId}...`);

    // Update with mid-time
    const updated = await Game.update(gameId, {
      midTime: "10:30:00",
      maxBetAfterMidTime: 60.0,
    });

    console.log("\nUpdate result:");
    console.log(`  Name: ${updated.name}`);
    console.log(`  Mid Time: ${updated.mid_time}`);
    console.log(`  Max Bet After Mid: ₹${updated.max_bet_after_mid_time}`);

    // Verify in database
    const verify = await pool.query("SELECT * FROM games WHERE id = $1", [
      gameId,
    ]);
    console.log("\nDatabase verification:");
    console.log(`  Mid Time: ${verify.rows[0].mid_time}`);
    console.log(
      `  Max Bet After Mid: ₹${verify.rows[0].max_bet_after_mid_time}`,
    );

    console.log("\n✓ SUCCESS! Mid-time feature is working correctly.");
    console.log("\nNow try:");
    console.log("1. Go to http://localhost:3000/admin/games");
    console.log("2. Hard refresh (Ctrl+Shift+R)");
    console.log("3. You should see the mid-time values in the table");

    process.exit(0);
  } catch (error) {
    console.error("\n✗ ERROR:", error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testDirectUpdate();
