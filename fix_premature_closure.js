const pool = require('./config/database');

async function fixPrematureClosure() {
  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().split(' ')[0]; // HH:MM:SS

    // Find sessions that are completed, scheduled, but their close time is in the future
    const result = await pool.query(`
      SELECT 
        gs.id, 
        gs.session_date, 
        gs.status, 
        g.name, 
        g.close_time
      FROM game_sessions gs
      JOIN games g ON gs.game_id = g.id
      WHERE gs.session_date = $1
      AND gs.status = 'completed'
      AND gs.is_scheduled = true
      AND g.close_time > $2
    `, [today, currentTime]);

    if (result.rows.length === 0) {
      console.log('No prematurely closed sessions found.');
      process.exit(0);
    }

    console.log(`Found ${result.rows.length} prematurely closed sessions:`);
    result.rows.forEach(r => console.log(`- ID: ${r.id}, Game: ${r.name}, CloseTime: ${r.close_time}`));

    for (const session of result.rows) {
      console.log(`Re-opening session ${session.id}...`);
      await pool.query(`
        UPDATE game_sessions 
        SET status = 'pending', winning_number = NULL, result_declared_at = NULL
        WHERE id = $1
      `, [session.id]);
      console.log(`✅ Session ${session.id} re-opened for betting.`);
    }

    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

fixPrematureClosure();
