const pool = require("../config/database");
const Bet = require("../models/Bet");

/**
 * Process game session result and payouts
 * @param {number} sessionId - Game session ID
 * @param {string} winningNumber - Winning number (2 digits)
 */
async function processResult(sessionId, winningNumber) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Update session status
    const updateSessionResult = await client.query(
      `UPDATE game_sessions 
       SET winning_number = $1, status = 'completed', result_declared_at = NOW() 
       WHERE id = $2 AND status = 'pending'
       RETURNING *`,
      [winningNumber, sessionId],
    );

    if (updateSessionResult.rowCount === 0) {
      throw new Error("Session not found or already completed");
    }

    const session = updateSessionResult.rows[0];
    const winNumStr = winningNumber.toString();
    const andarDigit = winNumStr[0];
    const baharDigit = winNumStr[1];

    // 2. Fetch all pending bets for this session
    const betsResult = await client.query(
      `SELECT * FROM bets 
       WHERE game_session_id = $1 AND status = 'pending'`,
      [sessionId],
    );
    const bets = betsResult.rows;

    const winningBets = [];
    const losingBetIds = [];

    // 3. Logic: Classify bets
    for (const bet of bets) {
      let isWin = false;

      // Handle different bet types
      if (bet.bet_type === "jodi") {
        isWin = bet.bet_number === winNumStr;
      } else if (bet.bet_type === "haruf_andar") {
        isWin = bet.bet_number === andarDigit;
      } else if (bet.bet_type === "haruf_bahar") {
        isWin = bet.bet_number === baharDigit;
      }

      if (isWin) {
        winningBets.push(bet);
      } else {
        losingBetIds.push(bet.id);
      }
    }

    // 4. Batch Process Losers
    if (losingBetIds.length > 0) {
      await client.query(
        `UPDATE bets SET status = 'loss' WHERE id = ANY($1::int[])`,
        [losingBetIds],
      );
    }

    // 5. Process Winners
    // Group by user to minimize User table locking/updates
    const userWinnings = new Map(); // userId -> { totalPayout, bets }

    for (const bet of winningBets) {
      const amount = parseFloat(bet.bet_amount);
      const multiplier = parseFloat(bet.payout_multiplier);
      const payout = amount * multiplier;

      // Update the individual bet first
      await client.query(
        `UPDATE bets SET status = 'win', payout_amount = $1 WHERE id = $2`,
        [payout, bet.id],
      );

      // Aggregate for user update
      if (!userWinnings.has(bet.user_id)) {
        userWinnings.set(bet.user_id, { totalPayout: 0, count: 0 });
      }
      const userData = userWinnings.get(bet.user_id);
      userData.totalPayout += payout;
      userData.count += 1;
    }

    // Update Users and Insert Transactions
    for (const [userId, data] of userWinnings) {
      const { totalPayout, count } = data;

      // Update User Balance
      const userUpdate = await client.query(
        `UPDATE users SET winning_balance = winning_balance + $1 WHERE id = $2 RETURNING winning_balance`,
        [totalPayout, userId],
      );

      const newWinningBalance = parseFloat(userUpdate.rows[0].winning_balance);
      const prevBalance = newWinningBalance - totalPayout;

      // Create Transaction
      await client.query(
        `INSERT INTO transactions 
         (user_id, transaction_type, amount, balance_before, balance_after, description, reference_id, reference_type) 
         VALUES ($1, 'win', $2, $3, $4, $5, $6, 'game_session')`,
        [
          userId,
          totalPayout,
          prevBalance,
          newWinningBalance,
          `Win payout for ${count} bet(s) in session ${sessionId} (${winningNumber})`,
          sessionId,
        ],
      );
    }

    await client.query("COMMIT");
    return { success: true, session };
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error processing result:", error);
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
    const today = now.toISOString().split("T")[0];

    // Find sessions that are scheduled, pending, and past their close time
    const result = await pool.query(
      `SELECT gs.*, g.close_time 
       FROM game_sessions gs
       JOIN games g ON gs.game_id = g.id
       WHERE gs.status = 'pending' 
       AND gs.is_scheduled = true 
       AND gs.scheduled_winning_number IS NOT NULL
       AND gs.session_date <= $1`,
      [today],
    );

    for (const session of result.rows) {
      // Robust Date Comparison
      // Create a Date object for the session date
      const sessionDate = new Date(session.session_date);

      // Parse close_time (HH:MM:SS)
      const [hours, minutes, seconds] = session.close_time
        .split(":")
        .map(Number);

      // Create a specific expiry Date object
      // usage of local time components
      const closeDateTime = new Date(
        sessionDate.getFullYear(),
        sessionDate.getMonth(),
        sessionDate.getDate(),
        hours,
        minutes,
        seconds || 0,
      );

      // Determine strictly if we should declare
      let shouldDeclare = false;

      // 1. If the session date is strictly in the past (yesterday or older), declare it.
      if (session.session_date.toISOString().split("T")[0] < today) {
        shouldDeclare = true;
      }
      // 2. If it is today, check if NOW >= CloseDateTime
      else {
        if (now >= closeDateTime) {
          shouldDeclare = true;
        }
      }

      if (shouldDeclare) {
        console.log(
          `🕒 Auto-declaring result for session ${session.id} (Game: ${session.game_id})`,
        );
        await processResult(session.id, session.scheduled_winning_number);
      }
    }
  } catch (error) {
    console.error("Error in checkScheduledResults:", error);
  }
}

/**
 * Update declared result (Revert old, Process new)
 * @param {number} sessionId
 * @param {string} newWinningNumber
 */
