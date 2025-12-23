/**
 * Game Model
 * Handles game and game session operations
 */

const pool = require('../config/database');

/**
 * Get all active games
 * @returns {Promise<Array>} Array of active games
 */
async function getAllActive() {
  try {
    const result = await pool.query(
      `SELECT * FROM games 
       WHERE is_active = true 
       ORDER BY open_time ASC`
    );
    return result.rows;
  } catch (error) {
    console.error('Error getting active games:', error);
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
    const result = await pool.query(
      'SELECT * FROM games WHERE id = $1',
      [gameId]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error finding game by ID:', error);
    throw error;
  }
}

/**
 * Get or create today's game session
 * @param {number} gameId - Game ID
 * @returns {Promise<Object>} Game session
 */
async function getOrCreateTodaySession(gameId) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Try to find existing session
    let result = await client.query(
      `SELECT * FROM game_sessions 
       WHERE game_id = $1 AND session_date = $2`,
      [gameId, today]
    );
    
    if (result.rows.length > 0) {
      await client.query('COMMIT');
      return result.rows[0];
    }
    
    // Create new session
    result = await client.query(
      `INSERT INTO game_sessions (game_id, session_date, status) 
       VALUES ($1, $2, 'pending') 
       RETURNING *`,
      [gameId, today]
    );
    
    await client.query('COMMIT');
    return result.rows[0];
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
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
      [sessionId]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting session by ID:', error);
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
      throw new Error('Game not found');
    }
    
    const session = await getOrCreateTodaySession(gameId);
    
    return {
      ...game,
      session
    };
  } catch (error) {
    console.error('Error getting game with session:', error);
    throw error;
  }
}

/**
 * Get all games with today's sessions
 * @returns {Promise<Array>} Array of games with sessions
 */
async function getAllWithTodaySessions() {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const result = await pool.query(
      `SELECT 
        g.*,
        gs.id as session_id,
        gs.session_date,
        gs.winning_number,
        gs.status as session_status,
        gs.result_declared_at
       FROM games g
       LEFT JOIN game_sessions gs ON g.id = gs.game_id AND gs.session_date = $1
       WHERE g.is_active = true
       ORDER BY g.open_time ASC`,
      [today]
    );
    
    return result.rows;
  } catch (error) {
    console.error('Error getting games with sessions:', error);
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
    const currentTime = now.toTimeString().split(' ')[0]; // HH:MM:SS
    
    return currentTime >= game.open_time && currentTime <= game.close_time;
  } catch (error) {
    console.error('Error checking if game is open:', error);
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
      query += ' AND gs.game_id = $1';
      params.push(gameId);
      query += ' ORDER BY gs.session_date DESC LIMIT $2';
      params.push(limit);
    } else {
      query += ' ORDER BY gs.session_date DESC LIMIT $1';
      params.push(limit);
    }
    
    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('Error getting results:', error);
    throw error;
  }
}

/**
 * Create new game (admin only)
 * @param {Object} gameData - Game data
 * @returns {Promise<Object>} Created game
 */
async function create(gameData) {
  const { name, openTime, closeTime } = gameData;
  
  try {
    const result = await pool.query(
      `INSERT INTO games (name, open_time, close_time, is_active) 
       VALUES ($1, $2, $3, true) 
       RETURNING *`,
      [name, openTime, closeTime]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error creating game:', error);
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
  const { name, openTime, closeTime, isActive } = updates;
  
  try {
    const result = await pool.query(
      `UPDATE games 
       SET name = COALESCE($1, name),
           open_time = COALESCE($2, open_time),
           close_time = COALESCE($3, close_time),
           is_active = COALESCE($4, is_active)
       WHERE id = $5
       RETURNING *`,
      [name, openTime, closeTime, isActive, gameId]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Error updating game:', error);
    throw error;
  }
}

module.exports = {
  getAllActive,
  findById,
  getOrCreateTodaySession,
  getSessionById,
  getGameWithTodaySession,
  getAllWithTodaySessions,
  isGameOpen,
  getResults,
  create,
  update
};
