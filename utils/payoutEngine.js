/**
 * Payout Engine
 * Handles winning calculation and payout processing
 */

const pool = require('../config/database');

/**
 * Check if a bet is a winner
 * @param {Object} bet - Bet object with bet_type and bet_number
 * @param {string} winningNumber - 2-digit winning number (00-99)
 * @returns {boolean} True if bet wins
 */
function checkWin(bet, winningNumber) {
  if (bet.bet_type === 'jodi') {
    // Exact match for Jodi
    return bet.bet_number === winningNumber;
  } else if (bet.bet_type === 'haruf_andar') {
    // Andar = Tens digit (first digit)
    return bet.bet_number === winningNumber[0];
  } else if (bet.bet_type === 'haruf_bahar') {
    // Bahar = Units digit (second digit)
    return bet.bet_number === winningNumber[1];
  }
  return false;
}

/**
 * Declare result and process all bets (IDEMPOTENT)
 * @param {number} gameSessionId - Game session ID
 * @param {string} winningNumber - 2-digit winning number
 * @returns {Object} Result summary
 */
async function declareResult(gameSessionId, winningNumber) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. Lock the game session row (prevents concurrent result declarations)
    const sessionResult = await client.query(
      'SELECT * FROM game_sessions WHERE id = $1 FOR UPDATE',
      [gameSessionId]
    );
    
    if (sessionResult.rows.length === 0) {
      throw new Error('Game session not found');
    }
    
    const session = sessionResult.rows[0];
    
    // 2. Check if result already declared (IDEMPOTENCY)
    if (session.status === 'completed') {
      throw new Error('Result already declared for this session');
    }
    
    // 3. Update game session with winning number
    await client.query(
      `UPDATE game_sessions 
       SET winning_number = $1, status = 'completed', result_declared_at = CURRENT_TIMESTAMP 
       WHERE id = $2`,
      [winningNumber, gameSessionId]
    );
    
    // 4. Fetch all PENDING bets for this session (with row lock)
    const betsResult = await client.query(
      `SELECT * FROM bets 
       WHERE game_session_id = $1 AND status = 'pending' 
       FOR UPDATE`,
      [gameSessionId]
    );
    
    const bets = betsResult.rows;
    let winCount = 0;
    let lossCount = 0;
    let totalPayout = 0;
    
    // 5. Process each bet
    for (const bet of bets) {
      const isWin = checkWin(bet, winningNumber);
      const payoutAmount = isWin ? parseFloat(bet.bet_amount) * parseFloat(bet.payout_multiplier) : 0;
      const newStatus = isWin ? 'win' : 'loss';
      
      // 6. Update bet status
      await client.query(
        `UPDATE bets 
         SET status = $1, payout_amount = $2 
         WHERE id = $3`,
        [newStatus, payoutAmount, bet.id]
      );
      
      // 7. If win, credit user wallet
      if (isWin) {
        winCount++;
        totalPayout += payoutAmount;
        
        // Get current balance with lock
        const userResult = await client.query(
          'SELECT balance, winning_balance FROM users WHERE id = $1 FOR UPDATE',
          [bet.user_id]
        );
        
        const user = userResult.rows[0];
        const newWinningBalance = parseFloat(user.winning_balance) + payoutAmount;
        
        // Update user balance
        await client.query(
          'UPDATE users SET winning_balance = $1 WHERE id = $2',
          [newWinningBalance, bet.user_id]
        );
        
        // Record transaction
        await client.query(
          `INSERT INTO transactions 
           (user_id, transaction_type, amount, balance_before, balance_after, description, reference_id, reference_type) 
           VALUES ($1, 'win', $2, $3, $4, $5, $6, 'bet')`,
          [
            bet.user_id,
            payoutAmount,
            user.winning_balance,
            newWinningBalance,
            `Win payout for bet #${bet.id}`,
            bet.id
          ]
        );
      } else {
        lossCount++;
      }
    }
    
    await client.query('COMMIT');
    
    return {
      success: true,
      gameSessionId,
      winningNumber,
      totalBets: bets.length,
      winCount,
      lossCount,
      totalPayout
    };
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  checkWin,
  declareResult
};
