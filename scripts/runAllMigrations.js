require("dotenv").config();
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

// Use DATABASE_URL from Render, fallback to individual params for local
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
  // Connection pool settings for Render
  max: 10, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection could not be established
  // Keepalive settings to prevent connection termination
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

async function runAllMigrations() {
  let client;
  try {
    console.log("🔧 Connecting to database...");

    // Retry connection logic for Render
    let retries = 3;
    while (retries > 0) {
      try {
        client = await pool.connect();
        console.log("✅ Connected to database successfully!");
        break;
      } catch (connErr) {
        retries--;
        if (retries === 0) throw connErr;
        console.log(
          `⚠️  Connection failed, retrying... (${retries} attempts left)`,
        );
        await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
      }
    }

    // 1. Run main schema
    console.log("\n📋 Step 1: Running main schema...");
    const usersExist = await client.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')",
    );

    if (!usersExist.rows[0].exists) {
      const schemaPath = path.join(__dirname, "..", "database", "schema.sql");
      const schemaSql = fs.readFileSync(schemaPath, "utf8");
      await client.query(schemaSql);
      console.log("✅ Main schema executed successfully!");
    } else {
      console.log(
        "ℹ️  Main schema already exists (users table found), skipping.",
      );
    }

    // 2. Run admin panel tables migration
    console.log("\n📋 Step 2: Running admin panel tables migration...");
    try {
      const adminPanelPath = path.join(
        __dirname,
        "..",
        "database",
        "migrations",
        "add_admin_panel_tables.sql",
      );
      if (fs.existsSync(adminPanelPath)) {
        const adminPanelSql = fs.readFileSync(adminPanelPath, "utf8");
        await client.query(adminPanelSql);
        console.log("✅ Admin panel tables created successfully!");
      }
    } catch (err) {
      console.log(
        `⚠️  Step 2 skipped/failed (might already exist): ${err.message}`,
      );
    }

    // 3. Run banners table migration
    console.log("\n📋 Step 3: Running banners table migration...");
    try {
      const bannersPath = path.join(
        __dirname,
        "..",
        "database",
        "migrations",
        "create_banners_table.sql",
      );
      if (fs.existsSync(bannersPath)) {
        const bannersSql = fs.readFileSync(bannersPath, "utf8");
        await client.query(bannersSql);
        console.log("✅ Banners table created successfully!");
      }
    } catch (err) {
      console.log(
        `⚠️  Step 3 skipped/failed (might already exist): ${err.message}`,
      );
    }

    // 4. Run popup image migration
    console.log("\n📋 Step 4: Running popup image migration...");
    try {
      const popupPath = path.join(
        __dirname,
        "..",
        "database",
        "migrations",
        "add_popup_image.sql",
      );
      if (fs.existsSync(popupPath)) {
        const popupSql = fs.readFileSync(popupPath, "utf8");
        await client.query(popupSql);
        console.log("✅ Popup image column added successfully!");
      }
    } catch (err) {
      console.log(
        `⚠️  Step 4 skipped/failed (might already exist): ${err.message}`,
      );
    }

    // 5. Create default admin user if not exists
    console.log("\n👤 Step 5: Creating default admin user...");
    const bcrypt = require("bcryptjs");
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const adminCheckResult = await client.query(
      "SELECT id FROM users WHERE role = 'admin' LIMIT 1",
    );

    if (adminCheckResult.rows.length === 0) {
      await client.query(
        `INSERT INTO users (phone, name, password_hash, role, balance, is_active) 
         VALUES ($1, $2, $3, $4, $5, $6)`,
        ["9999999999", "Admin", hashedPassword, "admin", 0, true],
      );
      console.log("✅ Default admin user created!");
      console.log("   Phone: 9999999999");
      console.log("   Password:", adminPassword);
    } else {
      console.log("ℹ️  Admin user already exists, skipping creation.");
    }

    // 6. Create sample games if not exists
    console.log("\n🎮 Step 6: Creating sample games...");
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

    // 7. Update schema for scheduled results
    console.log("\n📋 Step 7: Updating schema for scheduled results...");
    try {
      await client.query(`
        ALTER TABLE game_sessions 
        ADD COLUMN IF NOT EXISTS scheduled_winning_number VARCHAR(2),
        ADD COLUMN IF NOT EXISTS is_scheduled BOOLEAN DEFAULT false
      `);
      console.log("✅ Schema updated for scheduled results!");
    } catch (err) {
      console.error(
        "⚠️  Error updating schema columns (might already exist):",
        err.message,
      );
    }

    console.log("\n🎉 All migrations completed successfully!");
    console.log("✅ Database is ready for production!");
  } catch (error) {
    console.error("\n❌ Error running migrations:", error.message);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

runAllMigrations();
