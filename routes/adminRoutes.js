const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAdmin } = require('../middleware/viewAuth');

// Apply requireAdmin middleware to all routes in this router
router.use((req, res, next) => {
  console.log('Admin Route Hit:', req.method, req.path);
  next();
});
router.use(requireAdmin);

// Monitor routes
router.get('/bid-monitor', adminController.getMarketMonitor);
router.get('/market-monitor', adminController.getMarketMonitor);

router.get('/dashboard', adminController.getDashboard);
router.get('/games', adminController.getGames);
router.get('/result-entry', adminController.getResultEntry);
router.get('/users', adminController.getUsers);
router.put('/api/users/:id/status', adminController.updateUserStatus);
router.get('/withdrawals', adminController.getWithdrawals);
router.get('/api/bids/:gameId', adminController.getBidStatsAPI);
router.get('/api/market-stats', adminController.getMarketStatsByDateAPI);
router.post('/api/results/declare', adminController.declareResult);
router.post('/api/results/schedule', adminController.scheduleResult);

module.exports = router;
