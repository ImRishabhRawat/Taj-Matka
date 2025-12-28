const pool = require('./config/database');

async function test() {
  try {
    const res = await pool.query('SELECT id, name, is_active FROM games');
    console.log('Games:', res.rows);
  } catch (e) {
    console.error(e);
  } finally {
    pool.end();
  }
}

test();
