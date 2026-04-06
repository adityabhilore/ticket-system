const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { comparePassword, hashPassword } = require('../utils/auth');

const {
  getCompanyUsers,
  updateProfile,
} = require('../controllers/userController');

const { verifyToken, authorize } = require('../middleware/authMiddleware');

// ============================================================================
// GET /api/users
// Get all users in company
// ============================================================================
router.get('/', verifyToken, authorize(['Client', 'Engineer', 'Manager']), 
  async (req, res) => {
    try {
      const users = await getCompanyUsers(req, res);
    } catch (err) {
      console.error('Get users error:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  });

// ============================================================================
// GET /api/users/engineers
// Get all engineers in company with active ticket counts (for Manager)
// ============================================================================
router.get('/engineers', verifyToken, authorize(['Manager']), async (req, res) => {
  try {
    const engineers = await db.query(`
      SELECT
        u.UserID,
        u.Name,
        u.Email,
        COUNT(t.TicketID) AS activeTickets
      FROM Users u
      LEFT JOIN Tickets t ON t.AssignedTo = u.UserID
        AND t.StatusID IN (
          SELECT StatusID FROM Status
          WHERE Name IN ('Open','In Progress')
        )
      WHERE u.Role = ?
      GROUP BY u.UserID, u.Name, u.Email
      ORDER BY activeTickets ASC
    `, ['Engineer']);

    res.json({ success: true, data: engineers.recordset || [] });
  } catch (err) {
    console.error('Get engineers error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * PUT /api/users/profile
 * Update user profile
 */
router.put(
  '/profile',
  verifyToken,
  authorize(['Client', 'Engineer', 'Manager']),
  updateProfile
);

/**
 * PUT /api/users/:userId/password
 * Change password (self-service)
 */
router.put(
  '/:userId/password',
  verifyToken,
  authorize(['Client', 'Engineer', 'Manager', 'Admin']),
  async (req, res) => {
    try {
      const requestedUserId = Number(req.params.userId);
      const currentUserId = Number(req.userId);
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Current password and new password are required',
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'New password must be at least 6 characters',
        });
      }

      if (requestedUserId !== currentUserId) {
        return res.status(403).json({
          success: false,
          message: 'You can only change your own password',
        });
      }

      const result = await db.query(
        'SELECT PasswordHash FROM Users WHERE UserID = ?',
        [requestedUserId]
      );
      const user = result?.[0]?.[0];

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      const isValid = await comparePassword(currentPassword, user.PasswordHash);
      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: 'Current password is incorrect',
        });
      }

      const newHash = await hashPassword(newPassword);
      const updateResult = await db.query(
        'UPDATE Users SET PasswordHash = ? WHERE UserID = ?',
        [newHash, requestedUserId]
      );

      if (!updateResult?.[0] || updateResult[0].affectedRows === 0) {
        return res.status(500).json({
          success: false,
          message: 'Failed to update password',
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (err) {
      console.error('Change password error:', err.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to change password',
      });
    }
  }
);

/**
 * POST /api/users/create
 * Admin creates new user (Admin or Manager only)
 */
router.post('/create', verifyToken, authorize(['Admin', 'Manager']), async (req, res) => {
  try {
    const { name, email, password, role, companyId } = req.body;

    // Validation
    if (!name || !email || !password || !role || !companyId) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, password, role, and companyId are required',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      });
    }

    // Check if email already exists
    const existingUser = await db.query('SELECT UserID FROM Users WHERE Email = ?', [email]);

    if (existingUser.recordset && existingUser.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email already in use',
      });
    }

    // Check if company exists
    const company = await db.query('SELECT CompanyID FROM Companies WHERE CompanyID = ?', [companyId]);

    if (!company.recordset || company.recordset.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Company not found',
      });
    }

    // Hash password
    const { hashPassword } = require('../utils/auth');
    const hashedPassword = await hashPassword(password);

    // Create user
    const result = await db.query(
      'INSERT INTO Users (Name, Email, PasswordHash, CompanyID, Role, CreatedAt) VALUES (?, ?, ?, ?, ?, NOW())',
      [name, email, hashedPassword, companyId, role]
    );

    if (!result[0] || result[0].affectedRows === 0) {
      return res.status(400).json({
        success: false,
        message: 'Failed to create user',
      });
    }

    res.status(201).json({
      success: true,
      message: `User ${name} created successfully`,
    });
  } catch (err) {
    console.error('Create user error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to create user',
    });
  }
});

module.exports = router;
