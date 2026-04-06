const { query } = require('../config/database');
const { hashPassword, comparePassword } = require('../utils/auth');

/**
 * Create user
 */
const createUser = async (name, email, password, companyId, role) => {
  const hashedPassword = await hashPassword(password);

  const result = await query(
    `INSERT INTO Users (Name, Email, PasswordHash, CompanyID, Role, CreatedAt)
     VALUES (?, ?, ?, ?, ?, NOW())`,
    [name, email, hashedPassword, companyId, role]
  );

  return result[0] && result[0].affectedRows > 0;
};

/**
 * Get user by email
 */
const getUserByEmail = async (email) => {
  const result = await query(
    `SELECT UserID, Name, Email, PasswordHash, CompanyID, Role, CreatedAt
     FROM Users WHERE Email = ? AND IFNULL(IsDeleted, 0) = 0`,
    [email]
  );

  return result[0][0] || null;
};

/**
 * Get user by ID
 */
const getUserById = async (userId) => {
  const result = await query(
    `SELECT u.UserID, u.Name, u.Email, u.CompanyID, u.Role, u.CreatedAt, c.Name AS CompanyName
     FROM Users u
     LEFT JOIN Companies c ON c.CompanyID = u.CompanyID
     WHERE u.UserID = ?
       AND IFNULL(u.IsDeleted, 0) = 0
       AND IFNULL(c.IsDeleted, 0) = 0`,
    [userId]
  );

  return result[0][0] || null;
};

/**
 * Get users by company
 */
const getUsersByCompany = async (companyId) => {
  const result = await query(
    `SELECT UserID, Name, Email, CompanyID, Role, CreatedAt
     FROM Users WHERE CompanyID = ? AND IFNULL(IsDeleted, 0) = 0 ORDER BY CreatedAt DESC`,
    [companyId]
  );

  return result[0] || [];
};

/**
 * Get users by company and role
 */
const getUsersByCompanyAndRole = async (companyId, role) => {
  const result = await query(
    `SELECT UserID, Name, Email, CompanyID, Role, CreatedAt
     FROM Users WHERE CompanyID = ? AND Role = ? AND IFNULL(IsDeleted, 0) = 0 ORDER BY Name`,
    [companyId, role]
  );

  return result[0] || [];
};

/**
 * Verify user password
 */
const verifyUserPassword = async (email, password) => {
  const result = await query(
    `SELECT
       u.UserID,
       u.Name,
       u.Email,
       u.PasswordHash,
       u.CompanyID,
       u.Role,
       c.Status AS CompanyStatus,
       c.Name AS CompanyName
     FROM Users u
     LEFT JOIN Companies c ON c.CompanyID = u.CompanyID
     WHERE u.Email = ?
       AND IFNULL(u.IsDeleted, 0) = 0
       AND IFNULL(c.IsDeleted, 0) = 0`,
    [email]
  );

  const user = result[0][0] || null;

  if (!user) {
    console.log('  ❌ User not found in database:', email);
    return null;
  }

  console.log('  ✅ User found:', user.Name);
  console.log('  🔑 Stored hash:', user.PasswordHash.substring(0, 20) + '...');

  const isValid = await comparePassword(password, user.PasswordHash);

  if (!isValid) {
    console.log('  ❌ Password does not match!');
    return null;
  }

  console.log('  ✅ Password matches!');

  return {
    UserID: user.UserID,
    Name: user.Name,
    Email: user.Email,
    CompanyID: user.CompanyID,
    CompanyName: user.CompanyName,
    Role: user.Role,
    CompanyStatus: user.CompanyStatus,
  };
};

/**
 * Update user profile
 */
const updateUserProfile = async (userId, name, email) => {
  const result = await query(
    `UPDATE Users
     SET Name = ?, Email = ?
     WHERE UserID = ? AND IFNULL(IsDeleted, 0) = 0`,
    [name, email, userId]
  );

  return result[0] && result[0].affectedRows > 0;
};

module.exports = {
  createUser,
  getUserByEmail,
  getUserById,
  getUsersByCompany,
  getUsersByCompanyAndRole,
  verifyUserPassword,
  updateUserProfile,
};
