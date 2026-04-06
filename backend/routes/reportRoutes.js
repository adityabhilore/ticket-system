const express = require('express');
const router = express.Router();

const {
  getDashboard,
  getSLAReport,
  getPerformanceReport,
  getTrendingData,
  getTicketTrendData,
  getTicketsByStatusData,
  getTicketsByPriorityData,
  getRecentTicketsData,
  getEngineerStatsData,
} = require('../controllers/reportController');

const { verifyToken, authorize, companyFilter } = require('../middleware/authMiddleware');

// All report routes require authentication
router.use(verifyToken, companyFilter);

/**
 * GET /api/reports/dashboard
 * Get dashboard data
 */
router.get(
  '/dashboard',
  authorize(['Client', 'Engineer', 'Manager']),
  getDashboard
);

/**
 * GET /api/reports/sla
 * Get SLA compliance report
 */
router.get(
  '/sla',
  authorize(['Client', 'Engineer', 'Manager']),
  getSLAReport
);

/**
 * GET /api/reports/performance
 * Get engineer performance report (Manager only)
 */
router.get(
  '/performance',
  authorize(['Manager']),
  getPerformanceReport
);

/**
 * GET /api/reports/trending
 * Get trending data
 */
router.get(
  '/trending',
  authorize(['Client', 'Engineer', 'Manager']),
  getTrendingData
);

/**
 * GET /api/reports/ticket-trend
 * Get last 7 days ticket trend
 */
router.get(
  '/ticket-trend',
  authorize(['Manager']),
  getTicketTrendData
);

/**
 * GET /api/reports/by-status
 * Get ticket counts by status
 */
router.get(
  '/by-status',
  authorize(['Manager']),
  getTicketsByStatusData
);

/**
 * GET /api/reports/by-priority
 * Get ticket counts by priority
 */
router.get(
  '/by-priority',
  authorize(['Manager']),
  getTicketsByPriorityData
);

/**
 * GET /api/reports/recent-tickets
 * Get last 5 recent tickets
 */
router.get(
  '/recent-tickets',
  authorize(['Manager']),
  getRecentTicketsData
);

/**
 * GET /api/reports/engineer-stats
 * Get top engineers by resolved count
 */
router.get(
  '/engineer-stats',
  authorize(['Manager']),
  getEngineerStatsData
);

module.exports = router;
