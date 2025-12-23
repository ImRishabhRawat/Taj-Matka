/**
 * Result Routes
 * /api/results
 */

const express = require('express');
const router = express.Router();
const resultController = require('../controllers/resultController');
const { authenticate } = require('../middleware/auth');
const { isAdmin } = require('../middleware/admin');

// Admin only routes
router.post('/', authenticate, isAdmin, resultController.declareGameResult);
router.get('/:sessionId', resultController.getResultBySession);

module.exports = router;
