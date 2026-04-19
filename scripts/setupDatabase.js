require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Use DATABASE_URL from Render, fallback to local only if URL is missing
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  host: process.env.DATABASE_URL ? undefined : process.env.DB_HOST,
  port: process.env.DATABASE_URL ? undefined : process.env.DB_PORT,
  user: process.env.DATABASE_URL ? undefined : process.env.DB_USER,
  password: process.env.DATABASE_URL ? undefined : process.env.DB_PASSWORD,
  database: process.env.DATABASE_URL ? undefined : process.env.DB_NAME,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

async function setupDatabase() {
  let client;
  try {
    console.log("🔧 Connecting to database for setup...");
    client = await pool.connect();

    // 1. Read and execute schema
    const schemaPath = path.join(__dirname, "..", "database", "schema.sql");
    const schemaSql = fs.readFileSync(schemaPath, "utf8");

    console.log("📋 Executing schema...");
    await client.query(schemaSql);
    console.log("✅ Schema executed successfully!");

    // 2. Create default admin user if not exists
    console.log("\n👤 Creating default admin user...");
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const adminCheckResult = await client.query(
      "SELECT id FROM users WHERE role = 'admin' LIMIT 1"
    );

    if (adminCheckResult.rows.length === 0) {
      await client.query(
        `INSERT INTO users (phone, name, password_hash, role, balance, is_active) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ["9999999999", "Admin", hashedPassword, "admin", 0, true]
      );
      console.log("✅ Default admin user created!");
      console.log("   Phone: 9999999999");
      console.log("   Password:", adminPassword);
    } else {
      console.log("ℹ️  Admin user already exists, skipping creation.");
    }

    // 3. Create sample games if not exists
    console.log("\n🎮 Creating sample games...");
    const gamesCheckResult = await client.query("SELECT COUNT(*) FROM games");

    if (parseInt(gamesCheckResult.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO games (name, open_time, close_time, is_active) VALUES
        ('Milan Day', '15:30:00', '17:30:00', true),
        ('Kalyan', '15:45:00', '17:45:00', true),
        ('Main Bazar', '21:30:00', '23:30:00', true)
      `);
      console.log("✅ Sample games created!");
    } else {
      console.log("ℹ️  Games already exist, skipping creation.");
    }

    console.log("\n🎉 Database setup completed!");
    console.log("💡 Run 'npm run db:migrate' for additional migrations.");
  } catch (error) {
    console.error("❌ Error setting up database:", error.message);
    process.exit(1);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

setupDatabase();