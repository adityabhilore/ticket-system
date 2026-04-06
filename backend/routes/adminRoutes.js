const express = require('express');
const router = express.Router();
const db = require('../config/database');

const {
  getSystemStats,
  getAllUsers,
  getUserById,
  createUserByAdmin,
  updateUserByAdmin,
  deleteUser,
  deleteCompany,
  getEngineers,
} = require('../controllers/adminController');

const {
  getAllCompaniesData,
} = require('../controllers/companyController');

const { verifyToken, authorize } = require('../middleware/authMiddleware');

// All admin routes require authentication and Admin role
router.use(verifyToken, authorize(['Admin']));

/**
 * GET /api/admin/stats
 * Get system overview statistics (Admin only)
 */
router.get('/stats', getSystemStats);

/**
 * GET /api/admin/users
 * Get all users in system (Admin only - no company filter)
 */
router.get('/users', getAllUsers);

/**
 * GET /api/admin/users/engineers
 * Get all engineers with active ticket count (Admin only)
 * NOTE: Must come BEFORE /:userId route to avoid parameterized route matching
 */
router.get('/users/engineers', getEngineers);

/**
 * POST /api/admin/users/create
 * Admin creates new user with any company (Admin only)
 */
router.post('/users', createUserByAdmin);
router.post('/users/create', createUserByAdmin);

/**
 * GET /api/admin/users/:userId
 * Get a specific user by ID (Admin only)
 */
router.get('/users/:userId', getUserById);

/**
 * PUT /api/admin/users/:userId
 * Admin updates a user (Admin only)
 */
router.put('/users/:userId', updateUserByAdmin);

/**
 * DELETE /api/admin/users/:userId
 * Admin deletes a user (Admin only)
 */
router.delete('/users/:userId', deleteUser);

/**
 * GET /api/admin/companies
 * Get all companies in system (Admin only)
 */
router.get('/companies', getAllCompaniesData);

/**
 * DELETE /api/admin/companies/:companyId
 * Admin deletes a company (Admin only)
 */
router.delete('/companies/:companyId', deleteCompany);

// ─────────────────────────────────────────────────────────────
// NEW ADMIN ROUTES — Tickets, SLA, Audit Logs, Reports
// ─────────────────────────────────────────────────────────────

/**
 * 2. GET /api/admin/tickets — ALL tickets (admin only)
 */
