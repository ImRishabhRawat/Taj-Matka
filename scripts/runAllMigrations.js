require("dotenv").config();
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

// Use DATABASE_URL from Render, fallback to individual params for local
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

async function runAllMigrations() {
  let client;
  try {
    console.log("🔧 Connecting to database...");
    client = await pool.connect();
    console.log("✅ Connected to database successfully!");

    // 1. Run main schema
    console.log("\n📋 Step 1: Running main schema...");
    const schemaPath = path.join(__dirname, "..", "database", "schema.sql");
    const schemaSql = fs.readFileSync(schemaPath, "utf8");
    await client.query(schemaSql);
    console.log("✅ Main schema executed successfully!");

    // 2. Run admin panel tables migration
    console.log("\n📋 Step 2: Running admin panel tables migration...");
    const adminPanelPath = path.join(
      __dirname,
      "..",
      "database",
      "migrations",
      "add_admin_panel_tables.sql",
    );
    const adminPanelSql = fs.readFileSync(adminPanelPath, "utf8");
    await client.query(adminPanelSql);
    console.log("✅ Admin panel tables created successfully!");

    // 3. Run banners table migration
    console.log("\n📋 Step 3: Running banners table migration...");
    const bannersPath = path.join(
      __dirname,
      "..",
      "database",
      "migrations",
      "create_banners_table.sql",
    );
    const bannersSql = fs.readFileSync(bannersPath, "utf8");
    await client.query(bannersSql);
    console.log("✅ Banners table created successfully!");

    // 4. Run popup image migration
    console.log("\n📋 Step 4: Running popup image migration...");
    const popupPath = path.join(
      __dirname,
      "..",
      "database",
      "migrations",
      "add_popup_image.sql",
    );
    const popupSql = fs.readFileSync(popupPath, "utf8");
    await client.query(popupSql);
    console.log("✅ Popup image column added successfully!");

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
