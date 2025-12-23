/**
 * Wallet Controller
 * Handles wallet operations, deposits, and withdrawals
 */

const User = require('../models/User');
const Transaction = require('../models/Transaction');
const pool = require('../config/database');

/**
 * Get wallet balance
 * GET /api/wallet
 */
async function getWallet(req, res) {
  try {
    const userId = req.user.id;
    const walletInfo = await User.getWalletInfo(userId);
    
    return res.json({
      success: true,
      data: walletInfo
    });
    
  } catch (error) {
    console.error('Error getting wallet:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get wallet information'
    });
  }
}

/**
 * Get transaction history
 * GET /api/wallet/transactions
 */
async function getTransactions(req, res) {
  try {
    const userId = req.user.id;
    const { limit = 50, offset = 0 } = req.query;
    
    const transactions = await Transaction.getUserTransactions(
      userId,
      parseInt(limit),
      parseInt(offset)
    );
    
    return res.json({
      success: true,
      data: transactions
    });
    
  } catch (error) {
    console.error('Error getting transactions:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get transactions'
    });
  }
}

/**
 * Get transaction summary
 * GET /api/wallet/summary
 */
async function getTransactionSummary(req, res) {
  try {
    const userId = req.user.id;
    const summary = await Transaction.getUserSummary(userId);
    
    return res.json({
      success: true,
      data: summary
    });
    
  } catch (error) {
    console.error('Error getting summary:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get transaction summary'
    });
  }
}

/**
 * Request withdrawal
 * POST /api/wallet/withdraw
 */
async function requestWithdrawal(req, res) {
  const client = await pool.connect();
  
  try {
    const userId = req.user.id;
    const { amount, bankDetails } = req.body;
    
    // Validation
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount'
      });
    }
    
    const minWithdrawal = parseFloat(process.env.MIN_WITHDRAWAL_AMOUNT) || 100;
    if (amount < minWithdrawal) {
      return res.status(400).json({
        success: false,
        message: `Minimum withdrawal amount is ₹${minWithdrawal}`
      });
    }
    
    if (!bankDetails) {
      return res.status(400).json({
        success: false,
        message: 'Bank details are required'
      });
    }
    
    await client.query('BEGIN');
    
    // Lock user row and check balance
    const userResult = await client.query(
      'SELECT winning_balance FROM users WHERE id = $1 FOR UPDATE',
      [userId]
    );
    
    const currentBalance = parseFloat(userResult.rows[0].winning_balance);
    
    if (currentBalance < amount) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Insufficient winning balance'
      });
    }
    
    // Deduct from winning_balance and add to held_withdrawal_balance
    const newWinningBalance = currentBalance - amount;
    
    await client.query(
      `UPDATE users 
       SET winning_balance = $1, 
           held_withdrawal_balance = held_withdrawal_balance + $2 
       WHERE id = $3`,
      [newWinningBalance, amount, userId]
    );
    
    // Create withdrawal request
    const withdrawalResult = await client.query(
      `INSERT INTO withdrawal_requests (user_id, amount, status, bank_details) 
       VALUES ($1, $2, 'pending', $3) 
       RETURNING *`,
      [userId, amount, JSON.stringify(bankDetails)]
    );
    
    // Record transaction
    await client.query(
      `INSERT INTO transactions 
       (user_id, transaction_type, amount, balance_before, balance_after, description, reference_id, reference_type) 
       VALUES ($1, 'withdrawal', $2, $3, $4, $5, $6, 'withdrawal_request')`,
      [
        userId,
        amount,
        currentBalance,
        newWinningBalance,
        'Withdrawal request created',
        withdrawalResult.rows[0].id
      ]
    );
    
    await client.query('COMMIT');
    
    return res.status(201).json({
      success: true,
      message: 'Withdrawal request submitted. Awaiting admin approval.',
      data: withdrawalResult.rows[0]
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error requesting withdrawal:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to request withdrawal'
    });
  } finally {
    client.release();
  }
}

/**
 * Get withdrawal requests (user's own)
 * GET /api/wallet/withdrawals
 */
