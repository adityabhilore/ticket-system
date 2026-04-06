const { query } = require('../config/database');
const { hashPassword } = require('../utils/auth');

/**
 * Get system overview statistics
 * Returns: total companies, total users, engineers count, total tickets, overdue tickets
 */
const getSystemStats = async (req, res) => {
  try {
    const [
      companiesResult,
      usersResult,
      roleCountsResult,
      ticketsResult,
      inProgressResult,
      overdueResult,
    ] =
      await Promise.all([
        query('SELECT COUNT(*) AS count FROM Companies WHERE IFNULL(IsDeleted, 0) = 0'),
        query('SELECT COUNT(*) AS count FROM Users WHERE IFNULL(IsDeleted, 0) = 0'),
        query(
          `SELECT Role, COUNT(*) AS count
           FROM Users
           WHERE IFNULL(IsDeleted, 0) = 0
           GROUP BY Role`
        ),
        query('SELECT COUNT(*) AS count FROM Tickets WHERE IFNULL(IsDeleted, 0) = 0'),
        query(
          `SELECT COUNT(*) AS count
           FROM Tickets t
           JOIN Status s ON s.StatusID = t.StatusID
           WHERE s.Name = 'In Progress'
             AND IFNULL(t.IsDeleted, 0) = 0`
        ),
        query(
          `SELECT COUNT(*) AS count
           FROM Tickets t
           JOIN Status s ON s.StatusID = t.StatusID
           WHERE t.SLADeadline < NOW()
             AND IFNULL(t.IsDeleted, 0) = 0
             AND s.Name NOT IN ('Resolved', 'Closed')`
        ),
      ]);

    const getRows = (result) => result.recordset || result[0] || [];
    const getCount = (result) => getRows(result)[0]?.count || 0;

    const totalCompanies = getCount(companiesResult);
    const totalUsers = getCount(usersResult);
    const totalTickets = getCount(ticketsResult);
    const inProgressTickets = getCount(inProgressResult);
    const overdueTickets = getCount(overdueResult);

    const roleCounts = getRows(roleCountsResult).reduce((acc, row) => {
      acc[row.Role] = row.count;
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      data: {
        totalCompanies,
        totalUsers,
        adminCount: roleCounts.Admin || 0,
        managerCount: roleCounts.Manager || 0,
        engineerCount: roleCounts.Engineer || 0,
        clientCount: roleCounts.Client || 0,
        engineers: roleCounts.Engineer || 0,
        managers: roleCounts.Manager || 0,
        clients: roleCounts.Client || 0,
        totalTickets,
        inProgressTickets,
        overdue: overdueTickets,
        overdueTickets,
      },
    });
  } catch (err) {
    console.error('Get system stats error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch system statistics',
    });
  }
};

/**
 * Get all users in system (no company filter)
 */
const getAllUsers = async (req, res) => {
  try {
    const result = await query(
      `SELECT
         u.UserID,
         u.Name,
         u.Email,
         u.Role,
         u.CompanyID,
         u.CreatedAt,
         c.Name AS Company
       FROM Users u
       LEFT JOIN Companies c ON c.CompanyID = u.CompanyID
       WHERE IFNULL(u.IsDeleted, 0) = 0
         AND IFNULL(c.IsDeleted, 0) = 0
       ORDER BY u.CreatedAt DESC`
    );

    res.status(200).json({
      success: true,
      data: (result.recordset || []).map((user) => ({
        ...user,
        UserId: user.UserID,
        CompanyId: user.CompanyID,
        CompanyName: user.Company || 'N/A',
        company: user.Company || 'N/A',
      })),
    });
  } catch (err) {
    console.error('Get all users error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
    });
  }
};

/**
 * Admin creates a new user with role and company
 */
