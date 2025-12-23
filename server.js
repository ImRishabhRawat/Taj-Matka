/**
 * Server Entry Point
 */

require('dotenv').config();
const app = require('./app');
const pool = require('./config/database');

const PORT = process.env.PORT || 3000;

// Start server
const server = app.listen(PORT, () => {
  console.log('\n🚀 Taj Matka Server Started');
  console.log(`📡 Server running on http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⏰ Started at: ${new Date().toLocaleString()}\n`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\n⚠️  SIGTERM signal received: closing HTTP server');
  
  server.close(async () => {
    console.log('🔌 HTTP server closed');
    
    // Close database connection
    try {
      await pool.end();
      console.log('✅ PostgreSQL connection closed');
      
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  });
});

process.on('SIGINT', async () => {
  console.log('\n⚠️  SIGINT signal received: closing HTTP server');
  
  server.close(async () => {
    console.log('🔌 HTTP server closed');
    
    try {
      await pool.end();
      console.log('✅ PostgreSQL connection closed');
      
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
