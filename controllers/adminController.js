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
    
    const period = req.query.period || 'today';
    let dateFilter;
    
    // Always use today for the "Today's Players" count regardless of filter
    const todayDate = new Date().toISOString().split('T')[0];

    // Get distinct users who played today
    const activePlayersResult = await pool.query(
      `SELECT COUNT(DISTINCT user_id) 
       FROM bets 
       WHERE created_at::date = $1`,
       [todayDate]
    );

     // Get today's registrations
    const todayRegistrationsResult = await pool.query(
      `SELECT COUNT(*) FROM users WHERE created_at::date = $1`,
      [todayDate]
    );
    
    if (period === 'week') {
      // Calculate date 7 days ago
      const d = new Date();
      d.setDate(d.getDate() - 7);
      dateFilter = d.toISOString().split('T')[0];
    } else {
      // Default to today
      dateFilter = new Date().toISOString().split('T')[0];
    }

    // Get Top 5 Winners
    // For 'today' we use exact match, for 'week' we use >=
    const winnerQuery = period === 'week' 
      ? `SELECT u.name, u.phone, SUM(b.payout_amount) as total_win
         FROM bets b
         JOIN users u ON b.user_id = u.id
         WHERE b.created_at::date >= $1 AND b.status = 'win'
         GROUP BY u.id, u.name, u.phone
         ORDER BY total_win DESC
         LIMIT 5`
      : `SELECT u.name, u.phone, SUM(b.payout_amount) as total_win
         FROM bets b
         JOIN users u ON b.user_id = u.id
         WHERE b.created_at::date = $1 AND b.status = 'win'
         GROUP BY u.id, u.name, u.phone
         ORDER BY total_win DESC
         LIMIT 5`;

    const topWinnersResult = await pool.query(winnerQuery, [dateFilter]);

    // Get Top 5 Bidders
    const bidderQuery = period === 'week'
      ? `SELECT u.name, u.phone, SUM(b.bet_amount) as total_bid
         FROM bets b
         JOIN users u ON b.user_id = u.id
         WHERE b.created_at::date >= $1
         GROUP BY u.id, u.name, u.phone
         ORDER BY total_bid DESC
         LIMIT 5`
      : `SELECT u.name, u.phone, SUM(b.bet_amount) as total_bid
         FROM bets b
         JOIN users u ON b.user_id = u.id
         WHERE b.created_at::date = $1
         GROUP BY u.id, u.name, u.phone
         ORDER BY total_bid DESC
         LIMIT 5`;

    const topBiddersResult = await pool.query(bidderQuery, [dateFilter]);

    const stats = {
      userCount: userCountResult.rows[0].count,
      activeGamesCount: activeGamesCountResult.rows[0].count,
      pendingWithdrawalsCount: pendingWithdrawalsCountResult.rows[0].count,
      totalBalance: totalBalanceResult.rows[0].total || 0,
      todayPlayersCount: activePlayersResult.rows[0].count,
      todayRegistrationCount: todayRegistrationsResult.rows[0].count,
      todayLoginCount: 0 // Placeholder as we don't track logins yet
    };

    // Get all games for the dropdown
    const games = await Game.getAllActive();
    console.log(`[Dashboard] Fetched ${games.length} active games for dropdown.`);

    res.render('admin/dashboard', { 
      title: 'Admin Dashboard', 
      user: req.user,
      user: req.user,
      stats: stats,
      games: games,
      topWinners: topWinnersResult.rows,
      topBidders: topBiddersResult.rows,
      period: period
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
 * Market Monitor - View all games and their bid stats
 */
async function getMarketMonitor(req, res) {
  try {
    const games = await Game.getAllWithTodaySessions();
    res.render('admin/bid-monitor', {
      title: 'Bid Monitor',
      user: req.user,
      games: games
    });
  } catch (error) {
    console.error('Error getting market monitor:', error);
    res.status(500).send('Internal Server Error');
  }
}

/**
 * Get Bid Stats API
 */
async function getBidStatsAPI(req, res) {
  try {
    const { gameId } = req.params;
    const session = await Game.getOrCreateTodaySession(gameId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }
    
    const Bet = require('../models/Bet'); 
    const stats = await Bet.getBidStats(session.id);
    
    res.json({
      success: true,
      data: stats,
      session: session
    });
  } catch (error) {
    console.error('Error getting bid stats API:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
}

/**
 * Declare Result (Manual/Instant)
 */
async function declareResult(req, res) {
  try {
    const { sessionId, winningNumber } = req.body;
    const gameService = require('../services/gameService');
    
    const result = await gameService.processResult(sessionId, winningNumber);
    
    res.json({ success: true, message: 'Result declared and payouts processed', session: result.session });
  } catch (error) {
    console.error('Error declaring result:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * Schedule Result
 */
async function scheduleResult(req, res) {
  try {
    const { sessionId, winningNumber } = req.body;
    
    await pool.query(
      `UPDATE game_sessions 
       SET scheduled_winning_number = $1, is_scheduled = true 
       WHERE id = $2 AND status = 'pending'`,
      [winningNumber, sessionId]
    );

    res.json({ success: true, message: 'Result scheduled successfully' });
  } catch (error) {
    console.error('Error scheduling result:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
}


/**
 * Get Market Stats by Date API
 */
async function getMarketStatsByDateAPI(req, res) {
  try {
    const { gameId, date } = req.query;
    
    // Find session
    const sessionResult = await pool.query(
      'SELECT id FROM game_sessions WHERE game_id = $1 AND session_date = $2',
      [gameId, date]
    );
    
    if (sessionResult.rows.length === 0) {
      return res.json({
        success: true,
        data: {
          totalBid: 0,
          totalWin: 0,
          profit: 0
        }
      });
    }
    
    const sessionId = sessionResult.rows[0].id;
    
    // Calculate stats
    const statsResult = await pool.query(
      `SELECT 
        COALESCE(SUM(bet_amount), 0) as total_bid,
        COALESCE(SUM(payout_amount), 0) as total_win
       FROM bets 
       WHERE game_session_id = $1`,
      [sessionId]
    );
    
    const totalBid = parseFloat(statsResult.rows[0].total_bid);
    const totalWin = parseFloat(statsResult.rows[0].total_win);
    
    res.json({
      success: true,
      data: {
        totalBid,
        totalWin,
        profit: totalBid - totalWin
      }
    });
    
  } catch (error) {
    console.error('Error getting market stats:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
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
  updateUserStatus,
  getMarketMonitor,
  getBidStatsAPI,
  declareResult,
  scheduleResult,
  getMarketStatsByDateAPI
};
