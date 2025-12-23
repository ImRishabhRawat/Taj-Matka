/**
 * Bet Controller
 * Handles bet placement with Palti logic in backend
 */

const Bet = require('../models/Bet');
const Game = require('../models/Game');
const { 
  generateCrossingBets, 
  applyPalti, 
  isValidJodiNumber, 
  isValidHarufNumber,
  calculateTotalAmount,
  getPayoutMultiplier 
} = require('../utils/betCalculator');

/**
 * Place bet (handles Jodi, Haruf, Crossing, and Palti)
 * POST /api/bets
 */
async function placeBet(req, res) {
  try {
    const userId = req.user.id;
    const { gameId, betType, numbers, amount, palti, crossing, crossingDigits } = req.body;
    
    // Validation
    if (!gameId || !betType || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    
    // CRITICAL SECURITY: Validate game is open using SERVER TIME
    // This prevents users from manipulating their device clock
    const game = await Game.findById(gameId);
    
    if (!game || !game.is_active) {
      return res.status(400).json({
        success: false,
        message: 'Game not found or inactive'
      });
    }
    
    // Calculate if game is open based on SERVER time
    const now = new Date();
    const currentTimeInSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    
    const [closeHours, closeMinutes, closeSeconds] = game.close_time.split(':').map(Number);
    const closeTimeInSeconds = closeHours * 3600 + closeMinutes * 60 + closeSeconds;
    
    if (currentTimeInSeconds >= closeTimeInSeconds) {
      return res.status(400).json({
        success: false,
        message: 'Game is currently closed. Betting time has ended.'
      });
    }
    
    // Get or create today's session
    const session = await Game.getOrCreateTodaySession(gameId);
    
    if (session.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Betting is closed for this session'
      });
    }
    
    // Prepare bets array
    let betsToPlace = [];
    const payoutMultiplier = getPayoutMultiplier(betType);
    
    // Handle different bet modes
    if (crossing && crossingDigits) {
      // CROSSING MODE: Generate all combinations
      const combinations = generateCrossingBets(crossingDigits, amount);
      
      betsToPlace = combinations.map(combo => ({
        gameSessionId: session.id,
        betType: 'jodi', // Crossing is always Jodi
        betNumber: combo.number,
        betAmount: combo.amount,
        payoutMultiplier: getPayoutMultiplier('jodi')
      }));
      
    } else if (Array.isArray(numbers)) {
      // MULTIPLE NUMBERS MODE (from Copy-Paste)
      for (const num of numbers) {
        // Validate number based on bet type
        if (betType === 'jodi' && !isValidJodiNumber(num)) {
          return res.status(400).json({
            success: false,
            message: `Invalid Jodi number: ${num}`
          });
        }
        
        if ((betType === 'haruf_andar' || betType === 'haruf_bahar') && !isValidHarufNumber(num)) {
          return res.status(400).json({
            success: false,
            message: `Invalid Haruf number: ${num}`
          });
        }
        
        // Apply Palti if enabled
        if (palti && betType === 'jodi') {
          const paltiBets = applyPalti(num, amount);
          paltiBets.forEach(bet => {
            betsToPlace.push({
              gameSessionId: session.id,
              betType,
              betNumber: bet.number,
              betAmount: bet.amount,
              payoutMultiplier
            });
          });
        } else {
          betsToPlace.push({
            gameSessionId: session.id,
            betType,
            betNumber: num,
            betAmount: parseFloat(amount),
            payoutMultiplier
          });
        }
      }
      
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid bet format'
      });
    }
    
    // Validate minimum bet amount
    const minBetAmount = parseFloat(process.env.MIN_BET_AMOUNT) || 10;
    const invalidBets = betsToPlace.filter(bet => bet.betAmount < minBetAmount);
    
    if (invalidBets.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Minimum bet amount is ₹${minBetAmount}`
      });
    }
    
    // Calculate total amount
    const totalAmount = calculateTotalAmount(betsToPlace);
    
    // Validate maximum bet amount
    const maxBetAmount = parseFloat(process.env.MAX_BET_AMOUNT) || 10000;
    if (totalAmount > maxBetAmount) {
      return res.status(400).json({
        success: false,
        message: `Maximum total bet amount is ₹${maxBetAmount}`
      });
    }
    
    // Place bets (atomic transaction)
    const result = await Bet.createMultiple(betsToPlace, userId, totalAmount);
    
    return res.status(201).json({
      success: true,
      message: 'Bets placed successfully',
      data: {
        betsCount: result.bets.length,
        totalAmount: result.totalAmount,
        newBalance: result.newBalance,
        bets: result.bets
      }
    });
    
  } catch (error) {
    console.error('Error placing bet:', error);
    
    if (error.message === 'Insufficient balance') {
      return res.status(400).json({
        success: false,
        message: 'Insufficient balance'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Failed to place bet'
    });
  }
}

/**
 * Get user's bet history
 * GET /api/bets/history
 */
async function getBetHistory(req, res) {
  try {
    const userId = req.user.id;
    const { limit = 50, offset = 0 } = req.query;
    
    const bets = await Bet.getUserBets(userId, parseInt(limit), parseInt(offset));
    
    return res.json({
      success: true,
      data: bets
    });
    
  } catch (error) {
    console.error('Error getting bet history:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get bet history'
    });
  }
}

/**
 * Get user's winning bets
 * GET /api/bets/wins
 */
async function getWinningBets(req, res) {
  try {
    const userId = req.user.id;
    const { limit = 50 } = req.query;
    
    const bets = await Bet.getUserWinningBets(userId, parseInt(limit));
    
    return res.json({
      success: true,
      data: bets
    });
    
  } catch (error) {
    console.error('Error getting winning bets:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get winning bets'
    });
  }
}

/**
 * Get user's bet statistics
 * GET /api/bets/stats
 */
async function getBetStats(req, res) {
  try {
    const userId = req.user.id;
    const stats = await Bet.getUserStats(userId);
    
    return res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('Error getting bet stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get bet statistics'
    });
  }
}

/**
 * Get bets by session (admin only)
 * GET /api/bets/session/:sessionId
 */
async function getBetsBySession(req, res) {
  try {
    const { sessionId } = req.params;
    const { status } = req.query;
    
    const bets = await Bet.getBySession(parseInt(sessionId), status);
    
    return res.json({
      success: true,
      data: bets
    });
    
  } catch (error) {
    console.error('Error getting bets by session:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get session bets'
    });
  }
}

module.exports = {
  placeBet,
  getBetHistory,
  getWinningBets,
  getBetStats,
  getBetsBySession
};
