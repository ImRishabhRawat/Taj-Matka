/**
 * Game Model
 * Handles game and game session operations
 */

const pool = require("../config/database");

/**
 * Get all active games
 * @returns {Promise<Array>} Array of active games
 */
async function getAllActive() {
  try {
    const result = await pool.query(
      `SELECT * FROM games 
       WHERE is_active = true 
       ORDER BY open_time ASC`,
    );
    return result.rows;
  } catch (error) {
    console.error("Error getting active games:", error);
    throw error;
  }
}

/**
 * Get game by ID
 * @param {number} gameId - Game ID
 * @returns {Promise<Object|null>} Game object or null
 */
async function findById(gameId) {
  try {
    const result = await pool.query("SELECT * FROM games WHERE id = $1", [
      gameId,
    ]);
    return result.rows[0] || null;
  } catch (error) {
    console.error("Error finding game by ID:", error);
    throw error;
  }
}

/**
 * Get or create game session for a specific date
 * @param {number} gameId - Game ID
 * @param {string} date - Date string (YYYY-MM-DD)
 * @returns {Promise<Object>} Game session
 */
async function getOrCreateSession(gameId, date = null) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Default to today if no date provided
    const sessionDate = date || new Date().toISOString().split("T")[0];

    // Try to find existing session
    let result = await client.query(
      `SELECT * FROM game_sessions 
       WHERE game_id = $1 AND session_date = $2`,
      [gameId, sessionDate],
    );

    if (result.rows.length > 0) {
      await client.query("COMMIT");
      return result.rows[0];
    }

    // Create new session
    result = await client.query(
      `INSERT INTO game_sessions (game_id, session_date, status) 
       VALUES ($1, $2, 'pending') 
       RETURNING *`,
      [gameId, sessionDate],
    );

    await client.query("COMMIT");
    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get or create today's game session
 * @param {number} gameId - Game ID
 * @returns {Promise<Object>} Game session
 */
async function getOrCreateTodaySession(gameId) {
  return getOrCreateSession(gameId);
}

/**
 * Get game session by ID
 * @param {number} sessionId - Session ID
 * @returns {Promise<Object|null>} Game session or null
 */
