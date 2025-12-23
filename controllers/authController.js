/**
 * Authentication Controller
 * Handles OTP-based login and registration
 */

const User = require('../models/User');
const { createOTP, verifyOTP } = require('../utils/otpService');
const { generateToken } = require('../middleware/auth');

/**
 * Send OTP to phone number
 * POST /api/auth/send-otp
 */
async function sendOTP(req, res) {
  try {
    const { phone } = req.body;
    
    // Validation
    if (!phone || !/^[0-9]{10}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number. Must be 10 digits.'
      });
    }
    
    // Send OTP
    const result = await createOTP(phone);
    
    return res.json({
      success: true,
      message: result.message,
      expiresIn: result.expiresIn
    });
    
  } catch (error) {
    console.error('Error sending OTP:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send OTP'
    });
  }
}

/**
 * Verify OTP and login/register
 * POST /api/auth/verify-otp
 */
async function verifyOTPAndLogin(req, res) {
  try {
    const { phone, otp, name } = req.body;
    
    // Validation
    if (!phone || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Phone and OTP are required'
      });
    }
    
    // Verify OTP
    const otpResult = await verifyOTP(phone, otp);
    
    if (!otpResult.success) {
      return res.status(400).json({
        success: false,
        message: otpResult.message
      });
    }
    
    // Check if user exists
    let user = await User.findByPhone(phone);
    
    if (!user) {
      // Register new user
      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Name is required for new users'
        });
      }
      
      // Create user with a default password (OTP-based, so password not used)
      user = await User.create({
        phone,
        name,
        password: Math.random().toString(36).slice(-8) // Random password
      });
    }
    
    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Account is inactive. Contact support.'
      });
    }
    
    // Generate JWT token
    const token = generateToken(user);
    
    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    
    return res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          phone: user.phone,
          name: user.name,
          role: user.role,
          balance: user.balance,
          winning_balance: user.winning_balance
        },
        token
      }
    });
    
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify OTP'
    });
  }
}

/**
 * Get current user
 * GET /api/auth/me
 */
async function getCurrentUser(req, res) {
  try {
    const user = req.user;
    
    return res.json({
      success: true,
      data: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        role: user.role,
        balance: user.balance,
        winning_balance: user.winning_balance,
        held_withdrawal_balance: user.held_withdrawal_balance,
        is_active: user.is_active
      }
    });
    
  } catch (error) {
    console.error('Error getting current user:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get user info'
    });
  }
}

/**
 * Logout
 * POST /api/auth/logout
 */
async function logout(req, res) {
  try {
    // Clear cookie
    res.clearCookie('token');
    
    return res.json({
      success: true,
      message: 'Logged out successfully'
    });
    
  } catch (error) {
    console.error('Error logging out:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to logout'
    });
  }
}

module.exports = {
  sendOTP,
  verifyOTPAndLogin,
  getCurrentUser,
  logout
};
