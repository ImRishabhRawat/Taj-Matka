require("dotenv").config();
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: "postgres", // Connect to default database first
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD,
});

async function setupDatabase() {
  const client = await pool.connect();

  try {
    console.log("🔧 Starting database setup...\n");

    // Create database if not exists
    const dbName = process.env.DB_NAME || "taj_matka";
    console.log(`📦 Creating database: ${dbName}`);

    await client.query(`DROP DATABASE IF EXISTS ${dbName}`);
    await client.query(`CREATE DATABASE ${dbName}`);
    console.log("✅ Database created successfully\n");

    client.release();

    // Connect to the new database
    const appPool = new Pool({
      host: process.env.DB_HOST || "localhost",
      port: process.env.DB_PORT || 5432,
      database: dbName,
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD,
    });

    const appClient = await appPool.connect();

    // Read and execute schema SQL
    const schemaPath = path.join(__dirname, "..", "database", "schema.sql");
    const schemaSql = fs.readFileSync(schemaPath, "utf8");

    console.log("📋 Executing schema...");
    await appClient.query(schemaSql);
    console.log("✅ Schema created successfully\n");

    // Insert seed data
    console.log("🌱 Inserting seed data...");

    // Create admin user (password: admin123)
    const bcrypt = require("bcryptjs");
    const adminPassword = await bcrypt.hash("admin123", 10);

    await appClient.query(
      `
      INSERT INTO users (phone, name, password_hash, role, balance, is_active)
      VALUES ('9999999999', 'Admin', $1, 'admin', 0, true)
    `,
      [adminPassword]
    );

    // Create sample games
    await appClient.query(`
      INSERT INTO games (name, open_time, close_time, is_active) VALUES
      ('DELHI BAZAR', '07:00:00', '15:00:00', true),
      ('SHREE GANESH', '07:00:00', '16:30:00', true),
      ('FARIDABAD', '07:00:00', '18:00:00', true),
      ('SANATANI NIGHT', '07:00:00', '20:00:00', true)
    `);

    console.log("✅ Seed data inserted successfully\n");

    console.log("🎉 Database setup completed!");
    console.log("\n📝 Default Admin Credentials:");
    console.log("   Phone: 9999999999");
    console.log("   Password: admin123\n");

    appClient.release();
    await appPool.end();
  } catch (error) {
    console.error("❌ Error setting up database:", error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run setup
setupDatabase()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
