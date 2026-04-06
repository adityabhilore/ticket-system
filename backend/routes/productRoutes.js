const express = require('express');
const router = express.Router();
const { verifyToken, authorize } = require('../middleware/authMiddleware');
const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getCompanyProducts,
  assignProductToCompany,
  unassignProductFromCompany,
  getProductStatistics,
  bulkAssignProductsToCompany,
} = require('../controllers/productController');

/**
 * ============================================================================
 * COMPANY PRODUCT ASSIGNMENT ROUTES (Must come BEFORE :productId route!)
 * ============================================================================
 */

// GET /api/products/company/:companyId - Get products assigned to company
router.get('/company/:companyId', verifyToken, getCompanyProducts);

// POST /api/products/company/:companyId/assign/:productId - Assign product to company
router.post('/company/:companyId/assign/:productId', verifyToken, authorize(['Admin']), assignProductToCompany);

// DELETE /api/products/company/:companyId/assign/:productId - Unassign product from company
router.delete('/company/:companyId/assign/:productId', verifyToken, authorize(['Admin']), unassignProductFromCompany);

/**
 * ============================================================================
 * STATISTICS & BULK OPERATIONS (Must come BEFORE :productId route!)
 * ============================================================================
 */

// GET /api/products/stats - Get product statistics
router.get('/stats/overview', verifyToken, authorize(['Admin']), getProductStatistics);

// POST /api/products/bulk/assign - Bulk assign products to company
router.post('/bulk/assign', verifyToken, authorize(['Admin']), bulkAssignProductsToCompany);

/**
 * ============================================================================
 * ADMIN ROUTES (All product management endpoints - Admin only)
 * ============================================================================
 */

// GET /api/products - Get all products
router.get('/', verifyToken, authorize(['Admin']), getAllProducts);

// GET /api/products/:id - Get single product
router.get('/:productId', verifyToken, authorize(['Admin']), getProductById);

// POST /api/products - Create product
router.post('/', verifyToken, authorize(['Admin']), createProduct);

// PUT /api/products/:id - Update product
router.put('/:productId', verifyToken, authorize(['Admin']), updateProduct);

// DELETE /api/products/:id - Delete product (soft delete)
router.delete('/:productId', verifyToken, authorize(['Admin']), deleteProduct);

module.exports = router;
