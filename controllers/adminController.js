/**
 * Admin Controller
 * Handles admin-only view logic
 */

const User = require('../models/User');
const Game = require('../models/Game');
const Transaction = require('../models/Transaction');
const pool = require('../config/database');

/**
 * Admin Dashboard - Home
 */
async function getDashboard(req, res) {
  try {
    // Fetch some stats for the dashboard
    const userCountResult = await pool.query('SELECT COUNT(*) FROM users WHERE role = $1', ['user']);
    const activeGamesCountResult = await pool.query('SELECT COUNT(*) FROM games WHERE is_active = true');
    const pendingWithdrawalsCountResult = await pool.query("SELECT COUNT(*) FROM withdrawal_requests WHERE status = 'pending'");
    
    // Get total balance across all users
    const totalBalanceResult = await pool.query('SELECT SUM(balance + winning_balance) as total FROM users');
    
    const stats = {
      userCount: userCountResult.rows[0].count,
      activeGamesCount: activeGamesCountResult.rows[0].count,
      pendingWithdrawalsCount: pendingWithdrawalsCountResult.rows[0].count,
      totalBalance: totalBalanceResult.rows[0].total || 0
    };

    res.render('admin/dashboard', { 
      title: 'Admin Dashboard', 
      user: req.user,
      stats: stats
    });
  } catch (error) {
    console.error('Error getting admin dashboard:', error);
    res.status(500).send('Internal Server Error');
  }
}

/**
 * Game Management
 */
async function getGames(req, res) {
  try {
    const games = await pool.query('SELECT * FROM games ORDER BY open_time ASC');
    res.render('admin/games', { 
      title: 'Manage Games', 
      user: req.user,
      games: games.rows
    });
  } catch (error) {
    console.error('Error getting admin games:', error);
    res.status(500).send('Internal Server Error');
  }
}

/**
 * Result Declaration
 */
async function getResultEntry(req, res) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const games = await Game.getAllWithTodaySessions();
    
    res.render('admin/result-entry', { 
      title: 'Declare Result', 
      user: req.user,
      games: games,
      today: today
    });
  } catch (error) {
    console.error('Error getting admin result entry:', error);
    res.status(500).send('Internal Server Error');
  }
}

/**
 * User Management
 */
async function getUsers(req, res) {
  try {
    const { search } = req.query;
    let query = 'SELECT * FROM users WHERE role = $1';
    const params = ['user'];
    
    if (search) {
      query += " AND (phone LIKE $2 OR name LIKE $2)";
      params.push(`%${search}%`);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const users = await pool.query(query, params);
    
    res.render('admin/users', { 
      title: 'Manage Users', 
      user: req.user,
      users: users.rows,
      search: search || ''
    });
  } catch (error) {
    console.error('Error getting admin users:', error);
    res.status(500).send('Internal Server Error');
  }
}

/**
 * Withdrawal Requests
 */
async function getWithdrawals(req, res) {
  try {
    const result = await pool.query(`
      SELECT 
        wr.*,
        u.phone as user_phone,
        u.name as user_name
      FROM withdrawal_requests wr
      JOIN users u ON wr.user_id = u.id
      ORDER BY wr.created_at DESC
    `);
    
    res.render('admin/withdrawals', { 
      title: 'Withdrawal Requests', 
      user: req.user,
      withdrawals: result.rows
    });
  } catch (error) {
    console.error('Error getting admin withdrawals:', error);
    res.status(500).send('Internal Server Error');
  }
}

/**
 * Update User Status (Block/Unblock)
 */
async function updateUserStatus(req, res) {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    
    const user = await User.updateStatus(parseInt(id), isActive);
    
    res.json({
      success: true,
      message: `User ${isActive ? 'unblocked' : 'blocked'} successfully`,
      data: user
    });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
}

module.exports = {
  getDashboard,
  getGames,
  getResultEntry,
  getUsers,
  getWithdrawals,
  updateUserStatus
};
