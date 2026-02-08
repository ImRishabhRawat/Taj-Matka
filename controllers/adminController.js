/**
 * Admin Controller
 * Handles admin-only view logic
 */

const User = require("../models/User");
const Game = require("../models/Game");
const Transaction = require("../models/Transaction");
const Settings = require("../models/Settings");
const Bet = require("../models/Bet");
const pool = require("../config/database");

/**
 * Admin Dashboard - Home
 */
async function getDashboard(req, res) {
  try {
    const todayDate = new Date().toISOString().split("T")[0];

    // Basic user stats
    const userCountResult = await pool.query(
      "SELECT COUNT(*) FROM users WHERE role = $1",
      ["user"],
    );

    const activeUsersResult = await pool.query(
      "SELECT COUNT(*) FROM users WHERE role = 'user' AND is_active = true",
    );

    const inactiveUsersResult = await pool.query(
      "SELECT COUNT(*) FROM users WHERE role = 'user' AND is_active = false",
    );

    const todayRegistrationsResult = await pool.query(
      "SELECT COUNT(*) FROM users WHERE created_at::date = $1",
      [todayDate],
    );

    // Today's collection (total bets placed today)
    const todayCollectionResult = await pool.query(
      "SELECT COALESCE(SUM(bet_amount), 0) as total FROM bets WHERE created_at::date = $1",
      [todayDate],
    );

    // Wallet balance (total balance across all users)
    const walletBalanceResult = await pool.query(
      "SELECT COALESCE(SUM(balance + winning_balance), 0) as total FROM users",
    );

    // Bid report stats
    const bidStatsResult = await pool.query(
      `SELECT 
        COALESCE(SUM(bet_amount), 0) as total_bid,
        COALESCE(SUM(payout_amount), 0) as total_winning,
        COUNT(*) as total_bids
       FROM bets 
       WHERE created_at::date = $1`,
      [todayDate],
    );

    // Deposit and withdrawal stats for today
    const depositStatsResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total 
       FROM transactions 
       WHERE transaction_type = 'deposit' AND created_at::date = $1`,
      [todayDate],
    );

    const withdrawalStatsResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total 
       FROM transactions 
       WHERE transaction_type = 'withdrawal' AND created_at::date = $1`,
      [todayDate],
    );

    // Total deposits and bonuses (all time)
    const totalDepositsResult = await pool.query(
      "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE transaction_type = 'deposit'",
    );

    // Withdrawal request stats
    const withdrawalRequestsResult = await pool.query(
      `SELECT 
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'approved') as approved,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected
       FROM withdrawal_requests`,
    );

    // Game stats
    const gameStatsResult = await pool.query(
      "SELECT COUNT(*) as total FROM games WHERE is_active = true",
    );

    const todaySessionsResult = await pool.query(
      "SELECT COUNT(*) as total FROM game_sessions WHERE session_date = $1",
      [todayDate],
    );

    const todayPlayersResult = await pool.query(
      "SELECT COUNT(DISTINCT user_id) as total FROM bets WHERE created_at::date = $1",
      [todayDate],
    );

    const stats = {
      // Top 3 cards
      userCount: parseInt(userCountResult.rows[0].count),
      todayCollection: parseFloat(todayCollectionResult.rows[0].total),
      walletBalance: parseFloat(walletBalanceResult.rows[0].total),

      // Bid report
      totalBidAmount: parseFloat(bidStatsResult.rows[0].total_bid),
      totalWinningAmount: parseFloat(bidStatsResult.rows[0].total_winning),
      totalBids: parseInt(bidStatsResult.rows[0].total_bids),

      // Profit/Loss report
      todayDeposits: parseFloat(depositStatsResult.rows[0].total),
      todayWithdrawals: parseFloat(withdrawalStatsResult.rows[0].total),

      // Deposits & Bonuses
      totalDeposits: parseFloat(totalDepositsResult.rows[0].total),
      totalBonuses: 0, // Placeholder - implement bonus tracking if needed

      // User statistics
      activeUsers: parseInt(activeUsersResult.rows[0].count),
      inactiveUsers: parseInt(inactiveUsersResult.rows[0].count),
      todayRegistrationCount: parseInt(todayRegistrationsResult.rows[0].count),

      // Game statistics
      totalGames: parseInt(gameStatsResult.rows[0].total),
      todaySessions: parseInt(todaySessionsResult.rows[0].total),
      todayPlayersCount: parseInt(todayPlayersResult.rows[0].total),

      // Withdrawal statistics
      pendingWithdrawals: parseInt(
        withdrawalRequestsResult.rows[0].pending || 0,
      ),
      approvedWithdrawals: parseInt(
        withdrawalRequestsResult.rows[0].approved || 0,
      ),
      rejectedWithdrawals: parseInt(
        withdrawalRequestsResult.rows[0].rejected || 0,
      ),
    };

    res.render("admin/dashboard", {
      title: "Dashboard",
      user: req.user,
      stats: stats,
    });
  } catch (error) {
    console.error("Error getting admin dashboard:", error);
    res.status(500).send("Internal Server Error");
  }
}

