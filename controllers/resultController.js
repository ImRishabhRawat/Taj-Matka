/**
 * Result Controller
 * Handles result declaration and processing (Admin only)
 */

const { declareResult } = require('../utils/payoutEngine');
const Game = require('../models/Game');

/**
 * Declare result for a game session
 * POST /api/results
 */
async function declareGameResult(req, res) {
  try {
    const { gameSessionId, winningNumber } = req.body;
    
    // Validation
    if (!gameSessionId || !winningNumber) {
      return res.status(400).json({
        success: false,
        message: 'Game session ID and winning number are required'
      });
    }
    
    // Validate winning number format (00-99)
    if (!/^\d{2}$/.test(winningNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Winning number must be a 2-digit number (00-99)'
      });
    }
    
    // Verify session exists
    const session = await Game.getSessionById(parseInt(gameSessionId));
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Game session not found'
      });
    }
    
    // Declare result (idempotent operation)
    const result = await declareResult(parseInt(gameSessionId), winningNumber);
    
    return res.json({
      success: true,
      message: 'Result declared successfully',
      data: result
    });
    
  } catch (error) {
    console.error('Error declaring result:', error);
    
    if (error.message === 'Result already declared for this session') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Failed to declare result'
    });
  }
}

/**
 * Get result by session ID
 * GET /api/results/:sessionId
 */
async function getResultBySession(req, res) {
  try {
    const { sessionId } = req.params;
    
    const session = await Game.getSessionById(parseInt(sessionId));
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }
    
    return res.json({
      success: true,
      data: session
    });
    
  } catch (error) {
    console.error('Error getting result:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get result'
    });
  }
}

module.exports = {
  declareGameResult,
  getResultBySession
};
