const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAdmin } = require('../middleware/viewAuth');

// Apply requireAdmin middleware to all routes in this router
router.use(requireAdmin);

router.get('/dashboard', adminController.getDashboard);
router.get('/games', adminController.getGames);
router.get('/result-entry', adminController.getResultEntry);
router.get('/users', adminController.getUsers);
router.put('/api/users/:id/status', adminController.updateUserStatus);
router.get('/withdrawals', adminController.getWithdrawals);

module.exports = router;
