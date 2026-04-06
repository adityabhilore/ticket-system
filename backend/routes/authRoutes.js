const express = require('express');
const router = express.Router();
const db = require('../config/database');

const {
  login,
  register,
  getCurrentUser,
  loginValidationRules,
  registerValidationRules,
} = require('../controllers/authController');

const { verifyToken } = require('../middleware/authMiddleware');
const { handleValidationErrors } = require('../middleware/validationMiddleware');

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post(
  '/login',
  loginValidationRules(),
  handleValidationErrors,
  login
);

/**
 * POST /api/auth/register
 * Register new user (Manager only)
 */
router.post(
  '/register',
  registerValidationRules(),
  handleValidationErrors,
  register
);

/**
 * GET /api/auth/me
 * Get current user information
 */
router.get('/me', verifyToken, getCurrentUser);

/**
 * GET /api/auth/notifications
 * Get all notifications for current user
 */
router.get('/notifications', verifyToken, async (req, res) => {
  try {
    const { userId, role, companyId } = req;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const requestedLimit = parseInt(req.query.limit, 10) || 25;
    const limit = Math.min(Math.max(requestedLimit, 1), 100);
    const offset = (page - 1) * limit;

    let whereSql = `
      FROM Notifications n
      LEFT JOIN Tickets t ON t.TicketID = n.TicketID
      WHERE n.UserID = ?
    `;
    const params = [userId];

    if (role === 'Client') {
      whereSql += ' AND (n.TicketID IS NULL OR t.CompanyID = ?)';
      params.push(companyId);
    }

    if (role === 'Engineer') {
      whereSql += ' AND (n.TicketID IS NULL OR t.AssignedTo = ?)';
      params.push(userId);
    }

    const countSql = `SELECT COUNT(*) AS total ${whereSql}`;
    const countResult = await db.query(countSql, params);
    const total = countResult[0]?.[0]?.total || 0;

    const sql = `
      SELECT n.NotificationID, n.TicketID, n.Type, n.Title, n.Message, n.IsRead, n.CreatedAt
      ${whereSql}
      ORDER BY n.CreatedAt DESC
      LIMIT ? OFFSET ?
    `;

    const result = await db.query(sql, [...params, limit, offset]);
    const data = result[0] || [];

    res.json({
      data,
      page,
      limit,
      total,
      hasMore: offset + data.length < total,
    });
  } catch(err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch notifications' });
  }
});

/**
 * GET /api/auth/notifications/unread
 * Get unread notification count
 */
router.get('/notifications/unread', verifyToken, async (req, res) => {
  try {
    const { userId, role, companyId } = req;

    let sql = `
      SELECT COUNT(*) as count
      FROM Notifications n
      LEFT JOIN Tickets t ON t.TicketID = n.TicketID
      WHERE n.UserID = ? AND n.IsRead = 0
    `;
    const params = [userId];

    if (role === 'Client') {
      sql += ' AND (n.TicketID IS NULL OR t.CompanyID = ?)';
      params.push(companyId);
    }

    if (role === 'Engineer') {
      sql += ' AND (n.TicketID IS NULL OR t.AssignedTo = ?)';
      params.push(userId);
    }

    const result = await db.query(sql, params);
    const count = result[0][0]?.count || 0;
    res.json({ unreadCount: count });
  } catch(err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch unread count' });
  }
});

/**
 * PUT /api/auth/notifications/:notificationId/read
 * Mark notification as read
 */
router.put('/notifications/:notificationId/read', verifyToken, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const { userId } = req;
    const result = await db.query(
      `UPDATE Notifications
       SET IsRead = 1, ReadAt = NOW()
       WHERE NotificationID = ? AND UserID = ?`,
      [notificationId, userId]
    );

    const affectedRows = result[0]?.affectedRows || result.affectedRows || 0;
    if (affectedRows === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ success: true });
  } catch(err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to mark notification as read' });
  }
});

/**
 * GET /api/auth/emails
 * Get all email notifications for current user (Engineer)
 * Shows emails like TICKET_REOPENED, TICKET_ASSIGNED, etc.
 */
router.get('/emails', verifyToken, async (req, res) => {
  try {
    const { userId, role } = req;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const requestedLimit = parseInt(req.query.limit, 10) || 25;
    const limit = Math.min(Math.max(requestedLimit, 1), 100);
    const offset = (page - 1) * limit;

    // Only Engineers can view their received emails
    if (role !== 'Engineer') {
      return res.status(403).json({ message: 'Only engineers can view email notifications' });
    }

    const countSql = `
      SELECT COUNT(*) AS total
      FROM EmailNotifications e
      LEFT JOIN Tickets t ON t.TicketID = e.TicketID
      WHERE e.RecipientRole = 'Engineer' AND (t.AssignedTo = ? OR e.TicketID IS NULL)
    `;
    const countResult = await db.query(countSql, [userId]);
    const total = countResult[0]?.[0]?.total || 0;

    const sql = `
      SELECT 
        e.NotificationID as EmailNotificationID,
        e.TicketID,
        e.TemplateType,
        e.RecipientEmail,
        e.RecipientName,
        e.Subject,
        e.EmailBody,
        e.Status,
        e.SentAt,
        t.Title as TicketTitle,
        CONCAT('#', t.TicketID) as TicketNumber
      FROM EmailNotifications e
      LEFT JOIN Tickets t ON t.TicketID = e.TicketID
      WHERE e.RecipientRole = 'Engineer' AND e.RecipientEmail IN 
        (SELECT Email FROM Users WHERE UserID = ?)
      ORDER BY e.SentAt DESC
      LIMIT ? OFFSET ?
    `;

    const result = await db.query(sql, [userId, limit, offset]);
    const data = result[0] || [];

    res.json({
      data,
      page,
      limit,
      total,
      hasMore: offset + data.length < total,
    });
  } catch(err) {
    console.error('Failed to fetch emails:', err);
    res.status(500).json({ message: 'Failed to fetch email notifications' });
  }
});

/**
 * POST /api/auth/test-email-trigger (DEVELOPMENT ONLY)
 * Manually trigger email notifications for testing
 * Usage: POST /api/auth/test-email-trigger with { ticketId: 64 }
 */
router.post('/test-email-trigger', verifyToken, async (req, res) => {
  try {
    // Only allow in development
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({
        success: false,
        message: 'Test endpoint not available in production',
      });
    }

    const { ticketId } = req.body;

    if (!ticketId) {
      return res.status(400).json({
        success: false,
        message: 'ticketId is required',
      });
    }

    const { notifyTicketCreated } = require('../services/notificationService');

    console.log(`\n🧪 [TEST] Manually triggering email notifications for ticket #${ticketId}\n`);
    await notifyTicketCreated(ticketId);

    res.json({
      success: true,
      message: `Email notifications triggered for ticket #${ticketId}. Check EmailNotifications table.`,
    });
  } catch (err) {
    console.error('Test email trigger error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger email notifications',
      error: err.message,
    });
  }
});

module.exports = router;
