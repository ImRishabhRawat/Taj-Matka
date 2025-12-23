/**
 * Bet Model
 * Handles all bet-related database operations
 */

const pool = require('../config/database');

/**
 * Create a single bet
 * @param {Object} betData - Bet data
 * @returns {Promise<Object>} Created bet
 */
async function create(betData) {
  const { userId, gameSessionId, betType, betNumber, betAmount, payoutMultiplier } = betData;
  
  try {
    const result = await pool.query(
      `INSERT INTO bets (user_id, game_session_id, bet_type, bet_number, bet_amount, payout_multiplier, status) 
       VALUES ($1, $2, $3, $4, $5, $6, 'pending') 
       RETURNING *`,
      [userId, gameSessionId, betType, betNumber, betAmount, payoutMultiplier]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error creating bet:', error);
    throw error;
  }
}

/**
 * Create multiple bets in a transaction
 * @param {Array} betsArray - Array of bet objects
 * @param {number} userId - User ID
 * @param {number} totalAmount - Total amount to deduct
 * @returns {Promise<Array>} Created bets
 */
async function createMultiple(betsArray, userId, totalAmount) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. Deduct balance with built-in check (The "Gatekeeper")
    // This is atomic and prevents race conditions
    const updateResult = await client.query(
      `UPDATE users 
       SET balance = balance - $1 
       WHERE id = $2 AND balance >= $1 
       RETURNING balance`,
      [totalAmount, userId]
    );
    
    // 2. Verify row count (If 0, either user doesn't exist or insufficient balance)
    if (updateResult.rowCount === 0) {
      throw new Error('Insufficient balance or user not found');
    }
    
    const newBalance = parseFloat(updateResult.rows[0].balance);
    const balanceBefore = newBalance + totalAmount;
    
    // 3. Record transaction log (type: 'bet')
    await client.query(
      `INSERT INTO transactions 
       (user_id, transaction_type, amount, balance_before, balance_after, description) 
       VALUES ($1, 'bet', $2, $3, $4, $5)`,
      [userId, totalAmount, balanceBefore, newBalance, `Bet placed - ${betsArray.length} bet(s)`]
    );
    
    // 4. Insert all bets
    const createdBets = [];
    for (const bet of betsArray) {
      const result = await client.query(
        `INSERT INTO bets (user_id, game_session_id, bet_type, bet_number, bet_amount, payout_multiplier, status) 
         VALUES ($1, $2, $3, $4, $5, $6, 'pending') 
         RETURNING *`,
        [userId, bet.gameSessionId, bet.betType, bet.betNumber, bet.betAmount, bet.payoutMultiplier]
      );
      createdBets.push(result.rows[0]);
    }
    
    await client.query('COMMIT');
    
    return {
      bets: createdBets,
      totalAmount,
      newBalance
    };
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get user's bet history
 * @param {number} userId - User ID
 * @param {number} limit - Number of bets to fetch
 * @param {number} offset - Offset for pagination
 * @returns {Promise<Array>} Array of bets
 */
async function getUserBets(userId, limit = 50, offset = 0) {
  try {
    const result = await pool.query(
      `SELECT 
        b.*,
        g.name as game_name,
        gs.session_date,
        gs.winning_number,
        gs.status as session_status
       FROM bets b
       JOIN game_sessions gs ON b.game_session_id = gs.id
       JOIN games g ON gs.game_id = g.id
       WHERE b.user_id = $1
       ORDER BY b.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return result.rows;
  } catch (error) {
    console.error('Error getting user bets:', error);
    throw error;
  }
}

/**
 * Get bets by game session
 * @param {number} gameSessionId - Game session ID
 * @param {string} status - Bet status filter (optional)
 * @returns {Promise<Array>} Array of bets
 */
async function getBySession(gameSessionId, status = null) {
  try {
    let query = `
      SELECT 
        b.*,
        u.phone as user_phone,
        u.name as user_name
      FROM bets b
      JOIN users u ON b.user_id = u.id
      WHERE b.game_session_id = $1
    `;
    
    const params = [gameSessionId];
    
    if (status) {
      query += ' AND b.status = $2';
      params.push(status);
    }
    
    query += ' ORDER BY b.created_at DESC';
    
    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('Error getting bets by session:', error);
    throw error;
  }
}

/**
 * Get user's winning bets
 * @param {number} userId - User ID
 * @param {number} limit - Number of bets to fetch
 * @returns {Promise<Array>} Array of winning bets
 */
async function getUserWinningBets(userId, limit = 50) {
  try {
    const result = await pool.query(
      `SELECT 
        b.*,
        g.name as game_name,
        gs.session_date,
        gs.winning_number
       FROM bets b
       JOIN game_sessions gs ON b.game_session_id = gs.id
       JOIN games g ON gs.game_id = g.id
       WHERE b.user_id = $1 AND b.status = 'win'
       ORDER BY b.created_at DESC
       LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  } catch (error) {
    console.error('Error getting winning bets:', error);
    throw error;
  }
}

/**
 * Get bet statistics for a user
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Bet statistics
 */
async function getUserStats(userId) {
  try {
    const result = await pool.query(
      `SELECT 
        COUNT(*) as total_bets,
        COUNT(CASE WHEN status = 'win' THEN 1 END) as total_wins,
        COUNT(CASE WHEN status = 'loss' THEN 1 END) as total_losses,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_bets,
        COALESCE(SUM(bet_amount), 0) as total_bet_amount,
        COALESCE(SUM(CASE WHEN status = 'win' THEN payout_amount ELSE 0 END), 0) as total_winnings
       FROM bets
       WHERE user_id = $1`,
      [userId]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error getting user stats:', error);
    throw error;
  }
}

/**
 * Get pending bets for a session (for result processing)
 * @param {number} gameSessionId - Game session ID
 * @returns {Promise<Array>} Array of pending bets
 */
async function getPendingBetsBySession(gameSessionId) {
  try {
    const result = await pool.query(
      `SELECT * FROM bets 
       WHERE game_session_id = $1 AND status = 'pending'
       ORDER BY created_at ASC`,
      [gameSessionId]
    );
    return result.rows;
  } catch (error) {
    console.error('Error getting pending bets:', error);
    throw error;
  }
}

/**
 * Update bet status
 * @param {number} betId - Bet ID
 * @param {string} status - New status
 * @param {number} payoutAmount - Payout amount (for wins)
 * @returns {Promise<Object>} Updated bet
 */
async function updateStatus(betId, status, payoutAmount = 0) {
  try {
    const result = await pool.query(
      `UPDATE bets 
       SET status = $1, payout_amount = $2 
       WHERE id = $3 
       RETURNING *`,
      [status, payoutAmount, betId]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error updating bet status:', error);
    throw error;
  }
}

module.exports = {
  create,
  createMultiple,
  getUserBets,
  getBySession,
  getUserWinningBets,
  getUserStats,
  getPendingBetsBySession,
  updateStatus
};
