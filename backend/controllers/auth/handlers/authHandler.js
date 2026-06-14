const { generateToken } = require('../utils/tokenUtils');
const { handleLogin, handleRegister, handlePasswordResetRequest, handlePasswordReset } = require('../services/authService');
const { hashToken } = require('../utils/tokenUtils');
const { validateLoginInput, validatePasswordResetInput, validateNewPasswordInput } = require('../utils/validationUtils');
const { logActivity } = require('../../../services/activityLogService');
const logger = require('../../../utils/logger');

// User registration
const register = async (req, res) => {
  const { name, email, password, phone, address, dateOfBirth, ssn, accountType, initialDeposit } = req.body;
  
  try {
    const result = await handleRegister(
      { name, email, password, phone, address, dateOfBirth, ssn },
      { type: accountType, initialDeposit }
    );
    
    if (!result.success) {
      return res.status(400).json({ 
        message: result.message 
      });
    }
    
    // Generate token
    const token = generateToken(result.user._id);
    
    // Set secure cookie
    const cookieOptions = {
      expires: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
      ),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
    };
    
    res.cookie('token', token, cookieOptions);
    
    // Log activity for audit trail
    await logActivity({
      userId: result.user._id,
      action: 'User Registration',
      metadata: {
        email: result.user.email
      },
      correlationId: req.correlationId
    });
    
    res.status(201).json({
      user: result.user,
      token,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      message: 'Internal server error during registration' 
    });
  }
};

// Enhanced login with security improvements
const login = async (req, res) => {
  const { email, password } = req.body;
  
  // Validate email and password presence
  const validation = validateLoginInput(email, password);
  if (!validation.isValid) {
    logger.warn('auth.login.validation_failed', {
      correlationId: req.correlationId,
      reason: validation.message
    });
    return res.status(400).json({ 
      message: validation.message 
    });
  }
  
  try {
    const result = await handleLogin(email, password, req.ip);
    
    if (!result.success) {
      logger.warn('auth.login.failed', {
        correlationId: req.correlationId
      });
      return res.status(401).json({ 
        message: result.message 
      });
    }
    
    // Generate token
    const token = generateToken(result.user._id);
    
    // Set secure cookie
    const cookieOptions = {
      expires: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
      ),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
    };
    
    res.cookie('token', token, cookieOptions);
    
    // Log activity for audit trail
    await logActivity({
      userId: result.user._id,
      action: 'User Login',
      metadata: {
        email: result.user.email,
        ip: req.ip,
        userAgent: req.headers['user-agent']
      },
      correlationId: req.correlationId
    });
    
    const responsePayload = {
      user: result.user,
      token,
    };
    logger.info('auth.login.success', {
      correlationId: req.correlationId,
      userId: result.user._id
    });
    res.json(responsePayload);
  } catch (error) {
    logger.error('auth.login.error', {
      correlationId: req.correlationId,
      error: error.message
    });
    res.status(500).json({ 
      message: 'Internal server error during authentication' 
    });
  }
};

// Return authenticated user profile
const me = (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authorized, user missing' });
  }

  res.json({ user: req.user });
};

// Logout function
const logout = async (req, res) => {
  // Log activity for audit trail (if user is authenticated)
  if (req.user) {
    await logActivity({
      userId: req.user._id,
      action: 'User Logout',
      metadata: {},
      correlationId: req.correlationId
    });
  }
  
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000), // 10 seconds
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
  });
  
  res.json({ message: 'Logged out successfully' });
};

// Password reset request
const forgotPassword = async (req, res) => {
  const { email } = req.body;
  
  // Validate email presence
  const validation = validatePasswordResetInput(email);
  if (!validation.isValid) {
    return res.status(400).json({ 
      message: validation.message 
    });
  }
  
  try {
    const result = await handlePasswordResetRequest(email);
    
    if (!result.success) {
      return res.status(404).json({ 
        message: result.message 
      });
    }
    
    // Send email with reset token (implementation depends on email service)
    // TODO: Implement email sending
    
    res.json({ 
      message: result.message 
    });
  } catch (error) {
    // Clear reset token fields on error
    // Note: This should be handled in the service layer in a more robust implementation
    res.status(500).json({ 
      message: 'Email could not be sent' 
    });
  }
};

// Reset password
const resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;
  
  // Validate password presence
  const validation = validateNewPasswordInput(password);
  if (!validation.isValid) {
    return res.status(400).json({ 
      message: validation.message 
    });
  }
  
  try {
    // Hash token to compare with database
    const hashedToken = hashToken(token);
    
    const result = await handlePasswordReset(hashedToken, password);
    
    if (!result.success) {
      return res.status(400).json({ 
        message: result.message 
      });
    }
    
    // Generate new token
    const newToken = generateToken(result.user._id);
    
    // Log activity for audit trail
    await logActivity({
      userId: result.user._id,
      action: 'Password Reset',
      metadata: {},
      correlationId: req.correlationId
    });
    
    res.json({
      message: result.message,
      token: newToken
    });
  } catch (error) {
    res.status(500).json({ 
      message: 'Internal server error during password reset' 
    });
  }
};

module.exports = {
  register,
  login,
  me,
  logout,
  forgotPassword,
  resetPassword
};
