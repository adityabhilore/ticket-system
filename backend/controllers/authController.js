const { verifyUserPassword, createUser, getUserById } = require('../services/userService');
const { generateToken } = require('../utils/auth');
const { body } = require('express-validator');

/**
 * Login controller
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('🔐 LOGIN ATTEMPT:', email);

    if (!email || !password) {
      console.log('❌ Missing email or password');
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    console.log('⏳ Verifying password for:', email);
    const user = await verifyUserPassword(email, password);

    if (!user) {
      console.log('❌ Login failed - Invalid email or password');
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    console.log('✅ User found:', user.Name, '- Role:', user.Role);

    if (user.CompanyStatus !== 'Active') {
      return res.status(403).json({
        success: false,
        message: 'Company is inactive',
      });
    }

    const token = generateToken(user.UserID, user.CompanyID, user.Role);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          userId: user.UserID,
          name: user.Name,
          email: user.Email,
          companyId: user.CompanyID,
          companyName: user.CompanyName || null,
          role: user.Role,
        },
      },
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Login failed',
    });
  }
};

/**
 * Register controller (only for manager/admin)
 */
const register = async (req, res) => {
  try {
    const { name, email, password, companyId, role } = req.body;

    if (!name || !email || !password || !companyId) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required',
      });
    }

    const success = await createUser(name, email, password, companyId, role || 'Client');

    if (!success) {
      return res.status(400).json({
        success: false,
        message: 'Failed to create user',
      });
    }

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
    });
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
    });
  }
};

/**
 * Get current user info
 */
const getCurrentUser = async (req, res) => {
  try {
    const userId = req.userId;

    const user = await getUserById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (err) {
    console.error('Get current user error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to get user information',
    });
  }
};

/**
 * Validation rules for login
 */
const loginValidationRules = () => {
  return [
    body('email').isEmail().normalizeEmail(),
    body('password').exists().trim(),
  ];
};

/**
 * Validation rules for register
 */
const registerValidationRules = () => {
  return [
    body('name').notEmpty().trim(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('companyId').isNumeric(),
  ];
};

module.exports = {
  login,
  register,
  getCurrentUser,
  loginValidationRules,
  registerValidationRules,
};