const createUserByAdmin = async (req, res) => {
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
    const existingUserResult = await query(
      'SELECT UserID FROM Users WHERE Email = ? AND IFNULL(IsDeleted, 0) = 0',
      [email]
    );

    if (existingUserResult.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email already in use',
      });
    }

    // Check if company exists
    const companyResult = await query(
      'SELECT CompanyID FROM Companies WHERE CompanyID = ? AND IFNULL(IsDeleted, 0) = 0',
      [companyId]
    );

    if (companyResult.recordset.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Company not found',
      });
    }

    const hashedPassword = await hashPassword(password);

    // Create user
    await query(
      `INSERT INTO Users (Name, Email, PasswordHash, CompanyID, Role, CreatedAt)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [name, email, hashedPassword, companyId, role]
    );

    res.status(201).json({
      success: true,
      message: `User ${name} created successfully`,
      data: {
        name,
        email,
        role,
        companyId,
      },
    });
  } catch (err) {
    console.error('Create user by admin error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to create user',
    });
  }
};

/**
 * Admin deletes a user
 */
const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const deletedBy = req.userId || null;

    // Check if user exists
    const userResult = await query(
      'SELECT UserID, Role FROM Users WHERE UserID = ? AND IFNULL(IsDeleted, 0) = 0',
      [userId]
    );

    if (userResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Prevent deletion of Admin users
    if (userResult.recordset[0].Role === 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete Admin users',
      });
    }

    // Soft delete user
    await query(
      `UPDATE Users
       SET IsDeleted = 1,
           DeletedAt = NOW(),
           DeletedBy = ?
       WHERE UserID = ? AND IFNULL(IsDeleted, 0) = 0`,
      [deletedBy, userId]
    );

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (err) {
    console.error('Delete user error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
    });
  }
};

/**
 * Admin deletes a company
 */
const deleteCompany = async (req, res) => {
  try {
    const { companyId } = req.params;
    const deletedBy = req.userId || null;

    // Check if company exists
    const companyResult = await query(
      'SELECT CompanyID FROM Companies WHERE CompanyID = ? AND IFNULL(IsDeleted, 0) = 0',
      [companyId]
    );

    if (companyResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Company not found',
      });
    }

    // Soft delete all users in this company
    await query(
      `UPDATE Users
       SET IsDeleted = 1,
           DeletedAt = NOW(),
           DeletedBy = ?
       WHERE CompanyID = ? AND IFNULL(IsDeleted, 0) = 0`,
      [deletedBy, companyId]
    );

    // Soft delete the company
    await query(
      `UPDATE Companies
       SET IsDeleted = 1,
           DeletedAt = NOW(),
           DeletedBy = ?
       WHERE CompanyID = ? AND IFNULL(IsDeleted, 0) = 0`,
      [deletedBy, companyId]
    );

    res.status(200).json({
      success: true,
      message: 'Company and associated users deleted successfully',
    });
  } catch (err) {
    console.error('Delete company error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to delete company',
    });
  }
};

/**
 * Get a specific user by ID with company details
 */
const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await query(
      `SELECT
         u.UserID,
         u.Name,
         u.Email,
         u.Role,
         u.CompanyID,
         u.CreatedAt,
         c.Name AS CompanyName
       FROM Users u
       LEFT JOIN Companies c ON c.CompanyID = u.CompanyID
       WHERE u.UserID = ?
         AND IFNULL(u.IsDeleted, 0) = 0
         AND IFNULL(c.IsDeleted, 0) = 0`,
      [userId]
    );

    if (!result.recordset || result.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const user = result.recordset[0];

    res.status(200).json({
      success: true,
      data: {
        UserID: user.UserID,
        Name: user.Name,
        Email: user.Email,
        Role: user.Role,
        CompanyID: user.CompanyID,
        CompanyName: user.CompanyName || 'N/A',
        CreatedAt: user.CreatedAt,
      },
    });
  } catch (err) {
    console.error('Get user by ID error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user details',
    });
  }
};

/**
 * Admin updates a user's information
 */
const updateUserByAdmin = async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, email, role, companyId } = req.body;

    // Validation
    if (!name || !email || !role || !companyId) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, role, and companyId are required',
      });
    }

    // Check if user exists
    const userResult = await query(
      'SELECT UserID, Role FROM Users WHERE UserID = ? AND IFNULL(IsDeleted, 0) = 0',
      [userId]
    );

    if (userResult.recordset.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Check if company exists
    const companyResult = await query(
      'SELECT CompanyID FROM Companies WHERE CompanyID = ? AND IFNULL(IsDeleted, 0) = 0',
      [companyId]
    );

    if (companyResult.recordset.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Company not found',
      });
    }

    // Check if new email is already taken by another user
    const emailResult = await query(
      'SELECT UserID FROM Users WHERE Email = ? AND UserID != ? AND IFNULL(IsDeleted, 0) = 0',
      [email, userId]
    );

    if (emailResult.recordset.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email already in use',
      });
    }

    // Update user
    await query(
      `UPDATE Users
       SET Name = ?, Email = ?, Role = ?, CompanyID = ?
       WHERE UserID = ? AND IFNULL(IsDeleted, 0) = 0`,
      [name, email, role, companyId, userId]
    );

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: {
        UserID: userId,
        name,
        email,
        role,
        companyId,
      },
    });
  } catch (err) {
    console.error('Update user by admin error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
    });
  }
};

/**
 * Get all engineers with their active ticket counts
 */
const getEngineers = async (req, res) => {
  try {
    const result = await query(
      `SELECT
         u.UserID,
         u.Name,
         u.Email,
         u.Role,
         u.CompanyID,
         c.Name AS CompanyName,
         COALESCE(COUNT(t.TicketID), 0) AS activeTickets
       FROM Users u
       LEFT JOIN Companies c ON c.CompanyID = u.CompanyID
       LEFT JOIN Tickets t ON t.AssignedTo = u.UserID AND t.StatusID NOT IN (3, 4) AND IFNULL(t.IsDeleted, 0) = 0
       WHERE u.Role = 'Engineer'
         AND IFNULL(u.IsDeleted, 0) = 0
         AND IFNULL(c.IsDeleted, 0) = 0
       GROUP BY u.UserID, u.Name, u.Email, u.Role, u.CompanyID, c.Name
       ORDER BY u.Name ASC`
    );

    res.status(200).json({
      success: true,
      data: (result.recordset || []).map((engineer) => ({
        UserID: engineer.UserID,
        Name: engineer.Name,
        Email: engineer.Email,
        Role: engineer.Role,
        CompanyID: engineer.CompanyID,
        CompanyName: engineer.CompanyName || 'N/A',
        activeTickets: engineer.activeTickets || 0,
      })),
    });
  } catch (err) {
    console.error('Get engineers error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch engineers',
    });
  }
};

module.exports = {
  getSystemStats,
  getAllUsers,
  getUserById,
  createUserByAdmin,
  updateUserByAdmin,
  deleteUser,
  deleteCompany,
  getEngineers,
};