router.get('/tickets', async (req, res) => {
  try {
    const hasPagination = req.query.page || req.query.limit;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const requestedLimit = parseInt(req.query.limit, 10) || 25;
    const limit = Math.min(Math.max(requestedLimit, 1), 100);
    const offset = (page - 1) * limit;

    const countResult = await db.query(`
      SELECT COUNT(*) AS total
      FROM Tickets t
      JOIN Companies c ON t.CompanyID = c.CompanyID
      JOIN Users creator ON t.CreatedBy = creator.UserID
      LEFT JOIN Users assignee ON t.AssignedTo = assignee.UserID
      WHERE IFNULL(t.IsDeleted, 0) = 0
        AND IFNULL(c.IsDeleted, 0) = 0
        AND IFNULL(creator.IsDeleted, 0) = 0
        AND (assignee.UserID IS NULL OR IFNULL(assignee.IsDeleted, 0) = 0)
    `);
    const total = countResult[0]?.[0]?.total || 0;

    const limitClause = hasPagination ? 'LIMIT ? OFFSET ?' : '';
    const result = await db.query(`
      SELECT
        t.TicketID,
        t.Title,
        t.IsOverdue,
        t.SLADeadline,
        t.CreatedAt,
        t.UpdatedAt,
        s.StatusID,
        s.Name AS StatusName,
        p.PriorityID,
        p.Name AS PriorityName,
        c.CompanyID,
        c.Name AS CompanyName,
        creator.Name  AS CreatedByName,
        assignee.Name AS AssignedToName,
        assignee.UserID AS AssignedToID
      FROM Tickets t
      JOIN Status    s ON t.StatusID   = s.StatusID
      JOIN Priority  p ON t.PriorityID = p.PriorityID
      JOIN Companies c ON t.CompanyID  = c.CompanyID
      JOIN Users creator  ON t.CreatedBy  = creator.UserID
      LEFT JOIN Users assignee ON t.AssignedTo = assignee.UserID
      WHERE IFNULL(t.IsDeleted, 0) = 0
        AND IFNULL(c.IsDeleted, 0) = 0
        AND IFNULL(creator.IsDeleted, 0) = 0
        AND (assignee.UserID IS NULL OR IFNULL(assignee.IsDeleted, 0) = 0)
      ORDER BY t.CreatedAt DESC
      ${limitClause}
    `, hasPagination ? [limit, offset] : []);
    const tickets = result.recordset || result[0] || [];

    if (hasPagination) {
      return res.json({
        success: true,
        data: tickets,
        page,
        limit,
        total,
        hasMore: offset + tickets.length < total,
      });
    }

    res.json({ success: true, data: tickets });
  } catch(err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * 3. PUT /api/admin/tickets/:ticketId/reassign
 */
router.put('/tickets/:ticketId/reassign', async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { engineerId } = req.body;
    const { userId } = req;
    
    console.log('▶ REASSIGN START - TicketID:', ticketId, 'EngineerID:', engineerId);

    const engineerResult = await db.query(
      'SELECT UserID, Name FROM Users WHERE UserID = ? AND Role = ? AND IFNULL(IsDeleted, 0) = 0',
      [engineerId, 'Engineer']
    );
    if (!engineerResult || !Array.isArray(engineerResult[0]) || engineerResult[0].length === 0) {
      console.log('❌ Engineer not found:', engineerId);
      return res.status(404).json({ message: 'Engineer not found' });
    }

    const engineer = engineerResult[0][0];
    console.log('✅ Engineer found:', engineer.Name);

    // Get ticket details for notification
    const ticketResult = await db.query(
      'SELECT TicketID, Title FROM Tickets WHERE TicketID = ? AND IFNULL(IsDeleted, 0) = 0',
      [ticketId]
    );
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }
    const ticket = ticketResult[0][0];
    console.log('✅ Ticket found:', ticket.Title);

    await db.query(
      'UPDATE Tickets SET AssignedTo = ?, UpdatedAt = NOW() WHERE TicketID = ? AND IFNULL(IsDeleted, 0) = 0',
      [engineerId, ticketId]
    );
    console.log('✅ Ticket updated to AssignedTo:', engineerId);

    await db.query(
      `INSERT INTO AuditLogs (TicketID, UserId, Action, NewValue)
       VALUES (?, ?, ?, ?)`,
      [ticketId, userId, `Admin reassigned to ${engineer.Name}`, engineer.Name]
    );
    console.log('✅ AuditLog created');

    // Create notification for the engineer
    console.log('Creating notification for engineer:', engineerId);
    const notifResult = await db.query(
      `INSERT INTO Notifications (UserID, TicketID, Type, Title, Message, IsRead, CreatedAt)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [
        engineerId,
        ticketId,
        'reassigned',
        'Ticket Reassigned',
        `You have been assigned to ticket: ${ticket.Title}`,
        0
      ]
    );
    console.log('Notification created successfully:', notifResult);

    res.json({ success: true, message: `Reassigned to ${engineer.Name}` });
  } catch(err) {
    console.error('ERROR in reassign endpoint:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * 4. DELETE /api/admin/tickets/:ticketId
 */
router.delete('/tickets/:ticketId', async (req, res) => {
  try {
    const { ticketId } = req.params;
    const deletedBy = req.userId || null;
    const result = await db.query(
      `UPDATE Tickets
       SET IsDeleted = 1,
           DeletedAt = NOW(),
           DeletedBy = ?
       WHERE TicketID = ? AND IFNULL(IsDeleted, 0) = 0`,
      [deletedBy, ticketId]
    );

    const affectedRows = result[0]?.affectedRows || result.affectedRows || 0;
    if (affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    res.json({ success: true, message: 'Ticket deleted' });
  } catch(err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * 5. GET /api/admin/sla — get all priorities with SLA hours
 */
router.get('/sla', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT PriorityID, Name AS PriorityName, SLAHours FROM Priority ORDER BY PriorityID ASC'
    );
    
    const priorities = result.recordset || result[0] || [];
    
    res.json({ success: true, data: priorities });
  } catch(err) {
    console.error('SLA fetch error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch SLA settings: ' + err.message });
  }
});

/**
 * 6. PUT /api/admin/sla/:priorityId — update SLA hours
 */
router.put('/sla/:priorityId', async (req, res) => {
  try {
    const { priorityId } = req.params;
    const { slaHours } = req.body;
    const { userId } = req;

    if (!slaHours || slaHours < 1)
      return res.status(400).json({ message: 'SLA hours must be at least 1' });

    await db.query(
      'UPDATE Priority SET SLAHours = ? WHERE PriorityID = ?',
      [slaHours, priorityId]
    );

    await db.query(
      `INSERT INTO AuditLogs (TicketID, UserId, Action, NewValue)
       VALUES (?, ?, ?, ?)`,
      [0, userId, 'Updated SLA hours', `PriorityID ${priorityId} → ${slaHours} hours`]
    );

    res.json({ success: true, message: 'SLA updated successfully' });
  } catch(err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * 7. GET /api/admin/audit-logs — all audit logs
 */
router.get('/audit-logs', async (req, res) => {
  try {
    const { search, userId, limit = 50, offset = 0 } = req.query;

    let where = 'WHERE 1=1';
    let params = [];

    if (userId) {
      where += ' AND al.UserId = ?';
      params.push(userId);
    }
    if (search) {
      where += ' AND (u.Name LIKE ? OR al.Action LIKE ? OR al.TicketID LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const result = await db.query(`
      SELECT
        al.LogID,
        al.TicketID,
        al.Action,
        al.OldValue,
        al.NewValue,
        al.CreatedAt,
        u.Name     AS UserName,
        u.Role     AS UserRole,
        t.Title    AS TicketTitle
      FROM AuditLogs al
      LEFT JOIN Users u   ON al.UserId   = u.UserID
      LEFT JOIN Tickets t ON al.TicketID = t.TicketID
      ${where}
      ORDER BY al.CreatedAt DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), parseInt(offset)]);
    
    const logs = result.recordset || result[0] || [];

    const countResult = await db.query(
      `SELECT COUNT(*) as total FROM AuditLogs al
       LEFT JOIN Users u ON al.UserId = u.UserID ${where}`,
      params
    );
    const countData = countResult.recordset || countResult[0] || [];
    const total = countData[0]?.total || 0;

    res.json({ success: true, data: logs, total });
  } catch(err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * 8. GET /api/admin/reports — all report data
 */
router.get('/reports', async (req, res) => {
  try {
    // Tickets per company
    const byCompanyResult = await db.query(`
      SELECT 
        c.Name AS CompanyName, 
        COUNT(t.TicketID) as count,
        SUM(CASE WHEN s.Name IN ('Resolved', 'Closed') THEN 1 ELSE 0 END) as solvedCount
      FROM Companies c
      LEFT JOIN Tickets t ON c.CompanyID = t.CompanyID AND IFNULL(t.IsDeleted, 0) = 0
      LEFT JOIN Status s ON t.StatusID = s.StatusID
      WHERE IFNULL(c.IsDeleted, 0) = 0
      GROUP BY c.CompanyID, c.Name
      ORDER BY count DESC
    `);
    const byCompany = byCompanyResult.recordset || byCompanyResult[0] || [];

    // Tickets by status
    const byStatusResult = await db.query(`
      SELECT s.Name AS StatusName, COUNT(t.TicketID) as count
      FROM Status s
      LEFT JOIN Tickets t ON s.StatusID = t.StatusID AND IFNULL(t.IsDeleted, 0) = 0
      GROUP BY s.StatusID, s.Name
    `);
    const byStatus = byStatusResult.recordset || byStatusResult[0] || [];

    // Tickets by priority
    const byPriorityResult = await db.query(`
      SELECT p.Name AS PriorityName, COUNT(t.TicketID) as count
      FROM Priority p
      LEFT JOIN Tickets t ON p.PriorityID = t.PriorityID AND IFNULL(t.IsDeleted, 0) = 0
      GROUP BY p.PriorityID, p.Name
      ORDER BY p.PriorityID ASC
    `);
    const byPriority = byPriorityResult.recordset || byPriorityResult[0] || [];

    // Engineer performance
    const engineerPerfResult = await db.query(`
      SELECT
        u.Name,
        COUNT(t.TicketID) as totalAssigned,
        SUM(CASE WHEN s.StatusID = 5 THEN 1 ELSE 0 END) as resolved,
        SUM(CASE WHEN t.IsOverdue = TRUE THEN 1 ELSE 0 END) as overdue
      FROM Users u
      LEFT JOIN Tickets t  ON t.AssignedTo = u.UserID AND IFNULL(t.IsDeleted, 0) = 0
      LEFT JOIN Status  s  ON t.StatusID   = s.StatusID
      WHERE u.Role = 'Engineer' AND IFNULL(u.IsDeleted, 0) = 0
      GROUP BY u.UserID, u.Name
      ORDER BY resolved DESC
    `);
    const engineerPerf = engineerPerfResult.recordset || engineerPerfResult[0] || [];

    // SLA compliance
    const slaResult = await db.query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN IsOverdue = FALSE THEN 1 ELSE 0 END) as onTime
      FROM Tickets
      WHERE StatusID IN (SELECT StatusID FROM Status WHERE StatusID IN (4, 5))
        AND IFNULL(IsDeleted, 0) = 0
    `);
    const slaData = (slaResult.recordset || slaResult[0] || [])[0] || {};
    const slaRate = slaData.total > 0
      ? Math.round((slaData.onTime / slaData.total) * 100)
      : 100;

    // Overdue breakdown: resolved vs pending
    const overdueBreakdownResult = await db.query(`
      SELECT
        SUM(CASE WHEN IsOverdue = 1 AND StatusID IN (4, 5) THEN 1 ELSE 0 END) as overdue_resolved,
        SUM(CASE WHEN IsOverdue = 1 AND StatusID NOT IN (4, 5) THEN 1 ELSE 0 END) as overdue_pending
      FROM Tickets
      WHERE IFNULL(IsDeleted, 0) = 0
    `);
    const overdueBreakdownData = (overdueBreakdownResult.recordset || overdueBreakdownResult[0] || [])[0] || {};
    const overdueResolved = overdueBreakdownData.overdue_resolved || 0;
    const overduePending = overdueBreakdownData.overdue_pending || 0;

    // Average resolution time (hours)
    const avgResolutionResult = await db.query(`
      SELECT
        AVG(TIMESTAMPDIFF(HOUR, CreatedAt, UpdatedAt)) as avgHours
      FROM Tickets
      WHERE StatusID = 5 AND IFNULL(IsDeleted, 0) = 0
    `);
    const avgResolutionData = (avgResolutionResult.recordset || avgResolutionResult[0] || [])[0] || {};
    const avgResolutionTime = avgResolutionData.avgHours ? Math.round(avgResolutionData.avgHours) : 0;

    // Monthly trend (based on date range)
    const days = req.query.days ? parseInt(req.query.days) : 30;
    const monthsNeeded = Math.ceil(days / 30);
    const monthlyResult = await db.query(`
      SELECT
        DATE_FORMAT(CreatedAt, '%b %Y') as month,
        COUNT(*) as count
      FROM Tickets
      WHERE CreatedAt >= DATE_SUB(NOW(), INTERVAL ${monthsNeeded} MONTH)
        AND IFNULL(IsDeleted, 0) = 0
      GROUP BY DATE_FORMAT(CreatedAt, '%Y-%m'), DATE_FORMAT(CreatedAt, '%b %Y')
      ORDER BY DATE_FORMAT(CreatedAt, '%Y-%m') ASC
    `);
    const monthlyTrend = monthlyResult.recordset || monthlyResult[0] || [];

    // Daily ticket trend (last 7 days)
    const dailyTrendResult = await db.query(`
      SELECT
        DATE_FORMAT(CreatedAt, '%a %m/%d') as day,
        COUNT(*) as created,
        SUM(CASE WHEN StatusID = 5 THEN 1 ELSE 0 END) as resolved
      FROM Tickets
      WHERE CreatedAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        AND IFNULL(IsDeleted, 0) = 0
      GROUP BY DATE(CreatedAt), DATE_FORMAT(CreatedAt, '%a %m/%d')
      ORDER BY DATE(CreatedAt) ASC
    `);
    const dailyTicketTrend = dailyTrendResult.recordset || dailyTrendResult[0] || [];

    // Daily SLA compliance trend (last 7 days)
    const dailySLAResult = await db.query(`
      SELECT
        DATE_FORMAT(CreatedAt, '%a %m/%d') as day,
        COUNT(*) as total,
        SUM(CASE WHEN IsOverdue = 0 THEN 1 ELSE 0 END) as onTime
      FROM Tickets
      WHERE StatusID IN (4, 5)
        AND CreatedAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        AND IFNULL(IsDeleted, 0) = 0
      GROUP BY DATE(CreatedAt), DATE_FORMAT(CreatedAt, '%a %m/%d')
      ORDER BY DATE(CreatedAt) ASC
    `);
    const dailySLATrendRaw = dailySLAResult.recordset || dailySLAResult[0] || [];
    
    // Generate all 7 days with matching date format
    const allDays = [];
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const weekday = weekdays[date.getDay()];
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dayStr = `${weekday} ${month}/${day}`;
      allDays.push(dayStr);
    }
    
    // Map the data and fill missing days
    const dailySLATrend = allDays.map(day => {
      const found = dailySLATrendRaw.find(item => item.day === day);
      return {
        day: day,
        slaRate: found ? (found.total > 0 ? Math.round((found.onTime / found.total) * 100) : 0) : 0
      };
    });

    res.json({ success: true, data: {
      byCompany, byStatus, byPriority,
      engineerPerf, slaRate, monthlyTrend, avgResolutionTime,
      overdueResolved, overduePending, dailyTicketTrend, dailySLATrend
    }});
  } catch(err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * 9. GET /api/users/engineers — for reassign dropdown
 */
router.get('/users/engineers', async (req, res) => {
  try {
    const engineers = await db.query(`
      SELECT u.UserID, u.Name, u.Email,
        (SELECT COUNT(*) FROM Tickets
         WHERE AssignedTo = u.UserID
         AND IFNULL(IsDeleted, 0) = 0
         AND StatusID IN (1, 2)
        ) as activeTickets
      FROM Users u
      WHERE Role = 'Engineer' AND IFNULL(u.IsDeleted, 0) = 0
      ORDER BY activeTickets ASC
    `);
    res.json({ success: true, data: engineers[0] || [] });
  } catch(err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
