const pool = require('./config/database');

async function resetForTesting() {
  try {
    console.log('Resetting Game ID 22 for validation...');
    
    // 1. Extend Game Time
    await pool.query(`UPDATE games SET close_time = '22:00:00' WHERE id = 22`);
    console.log('✅ Extended Game 22 close_time to 22:00:00');

    // 2. Re-open Session
    await pool.query(`
      UPDATE game_sessions 
      SET status = 'pending', winning_number = NULL, result_declared_at = NULL 
      WHERE game_id = 22 AND session_date = CURRENT_DATE
    `);
    console.log('✅ Re-opened session for Game 22');

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

resetForTesting();
