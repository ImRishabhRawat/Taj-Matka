const pool = require('./config/database');

async function debugAllSessions() {
  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().split(' ')[0]; // HH:MM:SS

    console.log(`Debug Time: ${currentTime}`);

    const result = await pool.query(`
      SELECT 
        gs.id, 
        gs.session_date, 
        gs.status, 
        gs.is_scheduled,
        g.name, 
        g.close_time :: text as close_time_str
      FROM game_sessions gs
      JOIN games g ON gs.game_id = g.id
      WHERE gs.session_date = $1
      AND gs.status = 'completed'
    `, [today]);

    console.log(`Completed Sessions Today:`);
    result.rows.forEach(r => {
        console.log(`ID: ${r.id}, Name: ${r.name}, Status: ${r.status}, Scheduled: ${r.is_scheduled}, CloseTime: ${r.close_time_str}, Current: ${currentTime}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

debugAllSessions();
