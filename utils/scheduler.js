const { checkScheduledResults } = require('../services/gameService');

/**
 * Simple scheduler to check for scheduled results every minute
 */
function initScheduler() {
  console.log('⏰ Initializing automated result scheduler...');
  
  // Check every 60 seconds
  setInterval(async () => {
    try {
      await checkScheduledResults();
    } catch (error) {
      console.error('❌ Scheduler Error:', error);
    }
  }, 60000);
  
  // Also run once immediately on startup
  checkScheduledResults();
}

module.exports = { initScheduler };
