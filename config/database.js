require("dotenv").config();
const { Pool } = require("pg");

const isProduction = process.env.NODE_ENV === "production";

const pool = new Pool({
  // Use connectionString if it exists (Render), otherwise use local object
  connectionString: process.env.DATABASE_URL,
  host: process.env.DATABASE_URL ? undefined : process.env.DB_HOST,
  port: process.env.DATABASE_URL ? undefined : process.env.DB_PORT,
  user: process.env.DATABASE_URL ? undefined : process.env.DB_USER,
  password: process.env.DATABASE_URL ? undefined : process.env.DB_PASSWORD,
  database: process.env.DATABASE_URL ? undefined : process.env.DB_NAME,

  // SSL is required for Render but usually disabled for local Dev
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,

  // Connection pool settings for stability
  max: 10, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection could not be established
  // Keepalive settings to prevent connection termination
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

pool.on("connect", () => console.log("✅ Connected to Database"));
module.exports = pool;
