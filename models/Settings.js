/**
 * Settings Model
 * Handles global application settings (KV Store)
 */

const pool = require('../config/database');

/**
 * Get setting by key
 * @param {string} key - Setting key
 * @returns {Promise<string|null>} value
 */
async function get(key) {
  try {
    const result = await pool.query(
      'SELECT value_text FROM settings WHERE key_name = $1',
      [key]
    );
    return result.rows[0] ? result.rows[0].value_text : null;
  } catch (error) {
    console.error(`Error getting setting ${key}:`, error);
    return null;
  }
}

/**
 * Get all settings as object
 * @returns {Promise<Object>} { key: value }
 */
async function getAll() {
  try {
    const result = await pool.query('SELECT key_name, value_text FROM settings');
    const settings = {};
    result.rows.forEach(row => {
      settings[row.key_name] = row.value_text;
    });
    return settings;
  } catch (error) {
    console.error('Error getting all settings:', error);
    return {};
  }
}

/**
 * Set/Update setting
 * @param {string} key - Setting key
 * @param {string} value - Setting value
 * @returns {Promise<Object>} Updated setting
 */
async function set(key, value) {
  try {
    const result = await pool.query(
      `INSERT INTO settings (key_name, value_text)
       VALUES ($1, $2)
       ON CONFLICT (key_name) 
       DO UPDATE SET value_text = EXCLUDED.value_text, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [key, String(value)]
    );
    return result.rows[0];
  } catch (error) {
    console.error(`Error setting ${key}:`, error);
    throw error;
  }
}

module.exports = {
  get,
  getAll,
  set
};
