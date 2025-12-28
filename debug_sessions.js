const pool = require('./config/database');

async function checkSessions() {
  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().split(' ')[0];

    console.log(`Current Time: ${today} ${currentTime}`);

    const result = await pool.query(`
      SELECT 
        gs.id, 
        gs.session_date, 
        gs.status, 
        gs.is_scheduled, 
        gs.scheduled_winning_number, 
        gs.winning_number,
        g.name, 
        g.close_time
      FROM game_sessions gs
      JOIN games g ON gs.game_id = g.id
      WHERE gs.session_date = $1
    `, [today]);

    console.log(JSON.stringify(result.rows, null, 2));
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

checkSessions();
