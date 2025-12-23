/**
 * Game Routes
 * /api/games
 */

const express = require('express');
const router = express.Router();
const gameController = require('../controllers/gameController');
const { authenticate } = require('../middleware/auth');
const { isAdmin } = require('../middleware/admin');

// Public/User routes
router.get('/', gameController.getAllGames);
router.get('/results', gameController.getResults);
router.get('/:id', gameController.getGameById);
router.get('/:id/status', gameController.getGameStatus);

// Admin routes
router.post('/', authenticate, isAdmin, gameController.createGame);
router.put('/:id', authenticate, isAdmin, gameController.updateGame);

module.exports = router;