async function getWithdrawalRequests(req, res) {
  try {
    const userId = req.user.id;
    
    const result = await pool.query(
      `SELECT * FROM withdrawal_requests 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [userId]
    );
    
    return res.json({
      success: true,
      data: result.rows
    });
    
  } catch (error) {
    console.error('Error getting withdrawal requests:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get withdrawal requests'
    });
  }
}

/**
 * Add funds (admin only)
 * POST /api/wallet/deposit
 */
async function addFunds(req, res) {
  const client = await pool.connect();
  
  try {
    const { userId, amount, description } = req.body;
    
    // Validation
    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'User ID and valid amount are required'
      });
    }
    
    await client.query('BEGIN');
    
    // Lock user row
    const userResult = await client.query(
      'SELECT balance FROM users WHERE id = $1 FOR UPDATE',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const currentBalance = parseFloat(userResult.rows[0].balance);
    const newBalance = currentBalance + parseFloat(amount);
    
    // Update balance
    await client.query(
      'UPDATE users SET balance = $1 WHERE id = $2',
      [newBalance, userId]
    );
    
    // Record transaction
    await client.query(
      `INSERT INTO transactions 
       (user_id, transaction_type, amount, balance_before, balance_after, description) 
       VALUES ($1, 'deposit', $2, $3, $4, $5)`,
      [userId, amount, currentBalance, newBalance, description || 'Funds added by admin']
    );
    
    await client.query('COMMIT');
    
    return res.json({
      success: true,
      message: 'Funds added successfully',
      data: {
        previousBalance: currentBalance,
        newBalance,
        amount: parseFloat(amount)
      }
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adding funds:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to add funds'
    });
  } finally {
    client.release();
  }
}

/**
 * Get all withdrawal requests (admin only)
 * GET /api/wallet/admin/withdrawals
 */
async function getAllWithdrawalRequests(req, res) {
  try {
    const { status } = req.query;
    
    let query = `
      SELECT 
        wr.*,
        u.phone as user_phone,
        u.name as user_name
      FROM withdrawal_requests wr
      JOIN users u ON wr.user_id = u.id
    `;
    
    const params = [];
    
    if (status) {
      query += ' WHERE wr.status = $1';
      params.push(status);
    }
    
    query += ' ORDER BY wr.created_at DESC';
    
    const result = await pool.query(query, params);
    
    return res.json({
      success: true,
      data: result.rows
    });
    
  } catch (error) {
    console.error('Error getting all withdrawal requests:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get withdrawal requests'
    });
  }
}

/**
 * Approve/Reject withdrawal (admin only)
 * PUT /api/wallet/admin/withdrawals/:id
 */
async function processWithdrawal(req, res) {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;
    const { status } = req.body; // 'approved' or 'rejected'
    const adminId = req.user.id;
    
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be either approved or rejected'
      });
    }
    
    await client.query('BEGIN');
    
    // Get withdrawal request
    const wrResult = await client.query(
      'SELECT * FROM withdrawal_requests WHERE id = $1 FOR UPDATE',
      [id]
    );
    
    if (wrResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        message: 'Withdrawal request not found'
      });
    }
    
    const withdrawal = wrResult.rows[0];
    
    if (withdrawal.status !== 'pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Withdrawal request already processed'
      });
    }
    
    // Update withdrawal request
    await client.query(
      `UPDATE withdrawal_requests 
       SET status = $1, processed_by = $2, processed_at = CURRENT_TIMESTAMP 
       WHERE id = $3`,
      [status, adminId, id]
    );
    
    // Update user balance
    const userResult = await client.query(
      'SELECT held_withdrawal_balance, winning_balance FROM users WHERE id = $1 FOR UPDATE',
      [withdrawal.user_id]
    );
    
    const user = userResult.rows[0];
    
    if (status === 'rejected') {
      // Return amount to winning_balance
      const newWinningBalance = parseFloat(user.winning_balance) + parseFloat(withdrawal.amount);
      const newHeldBalance = parseFloat(user.held_withdrawal_balance) - parseFloat(withdrawal.amount);
      
      await client.query(
        `UPDATE users 
         SET winning_balance = $1, held_withdrawal_balance = $2 
         WHERE id = $3`,
        [newWinningBalance, newHeldBalance, withdrawal.user_id]
      );
      
      // Record refund transaction
      await client.query(
        `INSERT INTO transactions 
         (user_id, transaction_type, amount, balance_before, balance_after, description, reference_id, reference_type) 
         VALUES ($1, 'refund', $2, $3, $4, $5, $6, 'withdrawal_request')`,
        [
          withdrawal.user_id,
          withdrawal.amount,
          user.winning_balance,
          newWinningBalance,
          'Withdrawal request rejected - amount refunded',
          withdrawal.id
        ]
      );
    } else {
      // Approved - just remove from held balance
      const newHeldBalance = parseFloat(user.held_withdrawal_balance) - parseFloat(withdrawal.amount);
      
      await client.query(
        'UPDATE users SET held_withdrawal_balance = $1 WHERE id = $2',
        [newHeldBalance, withdrawal.user_id]
      );
    }
    
    await client.query('COMMIT');
    
    return res.json({
      success: true,
      message: `Withdrawal ${status} successfully`
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error processing withdrawal:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process withdrawal'
    });
  } finally {
    client.release();
  }
}

module.exports = {
  getWallet,
  getTransactions,
  getTransactionSummary,
  requestWithdrawal,
  getWithdrawalRequests,
  addFunds,
  getAllWithdrawalRequests,
  processWithdrawal
};
