/**
 * Wallet Routes
 * /api/wallet
 */

const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const { authenticate } = require('../middleware/auth');
const { isAdmin } = require('../middleware/admin');

// User routes (protected)
router.get('/', authenticate, walletController.getWallet);
router.get('/transactions', authenticate, walletController.getTransactions);
router.get('/summary', authenticate, walletController.getTransactionSummary);
router.post('/withdraw', authenticate, walletController.requestWithdrawal);
router.get('/withdrawals', authenticate, walletController.getWithdrawalRequests);

// Admin routes
router.post('/deposit', authenticate, isAdmin, walletController.addFunds);
router.get('/admin/withdrawals', authenticate, isAdmin, walletController.getAllWithdrawalRequests);
router.put('/admin/withdrawals/:id', authenticate, isAdmin, walletController.processWithdrawal);

module.exports = router;
