const {
  submitCSATRating,
  getRatingByTicket,
  getCompanyCSATStats,
  getCSATReportByPeriod,
  getLowScoreTickets,
  getCSATTrendByDate,
  getRatingDistribution,
  getCSATByProduct,
} = require('../services/csatService');

const { query } = require('../config/database');

/**
 * Submit CSAT rating for a ticket
 * POST /api/csat/submit
 */
const submitRating = async (req, res) => {
  try {
    const { ticketId, rating, comment } = req.body;
    const { userId, companyId, role } = req;

    console.log('🎯 CSAT Submit - ticketId:', ticketId, 'userId:', userId, 'rating:', rating, 'role:', role);

    // Validate input
    if (!ticketId || rating === undefined || !comment) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Ticket ID, rating, and comment are required',
      });
    }

    // Validate rating is 1-5
    if (!Number.isInteger(Number(rating)) || rating < 1 || rating > 5) {
      console.log('❌ Invalid rating:', rating);
      return res.status(400).json({
        success: false,
        message: 'Rating must be a number between 1 and 5',
      });
    }

    // Validate comment length
    if (!comment || comment.trim().length < 10) {
      console.log('❌ Comment too short:', comment?.length);
      return res.status(400).json({
        success: false,
        message: 'Comment must be at least 10 characters',
      });
    }

    // Clients can only rate their own company's tickets
    if (role === 'Client') {
      const ticketCheck = await query(
        'SELECT TicketID, CompanyID, CreatedBy, StatusID FROM Tickets WHERE TicketID = ?',
        [ticketId]
      );

      if (!ticketCheck[0] || !ticketCheck[0][0]) {
        console.log('❌ Ticket not found:', ticketId);
        return res.status(404).json({ success: false, message: 'Ticket not found' });
      }

      const ticket = ticketCheck[0][0];
      console.log('✓ Ticket found:', ticket);

      // Client's company must match and client must have created the ticket
      if (ticket.CompanyID !== companyId) {
        console.log('❌ Company mismatch');
        return res.status(403).json({
          success: false,
          message: 'You can only rate your own tickets',
        });
      }

      if (ticket.CreatedBy !== userId) {
        console.log('❌ User did not create ticket');
        return res.status(403).json({
          success: false,
          message: 'You can only rate tickets you created',
        });
      }

      // Ticket must be Resolved (4) or Closed (5)
      console.log('✓ Checking status:', ticket.StatusID, 'Expected: 4 or 5');
      if (ticket.StatusID !== 4 && ticket.StatusID !== 5) {
        console.log('❌ Ticket status not resolved/closed');
        return res.status(400).json({
          success: false,
          message: 'You can only rate resolved or closed tickets',
        });
      }
    }

    // Submit rating
    console.log('⏳ Submitting rating...');
    await submitCSATRating(ticketId, userId, rating, comment);
    console.log('✅ Rating submitted successfully');

    res.status(201).json({
      success: true,
      message: 'Thank you for your feedback!',
    });
  } catch (err) {
    console.error('❌ Submit CSAT rating error:', err.message);
    console.error('Error details:', err);

    if (err.message.includes('already been rated')) {
      return res.status(400).json({
        success: false,
        message: 'This ticket has already been rated',
      });
    }

    if (err.message.includes('must be at least 10 characters')) {
      return res.status(400).json({
        success: false,
        message: 'Comment must be at least 10 characters',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to submit rating: ' + err.message,
    });
  }
};

/**
 * Get CSAT stats for dashboard
 * GET /api/csat/stats
 */
const getStats = async (req, res) => {
  try {
    const { companyId, role } = req;

    // Only Managers and Admins can view CSAT stats
    if (role !== 'Manager' && role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied - only managers can view CSAT statistics',
      });
    }

    // Get overall stats
    const stats = await getCompanyCSATStats(companyId);

    // Get rating distribution
    const distribution = await getRatingDistribution(companyId);

    // Get CSAT by product
    const byProduct = await getCSATByProduct(companyId);

    // Get low score tickets
    const lowScoreTickets = await getLowScoreTickets(companyId, 3);

    res.json({
      success: true,
      data: {
        stats,
        distribution,
        byProduct,
        lowScoreTickets,
      },
    });
  } catch (err) {
    console.error('Get CSAT stats error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch CSAT statistics',
    });
  }
};

