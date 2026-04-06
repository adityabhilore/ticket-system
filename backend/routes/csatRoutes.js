const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');

const {
  submitRating,
  getStats,
  getReport,
  getLowScores,
  canRate,
} = require('../controllers/csatController');

/**
 * POST /api/csat/submit
 * Submit a CSAT rating for a ticket
 * Body: { ticketId, rating (1-5), comment }
 * Auth: Required (Client)
 */
router.post('/submit', verifyToken, submitRating);

/**
 * GET /api/csat/stats
 * Get overall CSAT statistics and distribution
 * Auth: Required (Manager/Admin only)
 */
router.get('/stats', verifyToken, getStats);

/**
 * GET /api/csat/report
 * Get detailed CSAT report with filters
 * Query: startDate, endDate, productId, priorityId
 * Auth: Required (Manager/Admin only)
 */
router.get('/report', verifyToken, getReport);

/**
 * GET /api/csat/low-scores
 * Get tickets with low satisfaction scores
 * Query: threshold (default 3)
 * Auth: Required (Manager/Admin only)
 */
router.get('/low-scores', verifyToken, getLowScores);

/**
 * GET /api/csat/can-rate/:ticketId
 * Check if user can rate a specific ticket
 * Auth: Required (Client)
 */
router.get('/can-rate/:ticketId', verifyToken, canRate);

module.exports = router;