async function getSessionById(sessionId) {
  try {
    const result = await pool.query(
      `SELECT gs.*, g.name as game_name, g.open_time, g.close_time
       FROM game_sessions gs
       JOIN games g ON gs.game_id = g.id
       WHERE gs.id = $1`,
      [sessionId],
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error("Error getting session by ID:", error);
    throw error;
  }
}

/**
 * Get game with today's session
 * @param {number} gameId - Game ID
 * @returns {Promise<Object>} Game with session info
 */
async function getGameWithTodaySession(gameId) {
  try {
    const game = await findById(gameId);
    if (!game) {
      throw new Error("Game not found");
    }

    const session = await getOrCreateTodaySession(gameId);

    return {
      ...game,
      session,
    };
  } catch (error) {
    console.error("Error getting game with session:", error);
    throw error;
  }
}

/**
 * Get all games with today's sessions
 * @returns {Promise<Array>} Array of games with sessions
 */
async function getAllWithTodaySessions() {
  try {
    const today = new Date().toISOString().split("T")[0];

    const result = await pool.query(
      `SELECT 
        g.*,
        gs.id as session_id,
        gs.session_date,
        gs.winning_number,
        gs.scheduled_winning_number,
        gs.is_scheduled,
        gs.status as session_status,
        gs.result_declared_at
       FROM games g
       LEFT JOIN game_sessions gs ON g.id = gs.game_id AND gs.session_date = $1
       WHERE g.is_active = true
       ORDER BY g.open_time ASC`,
      [today],
    );

    return result.rows;
  } catch (error) {
    console.error("Error getting games with sessions:", error);
    throw error;
  }
}

/**
 * Check if game is currently open
 * @param {number} gameId - Game ID
 * @returns {Promise<boolean>} True if game is open
 */
async function isGameOpen(gameId) {
  try {
    const game = await findById(gameId);
    if (!game || !game.is_active) {
      return false;
    }

    const now = new Date();
    const currentTime = now.toTimeString().split(" ")[0]; // HH:MM:SS

    return currentTime >= game.open_time && currentTime <= game.close_time;
  } catch (error) {
    console.error("Error checking if game is open:", error);
    throw error;
  }
}

/**
 * Get game results (history)
 * @param {number} gameId - Game ID (optional)
 * @param {number} limit - Number of results
 * @returns {Promise<Array>} Array of results
 */
async function getResults(gameId = null, limit = 50) {
  try {
    let query = `
      SELECT 
        gs.*,
        g.name as game_name
      FROM game_sessions gs
      JOIN games g ON gs.game_id = g.id
      WHERE gs.status = 'completed'
    `;

    const params = [];

    if (gameId) {
      query += " AND gs.game_id = $1";
      params.push(gameId);
      query += " ORDER BY gs.session_date DESC LIMIT $2";
      params.push(limit);
    } else {
      query += " ORDER BY gs.session_date DESC LIMIT $1";
      params.push(limit);
    }

    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    console.error("Error getting results:", error);
    throw error;
  }
}

/**
 * Create new game (admin only)
 * @param {Object} gameData - Game data
 * @returns {Promise<Object>} Created game
 */
async function create(gameData) {
  const { name, openTime, closeTime, midTime, maxBetAfterMidTime } = gameData;

  try {
    const result = await pool.query(
      `INSERT INTO games (name, open_time, close_time, mid_time, max_bet_after_mid_time, is_active) 
       VALUES ($1, $2, $3, $4, $5, true) 
       RETURNING *`,
      [name, openTime, closeTime, midTime || null, maxBetAfterMidTime || 100.0],
    );
    return result.rows[0];
  } catch (error) {
    console.error("Error creating game:", error);
    throw error;
  }
}

/**
 * Update game
 * @param {number} gameId - Game ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated game
 */
async function update(gameId, updates) {
  const name = updates.name !== undefined ? updates.name : null;
  const openTime = updates.openTime !== undefined ? updates.openTime : null;
  const closeTime = updates.closeTime !== undefined ? updates.closeTime : null;
  const midTime = updates.midTime !== undefined ? updates.midTime : undefined;
  const maxBetAfterMidTime =
    updates.maxBetAfterMidTime !== undefined
      ? updates.maxBetAfterMidTime
      : undefined;
  const isActive =
    updates.isActive !== undefined && updates.isActive !== null
      ? updates.isActive
      : null;

  try {
    // Build dynamic query to handle optional fields
    const setParts = [];
    const values = [];
    let paramCount = 1;

    if (name !== null) {
      setParts.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (openTime !== null) {
      setParts.push(`open_time = $${paramCount++}`);
      values.push(openTime);
    }
    if (closeTime !== null) {
      setParts.push(`close_time = $${paramCount++}`);
      values.push(closeTime);
    }
    if (midTime !== undefined) {
      setParts.push(`mid_time = $${paramCount++}`);
      values.push(midTime);
    }
    if (maxBetAfterMidTime !== undefined) {
      setParts.push(`max_bet_after_mid_time = $${paramCount++}`);
      values.push(maxBetAfterMidTime);
    }
    if (isActive !== null) {
      setParts.push(`is_active = $${paramCount++}`);
      values.push(isActive);
    }

    if (setParts.length === 0) {
      // No updates to make
      return findById(gameId);
    }

    values.push(gameId);
    const query = `UPDATE games SET ${setParts.join(", ")} WHERE id = $${paramCount} RETURNING *`;

    const result = await pool.query(query, values);
    return result.rows[0];
  } catch (error) {
    console.error("Error updating game:", error);
    throw error;
  }
}

module.exports = {
  getAllActive,
  findById,
  getOrCreateTodaySession,
  getOrCreateSession,
  getSessionById,
  getGameWithTodaySession,
  getAllWithTodaySessions,
  isGameOpen,
  getResults,
  create,
  update,
  deleteGame,
  getChartData,
};

/**
 * Delete game permanently
 * @param {number} gameId - Game ID
 * @returns {Promise<boolean>} True if deleted
 */
async function deleteGame(gameId) {
  try {
    const result = await pool.query(
      "DELETE FROM games WHERE id = $1 RETURNING id",
      [gameId],
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error("Error deleting game:", error);
    throw error;
  }
}

/**
 * Get chart data (matrix of games vs dates)
 * @param {number} days - Number of days to look back
 * @returns {Promise<Object>} Chart data structure
 */
async function getChartData(days = 30) {
  try {
    // 1. Get all active games for columns
    const gamesResult = await pool.query(
      "SELECT id, name FROM games WHERE is_active = true ORDER BY open_time ASC",
    );
    const games = gamesResult.rows;

    // 2. Get session data for the date range
    // Calculate cutoff date in JS
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffDateStr = cutoffDate.toISOString().split("T")[0];

    // We want dates in DESC order
    const result = await pool.query(
      `SELECT 
        gs.session_date,
        gs.winning_number,
        gs.game_id
       FROM game_sessions gs
       JOIN games g ON gs.game_id = g.id
       WHERE g.is_active = true 
       AND gs.status = 'completed'
       AND gs.session_date >= $1
       ORDER BY gs.session_date DESC`,
      [cutoffDateStr],
    );

    // 3. Process data into rows
    // Map: DateString -> { gameId: winningNumber }
    const dateMap = new Map();

    result.rows.forEach((row) => {
      // Format date to YYYY-MM-DD to ensure key consistency
      // Date object from pg might need formatting
      const dateKey = new Date(row.session_date).toISOString().split("T")[0];

      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, {});
      }

      const dayData = dateMap.get(dateKey);
      dayData[row.game_id] = row.winning_number;
    });

    // Sort dates descending
    const sortedDates = Array.from(dateMap.keys()).sort((a, b) =>
      b.localeCompare(a),
    );

    const chartData = sortedDates.map((date) => {
      return {
        date,
        results: dateMap.get(date),
      };
    });

    return {
      games,
      chartData,
    };
  } catch (error) {
    console.error("Error getting chart data:", error);
    throw error;
  }
}
