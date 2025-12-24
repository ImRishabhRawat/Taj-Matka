require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Use DATABASE_URL from Render, fallback to local only if URL is missing
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

async function setupDatabase() {
  let client;
  try {
    console.log("🔧 Connecting to database for setup...");
    client = await pool.connect();

    // Read schema
    const schemaPath = path.join(__dirname, "..", "database", "schema.sql");
    const schemaSql = fs.readFileSync(schemaPath, "utf8");

    console.log("📋 Executing schema...");
    await client.query(schemaSql);
    
    // ... rest of your admin creation and seed data logic ...
    
    console.log("🎉 Database setup completed!");
  } catch (error) {
    console.error("❌ Error setting up database:", error.message);
    process.exit(1);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

setupDatabase();