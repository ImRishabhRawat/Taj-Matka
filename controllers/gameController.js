/**
 * Game Controller
 * Handles game listing, status with SERVER-SIDE time calculations
 */

const Game = require('../models/Game');

/**
 * Calculate time left in seconds (server-side)
 * @param {string} closeTime - Close time in HH:MM:SS format
 * @returns {number} Seconds remaining (0 if closed)
 */
function calculateTimeLeft(closeTime) {
  const now = new Date();
  const currentTimeInSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  
  const [closeHours, closeMinutes, closeSeconds] = closeTime.split(':').map(Number);
  const closeTimeInSeconds = closeHours * 3600 + closeMinutes * 60 + closeSeconds;
  
  const timeLeft = closeTimeInSeconds - currentTimeInSeconds;
  
  return Math.max(0, timeLeft);
}

/**
 * Get all active games with today's sessions
 * GET /api/games
 */
async function getAllGames(req, res) {
  try {
    const games = await Game.getAllWithTodaySessions();
    
    // Calculate status and timeLeft for each game (SERVER-SIDE)
    const enhancedGames = games.map(game => {
      const timeLeft = calculateTimeLeft(game.close_time);
      const isOpen = timeLeft > 0;
      
      return {
        ...game,
        isOpen,
        timeLeft, // Seconds remaining
        status: isOpen ? 'open' : 'closed'
      };
    });
    
    return res.json({
      success: true,
      data: enhancedGames,
      serverTime: new Date().toISOString() // For client sync
    });
    
  } catch (error) {
    console.error('Error getting games:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get games'
    });
  }
}

/**
 * Get single game with session details
 * GET /api/games/:id
 */
async function getGameById(req, res) {
  try {
    const { id } = req.params;
    const game = await Game.getGameWithTodaySession(parseInt(id));
    
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }
    
    // Calculate status (SERVER-SIDE)
    const timeLeft = calculateTimeLeft(game.close_time);
    const isOpen = timeLeft > 0;
    
    return res.json({
      success: true,
      data: {
        ...game,
        isOpen,
        timeLeft,
        status: isOpen ? 'open' : 'closed'
      },
      serverTime: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error getting game:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get game'
    });
  }
}

/**
 * Get game status (real-time)
 * GET /api/games/:id/status
 */
async function getGameStatus(req, res) {
  try {
    const { id } = req.params;
    const game = await Game.findById(parseInt(id));
    
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }
    
    // Calculate status (SERVER-SIDE)
    const timeLeft = calculateTimeLeft(game.close_time);
    const isOpen = timeLeft > 0;
    
    return res.json({
      success: true,
      data: {
        gameId: game.id,
        isOpen,
        timeLeft,
        status: isOpen ? 'open' : 'closed'
      },
      serverTime: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error getting game status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get game status'
    });
  }
}

/**
 * Get game results history
 * GET /api/games/results
 */
async function getResults(req, res) {
  try {
    const { gameId, limit = 50 } = req.query;
    
    const results = await Game.getResults(
      gameId ? parseInt(gameId) : null,
      parseInt(limit)
    );
    
    return res.json({
      success: true,
      data: results
    });
    
  } catch (error) {
    console.error('Error getting results:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get results'
    });
  }
}

/**
 * Create new game (admin only)
 * POST /api/games
 */
async function createGame(req, res) {
  try {
    const { name, openTime, closeTime } = req.body;
    
    // Validation
    if (!name || !openTime || !closeTime) {
      return res.status(400).json({
        success: false,
        message: 'Name, open time, and close time are required'
      });
    }
    
    const game = await Game.create({ name, openTime, closeTime });
    
    return res.status(201).json({
      success: true,
      message: 'Game created successfully',
      data: game
    });
    
  } catch (error) {
    console.error('Error creating game:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create game'
    });
  }
}

/**
 * Update game (admin only)
 * PUT /api/games/:id
 */
async function updateGame(req, res) {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const game = await Game.update(parseInt(id), updates);
    
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }
    
    return res.json({
      success: true,
      message: 'Game updated successfully',
      data: game
    });
    
  } catch (error) {
    console.error('Error updating game:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update game'
    });
  }
}

/**
 * Get chart data
 * GET /api/games/chart-data
 */
async function getChartData(req, res) {
  try {
    const { days = 30 } = req.query;
    
    const data = await Game.getChartData(parseInt(days));
    
    return res.json({
      success: true,
      data
    });
    
  } catch (error) {
    console.error('Error getting chart data:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get chart data'
    });
  }
}

module.exports = {
  getAllGames,
  getGameById,
  getGameStatus,
  getResults,
  createGame,
  updateGame,
  getChartData,
  deleteGame
};

/**
 * Delete game (admin only)
 * DELETE /api/games/:id
 */
async function deleteGame(req, res) {
  try {
    const { id } = req.params;
    
    // Attempt to delete
    // Note: If there are foreign key constraints (like bets, sessions), this might fail
    // or cascade depending on DB setup. 
    const deleted = await Game.deleteGame(parseInt(id));
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }
    
    return res.json({
      success: true,
      message: 'Game deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting game:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete game. It might have associated data.'
    });
  }
}
