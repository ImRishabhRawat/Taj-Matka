const pool = require('../config/database');

async function updateSchema() {
  let client;
  try {
    console.log('🔧 Connecting to database to update game_sessions...');
    
    // Ensure the pool is using SSL if on Render
    // If your config/database.js already handles this, you are good. 
    // Otherwise, we must ensure SSL is active.
    client = await pool.connect();

    await client.query(`
      ALTER TABLE game_sessions 
      ADD COLUMN IF NOT EXISTS scheduled_winning_number VARCHAR(2),
      ADD COLUMN IF NOT EXISTS is_scheduled BOOLEAN DEFAULT false
    `);
    
    console.log('✅ Schema updated successfully: New columns added.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating schema:', error.message);
    process.exit(1);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

updateSchema();