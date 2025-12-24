const pool = require('../config/database');
const Bet = require('../models/Bet');

/**
 * Process game session result and payouts
 * @param {number} sessionId - Game session ID
 * @param {string} winningNumber - Winning number (2 digits)
 */
async function processResult(sessionId, winningNumber) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // 1. Update session status
    const updateSessionResult = await client.query(
      `UPDATE game_sessions 
       SET winning_number = $1, status = 'completed', result_declared_at = NOW() 
       WHERE id = $2 AND status = 'pending'
       RETURNING *`,
      [winningNumber, sessionId]
    );

    if (updateSessionResult.rowCount === 0) {
      throw new Error('Session not found or already completed');
    }

    const session = updateSessionResult.rows[0];

    // 2. Fetch all pending bets for this session
    const bets = await Bet.getPendingBetsBySession(sessionId);
    
    // 3. Process each bet
    for (const bet of bets) {
      const isWin = bet.bet_number === winningNumber;
      
      if (isWin) {
        const payout = bet.bet_amount * bet.payout_multiplier;
        
        // Update bet status
        await client.query(
          `UPDATE bets SET status = 'win', payout_amount = $1 WHERE id = $2`,
          [payout, bet.id]
        );
        
        // Update user balance (Winning balance)
        await client.query(
          `UPDATE users SET winning_balance = winning_balance + $1 WHERE id = $2`,
          [payout, bet.user_id]
        );
        
        // Record transaction
        const userResult = await client.query('SELECT winning_balance FROM users WHERE id = $1', [bet.user_id]);
        const newWinningBalance = userResult.rows[0].winning_balance;
        
        await client.query(
          `INSERT INTO transactions 
           (user_id, transaction_type, amount, balance_before, balance_after, description, reference_id, reference_type) 
           VALUES ($1, 'win', $2, $3, $4, $5, $6, 'bet')`,
          [bet.user_id, payout, newWinningBalance - payout, newWinningBalance, `Win payout for session ${sessionId} (${winningNumber})`, bet.id]
        );
      } else {
        // Update bet status to loss
        await client.query(
          `UPDATE bets SET status = 'loss' WHERE id = $1`,
          [bet.id]
        );
      }
    }

    // 4. Reset/Prepare for next session (Handled by getOrCreateTodaySession later, 
    // but we can proactively trigger it if needed or just let it be on-demand)
    
    await client.query('COMMIT');
    return { success: true, session };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error processing result:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Check and execute scheduled results
 */
async function checkScheduledResults() {
  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().split(' ')[0]; // HH:MM:SS

    // Find sessions that are scheduled, pending, and past their close time
    // We join with games to get the close_time
    const result = await pool.query(
      `SELECT gs.*, g.close_time 
       FROM game_sessions gs
       JOIN games g ON gs.game_id = g.id
       WHERE gs.status = 'pending' 
       AND gs.is_scheduled = true 
       AND gs.scheduled_winning_number IS NOT NULL
       AND gs.session_date <= $1`,
      [today]
    );

    for (const session of result.rows) {
      // If it's a past date, always process. 
      // If it's today, check if current time is >= close_time
      const isPastDate = session.session_date.toISOString().split('T')[0] < today;
      const isPastCloseTime = currentTime >= session.close_time;

      if (isPastDate || isPastCloseTime) {
        console.log(`🕒 Auto-declaring result for session ${session.id} (Game: ${session.game_id})`);
        await processResult(session.id, session.scheduled_winning_number);
      }
    }
  } catch (error) {
    console.error('Error in checkScheduledResults:', error);
  }
}

module.exports = {
  processResult,
  checkScheduledResults
};
