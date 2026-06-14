const jwt = require('jsonwebtoken');
const User = require('../models/user');

const protect = async (req, res, next) => {
  let token;
  
  // Check for token in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  
  // If no token, deny access
  if (!token) {
    return res.status(401).json({ message: 'Not authorized, token missing' });
  }
  
  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user still exists
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'Not authorized, user no longer exists' });
    }
    
    // Check if user changed password after token was issued
    if (user.changedPasswordAfter(decoded.iat)) {
      return res.status(401).json({ message: 'Not authorized, password recently changed' });
    }
    
    // Grant access to protected route
    req.user = user;
    next();
  } catch (err) {
    // Log unauthorized access attempts
    console.warn(`Unauthorized access attempt: ${err.message} | IP: ${req.ip} | Path: ${req.path}`);
    
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Not authorized, invalid token' });
    }
    
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Not authorized, token expired' });
    }
    
    return res.status(401).json({ message: 'Not authorized, token invalid' });
  }
};

// Admin middleware - checks if user has admin role
const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Admin privileges required.' });
  }
};

module.exports = { protect, admin };
