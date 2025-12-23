/**
 * Authentication Controller
 * Handles password-based and OTP-based login
 */

const User = require('../models/User');
const { createOTP, verifyOTP } = require('../utils/otpService');
const { generateToken } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

/**
 * Unified Login/Register
 * If phone exists: verify password and login
 * If phone doesn't exist: create account and login
 * POST /api/auth/login
 */
async function login(req, res) {
  try {
    const { phone, password } = req.body;
    
    // Validation
    if (!phone || !/^[0-9]{10}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number. Must be 10 digits.'
      });
    }
    
    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }
    
    // Check if user exists
    let user = await User.findByPhone(phone);
    
    if (user) {
      // USER EXISTS - Verify password and login
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      
      if (!isValidPassword) {
        return res.status(401).json({
          success: false,
          message: 'Invalid phone or password'
        });
      }
      
      // Check if user is active
      if (!user.is_active) {
        return res.status(403).json({
          success: false,
          message: 'Account is inactive. Contact support.'
        });
      }
      
    } else {
      // USER DOESN'T EXIST - Create new account (auto-register)
      // Use phone number as default name
      const defaultName = `User ${phone.slice(-4)}`;
      
      user = await User.create({
        phone,
        name: defaultName,
        password
      });
      
      console.log(`✅ New user registered: ${phone}`);
    }
    
    // Generate JWT token
    const token = generateToken(user);
    
    // Set httpOnly cookie with 30-day expiry
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      sameSite: 'lax'
    });
    
    return res.json({
      success: true,
      message: user.id ? 'Login successful' : 'Account created successfully',
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
    console.error('Error in login/register:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to login'
    });
  }
}

/**
 * Register new user
 * POST /api/auth/register
 */
async function register(req, res) {
  try {
    const { phone, password, name } = req.body;
    
    // Validation
    if (!phone || !/^[0-9]{10}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number. Must be 10 digits.'
      });
    }
    
    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Name is required'
      });
    }
    
    // Check if user already exists
    const existingUser = await User.findByPhone(phone);
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Phone number already registered'
      });
    }
    
    // Create user
    const user = await User.create({
      phone,
      name,
      password
    });
    
    // Generate JWT token
    const token = generateToken(user);
    
    // Set httpOnly cookie with 30-day expiry
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      sameSite: 'lax'
    });
    
    return res.status(201).json({
      success: true,
      message: 'Registration successful',
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
    console.error('Error registering:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to register'
    });
  }
}

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
      
      // Create user with a random password
      user = await User.create({
        phone,
        name,
        password: Math.random().toString(36).slice(-8)
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
    
    // Set httpOnly cookie with 30-day expiry
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      sameSite: 'lax'
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
        balance: parseFloat(user.balance || 0).toFixed(2),
        winning_balance: parseFloat(user.winning_balance || 0).toFixed(2),
        held_withdrawal_balance: parseFloat(user.held_withdrawal_balance || 0).toFixed(2),
        is_active: user.is_active,
        created_at: user.created_at
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
  login,
  sendOTP,
  verifyOTPAndLogin,
  getCurrentUser,
  logout
};
