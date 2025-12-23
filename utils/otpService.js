/**
 * OTP Service
 * Handles OTP generation, storage, and verification
 */

const pool = require('../config/database');

/**
 * Generate a random 6-digit OTP
 * @returns {string} 6-digit OTP
 */
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send OTP via SMS (Mock implementation - integrate with SMS provider)
 * @param {string} phone - Phone number
 * @param {string} otp - OTP code
 * @returns {Promise<boolean>} Success status
 */
async function sendOTP(phone, otp) {
  // TODO: Integrate with SMS provider (Twilio, MSG91, etc.)
  // For development, just log the OTP
  console.log(`📱 OTP for ${phone}: ${otp}`);
  
  // Mock SMS sending
  // In production, replace with actual SMS API call:
  // const response = await fetch('SMS_PROVIDER_API', {
  //   method: 'POST',
  //   body: JSON.stringify({ phone, message: `Your OTP is: ${otp}` })
  // });
  
  return true;
}

/**
 * Create and send OTP
 * @param {string} phone - Phone number
 * @returns {Promise<Object>} Result with success status
 */
async function createOTP(phone) {
  try {
    const otp = generateOTP();
    const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES) || 5;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
    
    // Store OTP in database
    await pool.query(
      `INSERT INTO otps (phone, otp_code, expires_at) 
       VALUES ($1, $2, $3)`,
      [phone, otp, expiresAt]
    );
    
    // Send OTP via SMS
    await sendOTP(phone, otp);
    
    return {
      success: true,
      message: 'OTP sent successfully',
      expiresIn: expiryMinutes
    };
  } catch (error) {
    console.error('Error creating OTP:', error);
    throw error;
  }
}

/**
 * Verify OTP
 * @param {string} phone - Phone number
 * @param {string} otpCode - OTP code to verify
 * @returns {Promise<Object>} Verification result
 */
async function verifyOTP(phone, otpCode) {
  try {
    const result = await pool.query(
      `SELECT * FROM otps 
       WHERE phone = $1 AND otp_code = $2 AND is_used = false 
       ORDER BY created_at DESC 
       LIMIT 1`,
      [phone, otpCode]
    );
    
    if (result.rows.length === 0) {
      return {
        success: false,
        message: 'Invalid OTP'
      };
    }
    
    const otp = result.rows[0];
    
    // Check if OTP has expired
    if (new Date() > new Date(otp.expires_at)) {
      return {
        success: false,
        message: 'OTP has expired'
      };
    }
    
    // Mark OTP as used
    await pool.query(
      'UPDATE otps SET is_used = true WHERE id = $1',
      [otp.id]
    );
    
    return {
      success: true,
      message: 'OTP verified successfully'
    };
  } catch (error) {
    console.error('Error verifying OTP:', error);
    throw error;
  }
}

/**
 * Clean up expired OTPs (run periodically)
 * @returns {Promise<number>} Number of deleted OTPs
 */
async function cleanupExpiredOTPs() {
  try {
    const result = await pool.query(
      'DELETE FROM otps WHERE expires_at < CURRENT_TIMESTAMP OR is_used = true'
    );
    return result.rowCount;
  } catch (error) {
    console.error('Error cleaning up OTPs:', error);
    throw error;
  }
}

module.exports = {
  generateOTP,
  sendOTP,
  createOTP,
  verifyOTP,
  cleanupExpiredOTPs
};
