const express = require('express');
const router = express.Router();

const {
  getCompanyDetails,
  getCompanyDetailsById,
  getAllCompaniesData,
  createNewCompany,
  updateCompanyDetails,
  deleteCompanyDetails,
} = require('../controllers/companyController');

const { verifyToken, authorize, companyFilter } = require('../middleware/authMiddleware');

// All company routes require authentication
router.use(verifyToken, companyFilter);

/**
 * GET /api/companies/me
 * Get current company details
 */
router.get(
  '/me',
  authorize(['Client', 'Engineer', 'Manager']),
  getCompanyDetails
);

/**
 * GET /api/companies
 * Get all companies (Admin or Manager only)
 */
router.get('/', authorize(['Manager', 'Admin']), getAllCompaniesData);

/**
 * POST /api/companies
 * Create new company (Admin or Manager)
 */
router.post('/', authorize(['Manager', 'Admin']), createNewCompany);

/**
 * PUT /api/companies/:companyId
 * Update company (Admin only)
 */
router.put('/:companyId', authorize(['Manager']), updateCompanyDetails);

/**
 * GET /api/companies/:companyId
 * Get specific company details (Admin only)
 */
router.get('/:companyId', authorize(['Manager', 'Admin']), getCompanyDetailsById);

/**
 * DELETE /api/companies/:companyId
 * Delete company (Admin only)
 */
router.delete('/:companyId', authorize(['Admin']), deleteCompanyDetails);

module.exports = router;
