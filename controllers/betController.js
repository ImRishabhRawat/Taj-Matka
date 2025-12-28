/**
 * Bet Controller
 * Handles bet placement with Palti logic in backend
 */

const Bet = require('../models/Bet');
const Game = require('../models/Game');
const User = require('../models/User');
const Settings = require('../models/Settings');
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
  console.log('DEBUG: placeBet called with:', JSON.stringify(req.body));
  try {
    const userId = req.user.id;
    const { gameId, betType, numbers, amount, palti, crossing, crossingDigits, bets: directBets } = req.body;
    
    // 1. Initial Validation
    if (!gameId) {
      return res.status(400).json({ success: false, message: 'VALIDATION_ERR: GAME_ID_MISSING' });
    }
    
    // 2. CRITICAL SECURITY: Validate game is open using SERVER TIME
    const game = await Game.findById(gameId);
    if (!game || !game.is_active) {
      return res.status(400).json({ success: false, message: 'Game not found or inactive' });
    }
    
    // Server-side system time check
    const now = new Date();
    const currentTimeStr = now.getHours().toString().padStart(2, '0') + ':' + 
                          now.getMinutes().toString().padStart(2, '0') + ':' + 
                          now.getSeconds().toString().padStart(2, '0');
    
    if (currentTimeStr >= game.close_time) {
      return res.status(400).json({
        success: false,
        message: 'Game Closed'
      });
    }
    
    // Get or create today's session
    const session = await Game.getOrCreateTodaySession(gameId);
    if (session.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Betting is closed for this session' });
    }
    
    // Get dynamic rates
    const rates = await Settings.getAll();

    // 3. Prepare bets array (Unified Logic)
    let betsToPlace = [];
    
    // Mode A: Direct bets array (from Grid)
    if (Array.isArray(directBets)) {
      for (const bet of directBets) {
        let type = bet.type;
        if (type === 'andar') type = 'haruf_andar';
        if (type === 'bahar') type = 'haruf_bahar';
        
        const payoutMultiplier = getPayoutMultiplier(type, rates);
        betsToPlace.push({
          gameSessionId: session.id,
          betType: type,
          betNumber: String(bet.number),
          betAmount: parseFloat(bet.amount),
          payoutMultiplier
        });
      }
    } 
    // Mode B: Crossing Mode
    else if (crossingDigits) {
      const combinations = generateCrossingBets(crossingDigits, amount);
      betsToPlace = combinations.map(combo => ({
        gameSessionId: session.id,
        betType: 'jodi',
        betNumber: combo.number,
        betAmount: parseFloat(amount),
        payoutMultiplier: getPayoutMultiplier('jodi', rates)
      }));
    }
    // Mode C: Multiple Numbers / Copy-Paste / Haruf
    else if (Array.isArray(numbers)) {
      const actualBetType = betType === 'andar' ? 'haruf_andar' : (betType === 'bahar' ? 'haruf_bahar' : (betType || 'jodi'));
      const payoutMultiplier = getPayoutMultiplier(actualBetType, rates);

      for (const num of numbers) {
        // Skip invalid numbers
        if (actualBetType === 'jodi' && !isValidJodiNumber(num)) continue;
        if ((actualBetType.includes('haruf')) && !isValidHarufNumber(num)) continue;

        if (palti && actualBetType === 'jodi') {
          const paltiBets = applyPalti(num, amount);
          paltiBets.forEach(b => {
            betsToPlace.push({
              gameSessionId: session.id,
              betType: actualBetType,
              betNumber: b.number,
              betAmount: parseFloat(amount),
              payoutMultiplier
            });
          });
        } else {
          betsToPlace.push({
            gameSessionId: session.id,
            betType: actualBetType,
            betNumber: String(num),
            betAmount: parseFloat(amount),
            payoutMultiplier
          });
        }
      }
    } else {
      return res.status(400).json({ success: false, message: 'Invalid bet format' });
    }
    
    if (betsToPlace.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid bets identified' });
    }

    // 4. PRE-CALCULATION & GATEKEEPER
    const totalAmount = calculateTotalAmount(betsToPlace);
    console.log(`DEBUG: placing ${betsToPlace.length} bets, total amount: ${totalAmount}`);
    
    // Fetch current balance for pre-check
    const userWallet = await User.getWalletInfo(userId);
    if (!userWallet || parseFloat(userWallet.balance) < totalAmount) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient Balance'
      });
    }
    
    // 5. ATOMIC TRANSACTION (Database Integrity)
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
    console.error('CRITICAL ERROR placing bet:', error);
    console.error('Stack:', error.stack);
    
    if (error.message.includes('Insufficient balance')) {
      return res.status(400).json({ success: false, message: 'Insufficient Balance' });
    }
    return res.status(500).json({ 
      success: false, 
      message: 'Server Error: Failed to place bet',
      debug: process.env.NODE_ENV === 'development' ? error.message : undefined
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