async function updateResult(sessionId, newWinningNumber) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Get Session & Lock
    const sessionResult = await client.query(
      "SELECT * FROM game_sessions WHERE id = $1 FOR UPDATE",
      [sessionId],
    );

    if (sessionResult.rows.length === 0) {
      throw new Error("Session not found");
    }

    const session = sessionResult.rows[0];

    if (session.status !== "completed") {
      throw new Error("Result not declared yet. Use declare instead.");
    }

    const oldWinningNumber = session.winning_number;
    if (oldWinningNumber === newWinningNumber) {
      throw new Error("New winning number is same as old one");
    }

    // 2. REVERT PHASE: Undo previous payouts
    // Find all bets that were marked as wins
    const oldWinningBetsResult = await client.query(
      "SELECT * FROM bets WHERE game_session_id = $1 AND status = 'win'",
      [sessionId],
    );
    const oldWinningBets = oldWinningBetsResult.rows;

    // Group by user for bulk revert
    const userReverts = new Map();
    for (const bet of oldWinningBets) {
      const payout = parseFloat(bet.payout_amount);
      if (!userReverts.has(bet.user_id)) {
        userReverts.set(bet.user_id, { amount: 0, count: 0 });
      }
      const data = userReverts.get(bet.user_id);
      data.amount += payout;
      data.count += 1;
    }

    // Process Reverts
    for (const [userId, data] of userReverts) {
      // Deduct from winning balance
      await client.query(
        "UPDATE users SET winning_balance = winning_balance - $1 WHERE id = $2",
        [data.amount, userId],
      );

      // Log Revert Transaction
      // We need to fetch current balance to log correctly
      const userRes = await client.query(
        "SELECT winning_balance FROM users WHERE id = $1",
        [userId],
      );
      const currentBalance = parseFloat(userRes.rows[0].winning_balance);
      const balanceBefore = currentBalance + data.amount; // Should match what it was before deduction

      await client.query(
        `INSERT INTO transactions 
         (user_id, transaction_type, amount, balance_before, balance_after, description, reference_id, reference_type) 
         VALUES ($1, 'revert', $2, $3, $4, $5, $6, 'game_session_correction')`,
        [
          userId,
          data.amount,
          balanceBefore,
          currentBalance,
          `Result correction for session ${sessionId} (Was: ${oldWinningNumber}, Now: ${newWinningNumber})`,
          sessionId,
        ],
      );
    }

    // 3. RESET BETS
    await client.query(
      "UPDATE bets SET status = 'pending', payout_amount = 0 WHERE game_session_id = $1",
      [sessionId],
    );

    // 4. RE-CALCULATE PHASE (Logic from processResult)
    // Update session winning number
    await client.query(
      "UPDATE game_sessions SET winning_number = $1, result_declared_at = NOW() WHERE id = $2",
      [newWinningNumber, sessionId],
    );

    // Fetch pending bets (which we just reset)
    const betsResult = await client.query(
      "SELECT * FROM bets WHERE game_session_id = $1",
      [sessionId],
    );
    const bets = betsResult.rows;

    const winNumStr = newWinningNumber.toString();
    const andarDigit = winNumStr[0];
    const baharDigit = winNumStr[1];

    const winningBets = [];
    const losingBetIds = [];

    for (const bet of bets) {
      let isWin = false;
      if (bet.bet_type === "jodi") {
        isWin = bet.bet_number === winNumStr;
      } else if (bet.bet_type === "haruf_andar") {
        isWin = bet.bet_number === andarDigit;
      } else if (bet.bet_type === "haruf_bahar") {
        isWin = bet.bet_number === baharDigit;
      }

      if (isWin) {
        winningBets.push(bet);
      } else {
        losingBetIds.push(bet.id);
      }
    }

    // Batch Process Losers
    if (losingBetIds.length > 0) {
      await client.query(
        "UPDATE bets SET status = 'loss' WHERE id = ANY($1::int[])",
        [losingBetIds],
      );
    }

    // Process Winners
    const userWinnings = new Map();

    for (const bet of winningBets) {
      const amount = parseFloat(bet.bet_amount);
      const multiplier = parseFloat(bet.payout_multiplier);
      const payout = amount * multiplier;

      await client.query(
        "UPDATE bets SET status = 'win', payout_amount = $1 WHERE id = $2",
        [payout, bet.id],
      );

      if (!userWinnings.has(bet.user_id)) {
        userWinnings.set(bet.user_id, { totalPayout: 0, count: 0 });
      }
      const userData = userWinnings.get(bet.user_id);
      userData.totalPayout += payout;
      userData.count += 1;
    }

    // Update Users and Insert Transactions (Credits)
    for (const [userId, data] of userWinnings) {
      const { totalPayout } = data;

      const userUpdate = await client.query(
        "UPDATE users SET winning_balance = winning_balance + $1 WHERE id = $2 RETURNING winning_balance",
        [totalPayout, userId],
      );

      const newWinningBalance = parseFloat(userUpdate.rows[0].winning_balance);
      const prevBalance = newWinningBalance - totalPayout;

      await client.query(
        `INSERT INTO transactions 
         (user_id, transaction_type, amount, balance_before, balance_after, description, reference_id, reference_type) 
         VALUES ($1, 'win', $2, $3, $4, $5, $6, 'game_session')`,
        [
          userId,
          totalPayout,
          prevBalance,
          newWinningBalance,
          `Win payout (Corrected) for session ${sessionId} (${newWinningNumber})`,
          sessionId,
        ],
      );
    }

    await client.query("COMMIT");
    return { success: true, oldWinningNumber, newWinningNumber };
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error updating result:", error);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  processResult,
  checkScheduledResults,
  updateResult,
};
