const pool = require('../config/database');

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Starting migration...');
    
    // Create settings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        key_name VARCHAR(50) UNIQUE NOT NULL,
        value_text TEXT,
        description TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Created settings table.');

    // Insert default rates if not exist
    const defaults = [
      { key: 'rate_jodi', value: '90', desc: 'Jodi Win Rate (per 1 unit)' },
      { key: 'rate_haruf', value: '9', desc: 'Haruf Win Rate (per 1 unit)' }
      // Haruf Andar/Bahar usually same (9)
    ];

    for (const def of defaults) {
      await client.query(`
        INSERT INTO settings (key_name, value_text, description)
        VALUES ($1, $2, $3)
        ON CONFLICT (key_name) DO NOTHING
      `, [def.key, def.value, def.desc]);
    }
    console.log('Inserted default settings.');

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    client.release();
    process.exit();
  }
}

migrate();
