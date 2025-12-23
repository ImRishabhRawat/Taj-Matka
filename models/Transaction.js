/**
 * Transaction Model
 * Handles transaction history and wallet operations
 */

const pool = require('../config/database');

/**
 * Create a transaction record
 * @param {Object} transactionData - Transaction data
 * @returns {Promise<Object>} Created transaction
 */
async function create(transactionData) {
  const { userId, transactionType, amount, balanceBefore, balanceAfter, description, referenceId, referenceType } = transactionData;
  
  try {
    const result = await pool.query(
      `INSERT INTO transactions 
       (user_id, transaction_type, amount, balance_before, balance_after, description, reference_id, reference_type) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
       RETURNING *`,
      [userId, transactionType, amount, balanceBefore, balanceAfter, description, referenceId, referenceType]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error creating transaction:', error);
    throw error;
  }
}

/**
 * Get user's transaction history
 * @param {number} userId - User ID
 * @param {number} limit - Number of transactions to fetch
 * @param {number} offset - Offset for pagination
 * @returns {Promise<Array>} Array of transactions
 */
async function getUserTransactions(userId, limit = 50, offset = 0) {
  try {
    const result = await pool.query(
      `SELECT * FROM transactions 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return result.rows;
  } catch (error) {
    console.error('Error getting user transactions:', error);
    throw error;
  }
}

/**
 * Get transactions by type
 * @param {number} userId - User ID
 * @param {string} transactionType - Transaction type
 * @param {number} limit - Number of transactions to fetch
 * @returns {Promise<Array>} Array of transactions
 */
async function getByType(userId, transactionType, limit = 50) {
  try {
    const result = await pool.query(
      `SELECT * FROM transactions 
       WHERE user_id = $1 AND transaction_type = $2 
       ORDER BY created_at DESC 
       LIMIT $3`,
      [userId, transactionType, limit]
    );
    return result.rows;
  } catch (error) {
    console.error('Error getting transactions by type:', error);
    throw error;
  }
}

/**
 * Get all transactions (admin only)
 * @param {number} limit - Number of transactions to fetch
 * @param {number} offset - Offset for pagination
 * @returns {Promise<Array>} Array of transactions
 */
async function getAll(limit = 100, offset = 0) {
  try {
    const result = await pool.query(
      `SELECT 
        t.*,
        u.phone as user_phone,
        u.name as user_name
       FROM transactions t
       JOIN users u ON t.user_id = u.id
       ORDER BY t.created_at DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  } catch (error) {
    console.error('Error getting all transactions:', error);
    throw error;
  }
}

/**
 * Get transaction summary for a user
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Transaction summary
 */
async function getUserSummary(userId) {
  try {
    const result = await pool.query(
      `SELECT 
        COUNT(*) as total_transactions,
        COALESCE(SUM(CASE WHEN transaction_type = 'deposit' THEN amount ELSE 0 END), 0) as total_deposits,
        COALESCE(SUM(CASE WHEN transaction_type = 'withdrawal' THEN amount ELSE 0 END), 0) as total_withdrawals,
        COALESCE(SUM(CASE WHEN transaction_type = 'bet' THEN amount ELSE 0 END), 0) as total_bets,
        COALESCE(SUM(CASE WHEN transaction_type = 'win' THEN amount ELSE 0 END), 0) as total_winnings
       FROM transactions
       WHERE user_id = $1`,
      [userId]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error getting user summary:', error);
    throw error;
  }
}

module.exports = {
  create,
  getUserTransactions,
  getByType,
  getAll,
  getUserSummary
};
