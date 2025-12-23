/**
 * Admin Middleware
 * Checks if authenticated user has admin role
 */

/**
 * Verify user is admin
 */
function isAdmin(req, res, next) {
  try {
    // Check if user is authenticated (should be called after authenticate middleware)
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    // Check if user has admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }
    
    next();
  } catch (error) {
    console.error('Admin check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authorization failed'
    });
  }
}

module.exports = {
  isAdmin
};
