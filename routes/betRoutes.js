/**
 * Bet Routes
 * /api/bets
 */

const express = require('express');
const router = express.Router();
const betController = require('../controllers/betController');
const { authenticate } = require('../middleware/auth');
const { isAdmin } = require('../middleware/admin');

// User routes (protected)
router.post('/', authenticate, betController.placeBet);
router.get('/history', authenticate, betController.getBetHistory);
router.get('/wins', authenticate, betController.getWinningBets);
router.get('/stats', authenticate, betController.getBetStats);

// Admin routes
router.get('/session/:sessionId', authenticate, isAdmin, betController.getBetsBySession);

module.exports = router;
