/**
 * User Model
 * Handles all user-related database operations
 */

const pool = require('../config/database');
const bcrypt = require('bcryptjs');

/**
 * Find user by phone number
 * @param {string} phone - Phone number
 * @returns {Promise<Object|null>} User object or null
 */
async function findByPhone(phone) {
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE phone = $1',
      [phone]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error finding user by phone:', error);
    throw error;
  }
}

/**
 * Find user by ID
 * @param {number} id - User ID
 * @returns {Promise<Object|null>} User object or null
 */
async function findById(id) {
  try {
    const result = await pool.query(
      'SELECT id, phone, name, role, balance, winning_balance, held_withdrawal_balance, is_active, created_at FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error finding user by ID:', error);
    throw error;
  }
}

/**
 * Create new user
 * @param {Object} userData - User data
 * @returns {Promise<Object>} Created user
 */
async function create(userData) {
  const { phone, name, password } = userData;
  
  try {
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    const result = await pool.query(
      `INSERT INTO users (phone, name, password_hash, role, balance, is_active) 
       VALUES ($1, $2, $3, 'user', 0, true) 
       RETURNING id, phone, name, role, balance, winning_balance, created_at`,
      [phone, name, passwordHash]
    );
    
    return result.rows[0];
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

/**
 * Verify password
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} True if password matches
 */
async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Update user balance (with transaction)
 * @param {number} userId - User ID
 * @param {number} amount - Amount to add/subtract
 * @param {string} type - 'balance' or 'winning_balance'
 * @returns {Promise<Object>} Updated balance info
 */
async function updateBalance(userId, amount, type = 'balance') {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Lock user row
    const userResult = await client.query(
      'SELECT balance, winning_balance FROM users WHERE id = $1 FOR UPDATE',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }
    
    const user = userResult.rows[0];
    const currentBalance = parseFloat(user[type]);
    const newBalance = currentBalance + parseFloat(amount);
    
    if (newBalance < 0) {
      throw new Error('Insufficient balance');
    }
    
    // Update balance
    await client.query(
      `UPDATE users SET ${type} = $1 WHERE id = $2`,
      [newBalance, userId]
    );
    
    await client.query('COMMIT');
    
    return {
      previousBalance: currentBalance,
      newBalance: newBalance,
      amount: parseFloat(amount)
    };
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get user wallet info
 * @param {number} userId - User ID
 * @returns {Promise<Object>} Wallet information
 */
async function getWalletInfo(userId) {
  try {
    const result = await pool.query(
      `SELECT balance, winning_balance, held_withdrawal_balance,
              (balance + winning_balance) as total_balance
       FROM users WHERE id = $1`,
      [userId]
    );
    
    if (result.rows.length === 0) {
      throw new Error('User not found');
    }
    
    return result.rows[0];
  } catch (error) {
    console.error('Error getting wallet info:', error);
    throw error;
  }
}

/**
 * Deduct bet amount from user balance
 * @param {number} userId - User ID
 * @param {number} amount - Amount to deduct
 * @returns {Promise<Object>} Transaction result
 */
async function deductBetAmount(userId, amount) {
  return updateBalance(userId, -amount, 'balance');
}

/**
 * Get all users (admin only)
 * @param {number} limit - Number of users to fetch
 * @param {number} offset - Offset for pagination
 * @returns {Promise<Array>} Array of users
 */
async function getAll(limit = 50, offset = 0) {
  try {
    const result = await pool.query(
      `SELECT id, phone, name, role, balance, winning_balance, is_active, created_at 
       FROM users 
       ORDER BY created_at DESC 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return result.rows;
  } catch (error) {
    console.error('Error getting all users:', error);
    throw error;
  }
}

/**
 * Update user status
 * @param {number} userId - User ID
 * @param {boolean} isActive - Active status
 * @returns {Promise<Object>} Updated user
 */
async function updateStatus(userId, isActive) {
  try {
    const result = await pool.query(
      'UPDATE users SET is_active = $1 WHERE id = $2 RETURNING *',
      [isActive, userId]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error updating user status:', error);
    throw error;
  }
}

module.exports = {
  findByPhone,
  findById,
  create,
  verifyPassword,
  updateBalance,
  getWalletInfo,
  deductBetAmount,
  getAll,
  updateStatus
};
