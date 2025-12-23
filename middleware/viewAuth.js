/**
 * View Authentication Middleware
 * Redirects unauthenticated users to login page
 */

const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Require authentication for view routes
 * Redirects to /login if not authenticated
 */
async function requireAuth(req, res, next) {
  try {
    // Get token from cookie first, then from Authorization header
    let token = req.cookies.token;
    
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }
    
    if (!token) {
      // Not authenticated, redirect to login
      return res.redirect('/login');
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await User.findById(decoded.userId);
    
    if (!user || !user.is_active) {
      // Invalid user, redirect to login
      return res.redirect('/login');
    }
    
    // Attach user to request
    req.user = user;
    next();
    
  } catch (error) {
    // Token invalid or expired, redirect to login
    return res.redirect('/login');
  }
}

/**
 * Redirect authenticated users away from auth pages
 * Used for /login and /signup
 */
async function redirectIfAuth(req, res, next) {
  try {
    // Get token from cookie
    const token = req.cookies.token;
    
    if (!token) {
      // Not authenticated, continue to login/signup page
      return next();
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (user && user.is_active) {
      // Already authenticated, redirect to home
      return res.redirect('/home');
    }
    
    // Token invalid, continue to login/signup page
    next();
    
  } catch (error) {
    // Token invalid, continue to login/signup page
    next();
  }
}

/**
 * Require admin role for view routes
 * Redirects to /home if not admin
 */
async function requireAdmin(req, res, next) {
  try {
    // First check authentication
    const token = req.cookies.token;
    
    if (!token) {
      return res.redirect('/login');
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user || !user.is_active) {
      return res.redirect('/login');
    }
    
    if (user.role !== 'admin') {
      // Not admin, redirect to home
      return res.redirect('/home');
    }
    
    // Attach user to request
    req.user = user;
    next();
    
  } catch (error) {
    return res.redirect('/login');
  }
}

module.exports = {
  requireAuth,
  redirectIfAuth,
  requireAdmin
};