/**
 * Get CSAT report with filters
 * GET /api/csat/report?startDate=&endDate=&productId=&priorityId=
 */
const getReport = async (req, res) => {
  try {
    const { companyId, role } = req;
    const { startDate, endDate, productId, priorityId } = req.query;

    // Only Managers and Admins
    if (role !== 'Manager' && role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    // Default to last 30 days
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

    const filters = {};
    if (productId) filters.productId = parseInt(productId, 10);
    if (priorityId) filters.priorityId = parseInt(priorityId, 10);

    const report = await getCSATReportByPeriod(companyId, start, end, filters);
    const trend = await getCSATTrendByDate(companyId, start, end);

    res.json({
      success: true,
      data: {
        report,
        trend,
        dateRange: { start, end },
      },
    });
  } catch (err) {
    console.error('Get CSAT report error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch CSAT report',
    });
  }
};

/**
 * Get low-score tickets for alerts
 * GET /api/csat/low-scores
 */
const getLowScores = async (req, res) => {
  try {
    const { companyId, role } = req;
    const { threshold = 3 } = req.query;

    // Only Managers and Admins
    if (role !== 'Manager' && role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const lowScores = await getLowScoreTickets(companyId, parseInt(threshold, 10));

    res.json({
      success: true,
      data: lowScores,
    });
  } catch (err) {
    console.error('Get low scores error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch low-score tickets',
    });
  }
};

/**
 * Check if ticket can be rated by user
 * GET /api/csat/can-rate/:ticketId
 */
const canRate = async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { userId, companyId, role } = req;

    console.log('🎯 canRate check - ticketId:', ticketId, 'userId:', userId, 'role:', role);

    // Only clients can rate
    if (role !== 'Client') {
      console.log('❌ Not a client, role:', role);
      return res.json({ success: true, data: { canRate: false, reason: 'Only clients can rate' } });
    }

    // Get ticket
    const ticketCheck = await query(
      'SELECT TicketID, CompanyID, CreatedBy, StatusID FROM Tickets WHERE TicketID = ?',
      [ticketId]
    );

    if (!ticketCheck[0] || !ticketCheck[0][0]) {
      console.log('❌ Ticket not found:', ticketId);
      return res.json({ success: true, data: { canRate: false, reason: 'Ticket not found' } });
    }

    const ticket = ticketCheck[0][0];
    console.log('✓ Ticket found:', ticket);

    // Check company match
    if (ticket.CompanyID !== companyId) {
      console.log('❌ Company mismatch. Ticket company:', ticket.CompanyID, 'User company:', companyId);
      return res.json({ success: true, data: { canRate: false, reason: 'Not your ticket' } });
    }

    // Check if user created ticket
    if (ticket.CreatedBy !== userId) {
      console.log('❌ User did not create ticket. Ticket creator:', ticket.CreatedBy, 'Current user:', userId);
      return res.json({ success: true, data: { canRate: false, reason: 'Only ticket creator can rate' } });
    }

    // Check if ticket is resolved or closed
    console.log('✓ Ticket status:', ticket.StatusID, '(4=Resolved, 5=Closed)');
    if (ticket.StatusID !== 4 && ticket.StatusID !== 5) {
      console.log('❌ Ticket not resolved or closed');
      return res.json({
        success: true,
        data: { canRate: false, reason: 'Can only rate resolved or closed tickets' },
      });
    }

    // Check if already rated
    const ratingCheck = await query(
      'SELECT RatingID FROM CSATRatings WHERE TicketID = ? LIMIT 1',
      [ticketId]
    );

    if (ratingCheck[0] && ratingCheck[0].length > 0) {
      console.log('⚠️ Already rated');
      return res.json({
        success: true,
        data: { canRate: false, alreadyRated: true, reason: 'Already rated' },
      });
    }

    console.log('✅ User can rate this ticket');
    res.json({
      success: true,
      data: {
        canRate: true,
        reason: 'Ticket can be rated',
      },
    });
  } catch (err) {
    console.error('Can rate check error:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to check rating eligibility',
    });
  }
};

module.exports = {
  submitRating,
  getStats,
  getReport,
  getLowScores,
  canRate,
};
