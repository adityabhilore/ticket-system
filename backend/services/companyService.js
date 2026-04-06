const { query } = require('../config/database');

/**
 * Get company by ID
 */
const getCompanyById = async (companyId) => {
  const result = await query(
    `SELECT CompanyID, Name, Email, Status, CreatedAt
     FROM Companies WHERE CompanyID = ? AND IFNULL(IsDeleted, 0) = 0`,
    [companyId]
  );

  return result[0][0] || null;
};

/**
 * Get all companies
 */
const getAllCompanies = async () => {
  const result = await query(
    `SELECT CompanyID, Name, Email, Status, CreatedAt
     FROM Companies
     WHERE Status = 'Active' AND IFNULL(IsDeleted, 0) = 0
     ORDER BY Name`
  );

  return result[0] || [];
};

/**
 * Create company
 */
const createCompany = async (name, email) => {
  const result = await query(
    `INSERT INTO Companies (Name, Email, Status, CreatedAt)
     VALUES (?, ?, 'Active', NOW())`,
    [name, email]
  );

  return result[0] && result[0].affectedRows > 0;
};

/**
 * Update company
 */
const updateCompany = async (companyId, name, email, status) => {
  const result = await query(
    `UPDATE Companies
     SET Name = ?, Email = ?, Status = ?
     WHERE CompanyID = ? AND IFNULL(IsDeleted, 0) = 0`,
    [name, email, status, companyId]
  );

  return result[0] && result[0].affectedRows > 0;
};

/**
 * Delete company
 */
const deleteCompany = async (companyId) => {
  const result = await query(
    `UPDATE Companies
     SET IsDeleted = 1, DeletedAt = NOW()
     WHERE CompanyID = ? AND IFNULL(IsDeleted, 0) = 0`,
    [companyId]
  );

  return result[0] && result[0].affectedRows > 0;
};

module.exports = {
  getCompanyById,
  getAllCompanies,
  createCompany,
  updateCompany,
  deleteCompany,
};