/**
 * Game Management
 */
async function getGames(req, res) {
  try {
    const games = await pool.query(
      "SELECT * FROM games ORDER BY open_time ASC",
    );
    res.render("admin/games", {
      title: "Manage Games",
      user: req.user,
      games: games.rows,
    });
  } catch (error) {
    console.error("Error getting admin games:", error);
    res.status(500).send("Internal Server Error");
  }
}

/**
 * Result Declaration
 */
async function getResultEntry(req, res) {
  try {
    const today = new Date().toISOString().split("T")[0];

    // Ensure sessions exist for all active games
    const activeGames = await Game.getAllActive();
    await Promise.all(
      activeGames.map((game) => Game.getOrCreateTodaySession(game.id)),
    );

    const games = await Game.getAllWithTodaySessions();

    res.render("admin/result-entry", {
      title: "Declare Result",
      user: req.user,
      games: games,
      today: today,
    });
  } catch (error) {
    console.error("Error getting admin result entry:", error);
    res.status(500).send("Internal Server Error");
  }
}

/**
 * User Management
 */
async function getUsers(req, res) {
  try {
    const { search } = req.query;
    let query = "SELECT * FROM users WHERE role = $1";
    const params = ["user"];

    if (search) {
      query += " AND (phone LIKE $2 OR name LIKE $2)";
      params.push(`%${search}%`);
    }

    query += " ORDER BY created_at DESC";

    const users = await pool.query(query, params);

    res.render("admin/users", {
      title: "Manage Users",
      user: req.user,
      users: users.rows,
      search: search || "",
    });
  } catch (error) {
    console.error("Error getting admin users:", error);
    res.status(500).send("Internal Server Error");
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

    res.render("admin/withdrawals", {
      title: "Withdrawal Requests",
      user: req.user,
      withdrawals: result.rows,
    });
  } catch (error) {
    console.error("Error getting admin withdrawals:", error);
    res.status(500).send("Internal Server Error");
  }
}

/**
 * Market Monitor - View all games and their bid stats
 */
