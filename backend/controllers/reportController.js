const {
  getTicketStats,
  getSLAComplianceReport,
  getTicketsByPriority,
  getTicketsByStatus,
  getEngineerPerformance,
  getTicketsPerDay,
  getManagerDashboard,
  getTicketTrend,
  getAllTicketsByStatus,
  getAllTicketsByPriority,
  getRecentTickets,
  getEngineerStats,
} = require('../services/reportService');

/**
 * Get dashboard statistics
 */
const getDashboard = async (req, res) => {
  try {
    const { companyId, role } = req;

    if (role === 'Manager') {
      // Manager dashboard
      const stats = await getManagerDashboard();
      return res.status(200).json({
        success: true,
        data: stats,
      });
    }

    // Client and Engineer dashboard
    const ticketStats = await getTicketStats(companyId);
    const slaReport = await getSLAComplianceReport(companyId);
    const byStatus = await getTicketsByStatus(companyId);
    const byPriority = await getTicketsByPriority(companyId);

    res.status(200).json({
      success: true,
      data: {
        ticketStats,
        slaReport,
        byStatus,
        byPriority,
      },
    });
  } catch (err) {
    console.error('Get dashboard error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data',
    });
  }
};

/**
 * Get SLA compliance report
 */
const getSLAReport = async (req, res) => {
  try {
    const { companyId } = req;

    const report = await getSLAComplianceReport(companyId);

    res.status(200).json({
      success: true,
      data: report,
    });
  } catch (err) {
    console.error('Get SLA report error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch SLA report',
    });
  }
};

/**
 * Get engineer performance report
 */
const getPerformanceReport = async (req, res) => {
  try {
    const { companyId, role } = req;

    if (role !== 'Manager') {
      return res.status(403).json({
        success: false,
        message: 'Only managers can view performance reports',
      });
    }

    const performance = await getEngineerPerformance(companyId);

    res.status(200).json({
      success: true,
      data: performance,
    });
  } catch (err) {
    console.error('Get performance report error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch performance report',
    });
  }
};

/**
 * Get trending data
 */
const getTrendingData = async (req, res) => {
  try {
    const { companyId } = req;

    const ticketsPerDay = await getTicketsPerDay(companyId);

    res.status(200).json({
      success: true,
      data: ticketsPerDay,
    });
  } catch (err) {
    console.error('Get trending data error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trending data',
    });
  }
};

/**
 * Get ticket trend for last 7 days
 */
const getTicketTrendData = async (req, res) => {
  try {
    const data = await getTicketTrend();
    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    console.error('Get ticket trend error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch ticket trend data',
    });
  }
};

/**
 * Get tickets by status
 */
const getTicketsByStatusData = async (req, res) => {
  try {
    const data = await getAllTicketsByStatus();
    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    console.error('Get by status error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tickets by status',
    });
  }
};

/**
 * Get tickets by priority
 */
const getTicketsByPriorityData = async (req, res) => {
  try {
    const data = await getAllTicketsByPriority();
    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    console.error('Get by priority error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tickets by priority',
    });
  }
};

/**
 * Get recent tickets
 */
const getRecentTicketsData = async (req, res) => {
  try {
    const data = await getRecentTickets();
    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    console.error('Get recent tickets error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent tickets',
    });
  }
};

/**
 * Get engineer stats
 */
const getEngineerStatsData = async (req, res) => {
  try {
    const data = await getEngineerStats();
    res.status(200).json({
      success: true,
      data,
    });
  } catch (err) {
    console.error('Get engineer stats error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch engineer stats',
    });
  }
};

module.exports = {
  getDashboard,
  getSLAReport,
  getPerformanceReport,
  getTrendingData,
  getTicketTrendData,
  getTicketsByStatusData,
  getTicketsByPriorityData,
  getRecentTicketsData,
  getEngineerStatsData,
};