async function getMarketMonitor(req, res) {
  try {
    const games = await Game.getAllWithTodaySessions();
    res.render("admin/bid-monitor", {
      title: "Bid Monitor",
      user: req.user,
      games: games,
    });
  } catch (error) {
    console.error("Error getting market monitor:", error);
    res.status(500).send("Internal Server Error");
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
      return res
        .status(404)
        .json({ success: false, message: "Session not found" });
    }

    const Bet = require("../models/Bet");
    const stats = await Bet.getBidStats(session.id);

    res.json({
      success: true,
      data: stats,
      session: session,
    });
  } catch (error) {
    console.error("Error getting bid stats API:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

/**
 * Declare Result (Manual/Instant)
 */
async function declareResult(req, res) {
  try {
    const { sessionId, winningNumber } = req.body;
    const gameService = require("../services/gameService");

    const result = await gameService.processResult(sessionId, winningNumber);

    res.json({
      success: true,
      message: "Result declared and payouts processed",
      session: result.session,
    });
  } catch (error) {
    console.error("Error declaring result:", error);
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
      [winningNumber, sessionId],
    );

    res.json({ success: true, message: "Result scheduled successfully" });
  } catch (error) {
    console.error("Error scheduling result:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
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
      "SELECT id FROM game_sessions WHERE game_id = $1 AND session_date = $2",
      [gameId, date],
    );

    if (sessionResult.rows.length === 0) {
      return res.json({
        success: true,
        data: {
          totalBid: 0,
          totalWin: 0,
          profit: 0,
        },
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
      [sessionId],
    );

    const totalBid = parseFloat(statsResult.rows[0].total_bid);
    const totalWin = parseFloat(statsResult.rows[0].total_win);

    res.json({
      success: true,
      data: {
        totalBid,
        totalWin,
        profit: totalBid - totalWin,
      },
    });
  } catch (error) {
    console.error("Error getting market stats:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
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
      message: `User ${isActive ? "unblocked" : "blocked"} successfully`,
      data: user,
    });
  } catch (error) {
    console.error("Error updating user status:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

/**
 * Game Rates Management
 */
async function getGameRates(req, res) {
  try {
    const rates = await Settings.getAll();
    res.render("admin/game-rates", {
      title: "Game Rates",
      user: req.user,
      rates: rates,
    });
  } catch (error) {
    console.error("Error getting game rates:", error);
    res.status(500).send("Internal Server Error");
  }
}

async function updateGameRates(req, res) {
  try {
    const { rate_jodi, rate_haruf } = req.body;

    await Settings.set("rate_jodi", rate_jodi);
    await Settings.set("rate_haruf", rate_haruf);

    res.json({ success: true, message: "Rates updated successfully" });
  } catch (error) {
    console.error("Error updating game rates:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

/**
 * Bid History
 */
async function getBidHistory(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Filters
    const filters = {
      search: req.query.search || "",
      startDate: req.query.startDate || "",
      endDate: req.query.endDate || "",
      gameId: req.query.gameId || "",
      betType: req.query.betType || "",
    };

    const { rows: bets, total } = await Bet.getAllBets(filters, limit, offset);

    // Fetch games for filter
    const games = await Game.getAllActive();

    const totalPages = Math.ceil(total / limit);

    res.render("admin/bid-history", {
      title: "Bid History",
      user: req.user,
      bets: bets,
      games: games,
      pagination: {
        page: page,
        limit: limit,
        total: total,
        totalPages: totalPages,
      },
      filters: filters,
    });
  } catch (error) {
    console.error("Error getting bid history:", error);
    res.status(500).send("Internal Server Error");
  }
}

/**
 * Get User Details Page
 */
async function getUserDetails(req, res) {
  try {
    const { id } = req.params;
    const userDetails = await User.findById(id);

    if (!userDetails) {
      return res.status(404).send("User not found");
    }

    // Initialize history object
    const history = {
      bids: [],
      wins: [],
      withdrawals: [],
      transactions: [],
    };

    // Fetch Bidding History
    const bidsResult = await pool.query(
      `SELECT b.*, g.name as game_name 
       FROM bets b 
       JOIN game_sessions gs ON b.game_session_id = gs.id 
       JOIN games g ON gs.game_id = g.id
       WHERE b.user_id = $1 
       ORDER BY b.created_at DESC LIMIT 50`,
      [id],
    );
    history.bids = bidsResult.rows;

    // Fetch Winning History
    const winsResult = await pool.query(
      `SELECT b.*, g.name as game_name 
       FROM bets b 
       JOIN game_sessions gs ON b.game_session_id = gs.id 
       JOIN games g ON gs.game_id = g.id
       WHERE b.user_id = $1 AND b.status = 'win' 
       ORDER BY b.created_at DESC LIMIT 50`,
      [id],
    );
    history.wins = winsResult.rows;

    // Fetch Withdrawal History
    const withdrawalsResult = await pool.query(
      `SELECT * FROM withdrawal_requests WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`,
      [id],
    );
    history.withdrawals = withdrawalsResult.rows;

    // Fetch Wallet History (Transactions)
    const transactionsResult = await pool.query(
      `SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [id],
    );
    history.transactions = transactionsResult.rows;

    // Fetch Bank Details (Last used in withdrawal specific to this user)
    // Since we don't store it in user table properly yet, we try to pick from last withdrawal
    let bankDetails = null;
    const lastWithdrawal = withdrawalsResult.rows.find((w) => w.bank_details);
    if (lastWithdrawal && lastWithdrawal.bank_details) {
      bankDetails = lastWithdrawal.bank_details;
    }

    res.render("admin/user-details", {
      title: "User Details",
      user: req.user,
      userDetails: userDetails,
      bankDetails: bankDetails,
      history: history,
    });
  } catch (error) {
    console.error("Error getting user details:", error);
    res.status(500).send("Internal Server Error");
  }
}

/**
 * Delete User
 */
async function deleteUser(req, res) {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM users WHERE id = $1", [id]);
    res.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

/**
 * Notifications Page
 */
async function getNotifications(req, res) {
  try {
    let notifications = [];

    // Try to fetch notifications, handle if table doesn't exist
    try {
      const result = await pool.query(
        "SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50",
      );
      notifications = result.rows;
    } catch (dbError) {
      console.log("Notifications table may not exist yet:", dbError.message);
      // Table doesn't exist yet, return empty array
      notifications = [];
    }

    res.render("admin/notifications", {
      title: "Notification",
      user: req.user,
      notifications: notifications,
    });
  } catch (error) {
    console.error("Error getting notifications:", error);
    res.status(500).send("Internal Server Error");
  }
}

/**
 * Popup Management Page
 */
async function getPopup(req, res) {
  try {
    let popups = [];

    try {
      const result = await pool.query(
        "SELECT * FROM popups ORDER BY created_at DESC",
      );
      popups = result.rows;
    } catch (dbError) {
      console.log("Popups table may not exist yet:", dbError.message);
      popups = [];
    }

    res.render("admin/popup", {
      title: "Popup",
      user: req.user,
      popups: popups,
    });
  } catch (error) {
    console.error("Error getting popups:", error);
    res.status(500).send("Internal Server Error");
  }
}

/**
 * Deposit Requests Page
 */
async function getDepositRequests(req, res) {
  try {
    const filters = {
      search: req.query.search || "",
      paymentMethod: req.query.paymentMethod || "",
      startDate: req.query.startDate || "",
      endDate: req.query.endDate || "",
    };

    let query = `
      SELECT t.*, u.name as user_name, u.phone as user_phone
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      WHERE t.type = 'deposit'
    `;
    const params = [];
    let paramCount = 1;

    if (filters.search) {
      query += ` AND (u.phone LIKE $${paramCount} OR u.name LIKE $${paramCount})`;
      params.push(`%${filters.search}%`);
      paramCount++;
    }

    if (filters.paymentMethod) {
      query += ` AND t.payment_method = $${paramCount}`;
      params.push(filters.paymentMethod);
      paramCount++;
    }

    if (filters.startDate) {
      query += ` AND t.created_at::date >= $${paramCount}`;
      params.push(filters.startDate);
      paramCount++;
    }

    if (filters.endDate) {
      query += ` AND t.created_at::date <= $${paramCount}`;
      params.push(filters.endDate);
      paramCount++;
    }

    query += " ORDER BY t.created_at DESC";

    const deposits = await pool.query(query, params);

    // Calculate stats
    const statsUPI = await pool.query(
      "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'deposit' AND payment_method = 'upi'",
    );
    const statsBank = await pool.query(
      "SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE type = 'deposit' AND payment_method = 'bank'",
    );

    const stats = {
      totalUPI: parseFloat(statsUPI.rows[0].total),
      totalBank: parseFloat(statsBank.rows[0].total),
    };

    res.render("admin/deposit-requests", {
      title: "Deposit Request",
      user: req.user,
      deposits: deposits.rows,
      filters,
      stats,
    });
  } catch (error) {
    console.error("Error getting deposit requests:", error);
    res.status(500).send("Internal Server Error");
  }
}

/**
 * Withdraw Requests Page
 */
async function getWithdrawRequests(req, res) {
  try {
    const status = req.query.status || "pending";

    let query = `
      SELECT wr.*, u.name as user_name, u.phone as user_phone
      FROM withdrawal_requests wr
      JOIN users u ON wr.user_id = u.id
    `;

    if (status !== "all") {
      query += ` WHERE wr.status = $1`;
    }

    query += " ORDER BY wr.created_at DESC";

    const requests =
      status !== "all"
        ? await pool.query(query, [status])
        : await pool.query(query);

    // Get stats
    const statsResult = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'approved') as approved,
        COUNT(*) FILTER (WHERE status = 'rejected') as rejected,
        COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0) as total_amount
      FROM withdrawal_requests
    `);

    const stats = {
      pending: parseInt(statsResult.rows[0].pending),
      approved: parseInt(statsResult.rows[0].approved),
      rejected: parseInt(statsResult.rows[0].rejected),
      totalAmount: parseFloat(statsResult.rows[0].total_amount),
    };

    res.render("admin/withdraw-requests", {
      title: "Withdraw Request",
      user: req.user,
      requests: requests.rows,
      filters: { status },
      stats,
    });
  } catch (error) {
    console.error("Error getting withdraw requests:", error);
    res.status(500).send("Internal Server Error");
  }
}

/**
 * Withdraw Bank Requests Page
 */
async function getWithdrawBankRequests(req, res) {
  try {
    let requests = [];
    let stats = { pending: 0, processedToday: 0, pendingAmount: 0 };

    try {
      const result = await pool.query(`
        SELECT wr.*, u.name as user_name, u.phone as user_phone
        FROM withdrawal_requests wr
        JOIN users u ON wr.user_id = u.id
        WHERE wr.payment_method = 'bank'
        ORDER BY wr.created_at DESC
      `);
      requests = result.rows;

      // Get stats
      const statsResult = await pool.query(`
        SELECT 
          COUNT(*) FILTER (WHERE status = 'pending') as pending,
          COUNT(*) FILTER (WHERE status = 'approved' AND created_at::date = CURRENT_DATE) as processed_today,
          COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0) as pending_amount
        FROM withdrawal_requests
        WHERE payment_method = 'bank'
      `);

      stats = {
        pending: parseInt(statsResult.rows[0].pending) || 0,
        processedToday: parseInt(statsResult.rows[0].processed_today) || 0,
        pendingAmount: parseFloat(statsResult.rows[0].pending_amount) || 0,
      };
    } catch (dbError) {
      console.log("Error fetching withdrawal data:", dbError.message);
    }

    res.render("admin/withdraw-bank-requests", {
      title: "Withdraw Bank Request",
      user: req.user,
      requests: requests,
      stats,
    });
  } catch (error) {
    console.error("Error getting withdraw bank requests:", error);
    res.status(500).send("Internal Server Error");
  }
}

/**
 * Jantri Report Page
 */
async function getJantriReport(req, res) {
  try {
    const filters = {
      gameId: req.query.gameId || "",
      month: req.query.month || "",
    };

    const games = await Game.getAllActive();
    let jantriData = [];
    let selectedGame = null;

    if (filters.gameId && filters.month) {
      // Parse month (format: YYYY-MM)
      const [year, month] = filters.month.split("-");
      const startDate = `${year}-${month}-01`;
      const endDate = new Date(year, month, 0).toISOString().split("T")[0];

      // Get results for the month
      const results = await pool.query(
        `
        SELECT 
          gs.session_date as date,
          gs.session_type,
          gs.winning_number
        FROM game_sessions gs
        WHERE gs.game_id = $1 
          AND gs.session_date >= $2 
          AND gs.session_date <= $3
          AND gs.status = 'completed'
        ORDER BY gs.session_date ASC, gs.session_type ASC
      `,
        [filters.gameId, startDate, endDate],
      );

      // Group by date
      const groupedResults = {};
      results.rows.forEach((row) => {
        const dateKey = row.date;
        if (!groupedResults[dateKey]) {
          groupedResults[dateKey] = {
            date: dateKey,
            open_result: null,
            close_result: null,
          };
        }
        if (row.session_type === "open") {
          groupedResults[dateKey].open_result = row.winning_number;
        } else {
          groupedResults[dateKey].close_result = row.winning_number;
        }
      });

      jantriData = Object.values(groupedResults);
      selectedGame = games.find((g) => g.id == filters.gameId);
    }

    res.render("admin/jantri-report", {
      title: "Jantri Report",
      user: req.user,
      games,
      jantriData,
      selectedGame,
      filters,
    });
  } catch (error) {
    console.error("Error getting jantri report:", error);
    res.status(500).send("Internal Server Error");
  }
}

/**
 * Result History Page
 */
async function getResultHistory(req, res) {
  try {
    const filters = {
      gameId: req.query.gameId || "",
      startDate: req.query.startDate || "",
      endDate: req.query.endDate || "",
      session: req.query.session || "",
    };

    let games = [];
    let results = [];

    try {
      games = await Game.getAllActive();
    } catch (err) {
      console.log("Error fetching games:", err.message);
      games = [];
    }

    try {
      let query = `
        SELECT 
          gs.*,
          g.name as game_name,
          COUNT(b.id) as total_bets,
          COALESCE(SUM(b.bet_amount), 0) as total_bet_amount,
          COALESCE(SUM(b.payout_amount), 0) as total_payout
        FROM game_sessions gs
        JOIN games g ON gs.game_id = g.id
        LEFT JOIN bets b ON b.game_session_id = gs.id
        WHERE gs.status = 'completed'
      `;
      const params = [];
      let paramCount = 1;

      if (filters.gameId) {
        query += ` AND gs.game_id = $${paramCount}`;
        params.push(filters.gameId);
        paramCount++;
      }

      if (filters.startDate) {
        query += ` AND gs.session_date >= $${paramCount}`;
        params.push(filters.startDate);
        paramCount++;
      }

      if (filters.endDate) {
        query += ` AND gs.session_date <= $${paramCount}`;
        params.push(filters.endDate);
        paramCount++;
      }

      if (filters.session) {
        query += ` AND gs.session_type = $${paramCount}`;
        params.push(filters.session);
        paramCount++;
      }

      query +=
        " GROUP BY gs.id, g.name ORDER BY gs.session_date DESC, gs.session_type DESC LIMIT 100";

      const result = await pool.query(query, params);
      results = result.rows;
    } catch (dbError) {
      console.log("Error fetching result history:", dbError.message);
      results = [];
    }

    res.render("admin/result-history", {
      title: "Result History",
      user: req.user,
      results: results,
      games,
      filters,
    });
  } catch (error) {
    console.error("Error getting result history:", error);
    res.status(500).send("Internal Server Error");
  }
}

/**
 * Winner History Page
 */
async function getWinnerHistory(req, res) {
  try {
    const filters = {
      search: req.query.search || "",
      gameId: req.query.gameId || "",
      startDate: req.query.startDate || "",
      endDate: req.query.endDate || "",
    };

    const games = await Game.getAllActive();

    let query = `
      SELECT 
        b.*,
        u.name as user_name,
        u.phone as user_phone,
        g.name as game_name
      FROM bets b
      JOIN users u ON b.user_id = u.id
      JOIN game_sessions gs ON b.game_session_id = gs.id
      JOIN games g ON gs.game_id = g.id
      WHERE b.status = 'win'
    `;
    const params = [];
    let paramCount = 1;

    if (filters.search) {
      query += ` AND (u.phone LIKE $${paramCount} OR u.name LIKE $${paramCount})`;
      params.push(`%${filters.search}%`);
      paramCount++;
    }

    if (filters.gameId) {
      query += ` AND gs.game_id = $${paramCount}`;
      params.push(filters.gameId);
      paramCount++;
    }

    if (filters.startDate) {
      query += ` AND b.created_at::date >= $${paramCount}`;
      params.push(filters.startDate);
      paramCount++;
    }

    if (filters.endDate) {
      query += ` AND b.created_at::date <= $${paramCount}`;
      params.push(filters.endDate);
      paramCount++;
    }

    query += " ORDER BY b.created_at DESC LIMIT 100";

    const winners = await pool.query(query, params);

    // Get stats
    const statsResult = await pool.query(`
      SELECT 
        COUNT(DISTINCT user_id) as total_winners,
        COALESCE(SUM(payout_amount), 0) as total_winnings,
        COUNT(DISTINCT user_id) FILTER (WHERE created_at::date = CURRENT_DATE) as today_winners,
        COALESCE(SUM(payout_amount) FILTER (WHERE created_at::date = CURRENT_DATE), 0) as today_payout
      FROM bets
      WHERE status = 'win'
    `);

    const stats = {
      totalWinners: parseInt(statsResult.rows[0].total_winners),
      totalWinnings: parseFloat(statsResult.rows[0].total_winnings),
      todayWinners: parseInt(statsResult.rows[0].today_winners),
      todayPayout: parseFloat(statsResult.rows[0].today_payout),
    };

    res.render("admin/winner-history", {
      title: "Winner History",
      user: req.user,
      winners: winners.rows,
      games,
      filters,
      stats,
    });
  } catch (error) {
    console.error("Error getting winner history:", error);
    res.status(500).send("Internal Server Error");
  }
}

/**
 * API: Create and Send Notification
 * Ready for Twilio integration - just add Twilio credentials later
 */
async function createNotification(req, res) {
  try {
    const { title, message, targetType, targetUserIds } = req.body;

    // Validate input
    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: "Title and message are required",
      });
    }

    // Insert notification into database
    const result = await pool.query(
      `INSERT INTO notifications (title, message, target_type, target_user_ids, created_by, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING *`,
      [title, message, targetType || "all", targetUserIds || null, req.user.id],
    );

    const notification = result.rows[0];

    // TODO: When client provides Twilio credentials, add this code:
    // const twilioService = require('../services/twilioService');
    // await twilioService.sendNotification(notification);

    // For now, just mark as sent
    await pool.query(
      "UPDATE notifications SET status = $1, sent_count = $2 WHERE id = $3",
      ["sent", 1, notification.id],
    );

    res.json({
      success: true,
      message: "Notification created successfully (Twilio integration pending)",
      notification,
    });
  } catch (error) {
    console.error("Error creating notification:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

/**
 * API: Create Popup
 */
async function createPopup(req, res) {
  try {
    const {
      title,
      message,
      imageUrl,
      startDate,
      endDate,
      targetAudience,
      isActive,
    } = req.body;

    if (!title || !message || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const result = await pool.query(
      `INSERT INTO popups (title, message, image_url, start_date, end_date, target_audience, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        title,
        message,
        imageUrl || null,
        startDate,
        endDate,
        targetAudience || "all",
        isActive !== false,
      ],
    );

    res.json({
      success: true,
      message: "Popup created successfully",
      popup: result.rows[0],
    });
  } catch (error) {
    console.error("Error creating popup:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

/**
 * API: Toggle Popup Status
 */
async function togglePopup(req, res) {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    await pool.query("UPDATE popups SET is_active = $1 WHERE id = $2", [
      isActive,
      id,
    ]);

    res.json({
      success: true,
      message: "Popup status updated successfully",
    });
  } catch (error) {
    console.error("Error toggling popup:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

/**
 * API: Delete Popup
 */
async function deletePopup(req, res) {
  try {
    const { id } = req.params;

    await pool.query("DELETE FROM popups WHERE id = $1", [id]);

    res.json({
      success: true,
      message: "Popup deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting popup:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

/**
 * API: Approve Withdrawal Request
 */
async function approveWithdrawal(req, res) {
  try {
    const { id } = req.params;

    // Get withdrawal request
    const wrResult = await pool.query(
      "SELECT * FROM withdrawal_requests WHERE id = $1",
      [id],
    );

    if (wrResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Withdrawal request not found",
      });
    }

    const withdrawal = wrResult.rows[0];

    if (withdrawal.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Withdrawal request already processed",
      });
    }

    // Update withdrawal status
    await pool.query(
      "UPDATE withdrawal_requests SET status = $1, processed_by = $2, processed_at = NOW() WHERE id = $3",
      ["approved", req.user.id, id],
    );

    // Deduct from held_withdrawal_balance
    await pool.query(
      "UPDATE users SET held_withdrawal_balance = held_withdrawal_balance - $1 WHERE id = $2",
      [withdrawal.amount, withdrawal.user_id],
    );

    // Create transaction record
    await pool.query(
      `INSERT INTO transactions (user_id, transaction_type, amount, balance_before, balance_after, description, reference_id, reference_type)
       SELECT $1, 'withdrawal', $2, held_withdrawal_balance + $2, held_withdrawal_balance, 
              'Withdrawal approved', $3, 'withdrawal_request'
       FROM users WHERE id = $1`,
      [withdrawal.user_id, withdrawal.amount, id],
    );

    res.json({
      success: true,
      message: "Withdrawal approved successfully",
    });
  } catch (error) {
    console.error("Error approving withdrawal:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

/**
 * API: Reject Withdrawal Request
 */
async function rejectWithdrawal(req, res) {
  try {
    const { id } = req.params;

    // Get withdrawal request
    const wrResult = await pool.query(
      "SELECT * FROM withdrawal_requests WHERE id = $1",
      [id],
    );

    if (wrResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Withdrawal request not found",
      });
    }

    const withdrawal = wrResult.rows[0];

    if (withdrawal.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Withdrawal request already processed",
      });
    }

    // Update withdrawal status
    await pool.query(
      "UPDATE withdrawal_requests SET status = $1, processed_by = $2, processed_at = NOW() WHERE id = $3",
      ["rejected", req.user.id, id],
    );

    // Refund to winning_balance
    await pool.query(
      "UPDATE users SET winning_balance = winning_balance + $1, held_withdrawal_balance = held_withdrawal_balance - $1 WHERE id = $2",
      [withdrawal.amount, withdrawal.user_id],
    );

    // Create transaction record
    await pool.query(
      `INSERT INTO transactions (user_id, transaction_type, amount, balance_before, balance_after, description, reference_id, reference_type)
       SELECT $1, 'refund', $2, winning_balance - $2, winning_balance, 
              'Withdrawal rejected - refunded', $3, 'withdrawal_request'
       FROM users WHERE id = $1`,
      [withdrawal.user_id, withdrawal.amount, id],
    );

    res.json({
      success: true,
      message: "Withdrawal rejected and amount refunded",
    });
  } catch (error) {
    console.error("Error rejecting withdrawal:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
}

/**
 * API: Get Active Popups for Users
 * Returns popups that are active and within the date range
 */
async function getActivePopups(req, res) {
  try {
    const today = new Date().toISOString().split("T")[0];

    const result = await pool.query(
      `SELECT id, title, message, image_url, target_audience 
       FROM popups 
       WHERE is_active = true 
         AND start_date <= $1 
         AND end_date >= $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [today],
    );

    res.json({
      success: true,
      popup: result.rows.length > 0 ? result.rows[0] : null,
    });
  } catch (error) {
    console.error("Error getting active popups:", error);
    res.json({ success: true, popup: null }); // Return null on error to not break user experience
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
  getMarketStatsByDateAPI,
  getGameRates,
  updateGameRates,
  getBidHistory,
  getUserDetails,
  deleteUser,
  // New functions
  getNotifications,
  getPopup,
  getDepositRequests,
  getWithdrawRequests,
  getWithdrawBankRequests,
  getJantriReport,
  getResultHistory,
  getWinnerHistory,
  // API functions
  createNotification,
  createPopup,
  togglePopup,
  deletePopup,
  approveWithdrawal,
  rejectWithdrawal,
  getActivePopups,
};
