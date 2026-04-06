const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { verifyToken, authorize } = require('../middleware/authMiddleware');

// Per-engineer active ticket cap for auto-assignment.
const MAX_ACTIVE_TICKETS_PER_ENGINEER = Number.parseInt(
  process.env.ROUND_ROBIN_MAX_ACTIVE_TICKETS || '5',
  10
);

// ============================================================================
// ROUTE 0: GET /api/tickets/activity
// Get recent activity feed for dashboard
// ============================================================================
router.get('/activity', verifyToken, async (req, res) => {
  try {
    const { role, companyId, userId } = req;
    const { limit, all } = req.query;

    let whereClause = '';
    const params = [];

    if (role === 'Client') {
      whereClause = 'WHERE t.CompanyID = ?';
      params.push(companyId);
    } else if (role === 'Engineer') {
      whereClause = 'WHERE (t.AssignedTo = ? OR t.CreatedBy = ?)';
      params.push(userId, userId);
    }

    let limitClause = 'LIMIT 12';
    if (String(all).toLowerCase() === 'true' || String(limit).toLowerCase() === 'all') {
      limitClause = '';
    } else if (limit) {
      const parsedLimit = Number.parseInt(limit, 10);
      if (Number.isFinite(parsedLimit) && parsedLimit > 0) {
        limitClause = `LIMIT ${Math.min(parsedLimit, 500)}`;
      }
    }

    const activityResult = await db.query(
      `SELECT
         al.LogID,
         al.Action,
         al.CreatedAt,
         t.TicketID AS TicketId,
         t.Title AS TicketTitle,
         u.Name AS UserName
       FROM AuditLogs al
       LEFT JOIN Tickets t ON al.TicketID = t.TicketID
       LEFT JOIN Users u ON al.UserId = u.UserID
       ${whereClause}
       ORDER BY al.CreatedAt DESC
       ${limitClause}`,
      params
    );

    res.json({ success: true, data: activityResult[0] || [] });
  } catch (err) {
    console.error('Get ticket activity error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================================================
// ROUTE 1: GET /api/tickets/:ticketId
// Get ticket detail with comments + audit log
// ============================================================================
router.get('/:ticketId', verifyToken, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { role, companyId, userId } = req;

    // Get ticket with all joined info
    const ticketResult = await db.query(`
      SELECT
        t.TicketID,
        t.Title,
        t.Description,
        t.ProductID,
        t.IsOverdue,
        t.SLADeadline,
        t.CreatedAt,
        t.UpdatedAt,
        s.StatusID,
        s.Name AS StatusName,
        p.PriorityID,
        p.Name AS PriorityName,
        p.SLAHours,
        c.CompanyID,
        c.Name AS CompanyName,
        creator.Name  AS CreatedByName,
        creator.UserID AS CreatedByID,
        assignee.Name AS AssignedToName,
        assignee.UserID AS AssignedToID,
        pr.ProductName,
        pr.ProductVersion
      FROM Tickets t
      JOIN Status    s ON t.StatusID   = s.StatusID
      JOIN Priority  p ON t.PriorityID = p.PriorityID
      JOIN Companies c ON t.CompanyID  = c.CompanyID
      JOIN Users creator  ON t.CreatedBy  = creator.UserID
      LEFT JOIN Users assignee ON t.AssignedTo = assignee.UserID
      LEFT JOIN Products pr ON t.ProductID = pr.ProductID
      WHERE t.TicketID = ?
        AND IFNULL(t.IsDeleted, 0) = 0
    `, [ticketId]);

    if (!ticketResult || !Array.isArray(ticketResult[0]) || ticketResult[0].length === 0) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    const ticket = ticketResult[0][0];
    console.log('🔍 Backend Response - Ticket Object:', ticket);
    console.log('🔍 TicketID in response:', ticket.TicketID);

    // Access control: Client only sees their company tickets
    if (role === 'Client' && ticket.CompanyID !== companyId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Access control: Engineer only sees assigned tickets
    if (role === 'Engineer' && ticket.AssignedToID !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Get comments from TicketComments table
    // Client sees only public comments (IsInternal = 0)
    let commentSql = `
      SELECT
        tc.CommentID,
        tc.TicketID,
        tc.UserID,
        tc.CommentText AS Content,
        tc.IsInternal,
        tc.CreatedAt,
        u.Name AS UserName,
        u.Role AS UserRole
      FROM TicketComments tc
      JOIN Users u ON tc.UserID = u.UserID
      WHERE tc.TicketID = ?
    `;
    if (role === 'Client') commentSql += ' AND tc.IsInternal = 0';
    commentSql += ' ORDER BY tc.CreatedAt ASC';

    const comments = await db.query(commentSql, [ticketId]);

    // Get audit logs
    const auditLogs = await db.query(`
      SELECT
        al.LogID,
        al.Action,
        al.OldValue,
        al.NewValue,
        al.CreatedAt,
        u.Name AS UserName
      FROM AuditLogs al
      LEFT JOIN Users u ON al.UserId = u.UserID
      WHERE al.TicketID = ?
      ORDER BY al.CreatedAt DESC
    `, [ticketId]);

    res.json({ success: true, data: { ticket, comments: comments[0] || [], auditLogs: auditLogs[0] || [] } });
  } catch (err) {
    console.error('Get ticket error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================================================
// ROUTE 2: POST /api/tickets/:ticketId/comment
// Add comment to ticket
// ============================================================================
router.post('/:ticketId/comment', verifyToken, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const { content, isInternal } = req.body;
    const { role, userId, companyId } = req;

    if (!content?.trim()) {
      return res.status(400).json({ success: false, message: 'Comment is required' });
    }

    // Validate ticket access before inserting comments.
    const ticketAccessResult = await db.query(
      `SELECT TicketID, CompanyID, AssignedTo, CreatedBy
       FROM Tickets
       WHERE TicketID = ? AND IFNULL(IsDeleted, 0) = 0`,
      [ticketId]
    );

    if (!ticketAccessResult || !Array.isArray(ticketAccessResult[0]) || ticketAccessResult[0].length === 0) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }

    const ticketAccess = ticketAccessResult[0][0];

    if (role === 'Client' && Number(ticketAccess.CompanyID) !== Number(companyId)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    if (
      role === 'Engineer' &&
      Number(ticketAccess.AssignedTo) !== Number(userId) &&
      Number(ticketAccess.CreatedBy) !== Number(userId)
    ) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Clients cannot post internal notes
    const internal = role === 'Client' ? 0 : (isInternal ? 1 : 0);

    // Insert into TicketComments table
    const result = await db.query(`
      INSERT INTO TicketComments (TicketID, UserID, CommentText, IsInternal, CreatedAt, UpdatedAt)
      VALUES (?, ?, ?, ?, NOW(), NOW())
    `, [ticketId, userId, content.trim(), internal]);

    // Add to AuditLogs
    await db.query(`
      INSERT INTO AuditLogs (TicketID, UserId, Action, NewValue)
      VALUES (?, ?, ?, ?)
    `, [
      ticketId,
      userId,
      internal ? 'Added internal note' : 'Added comment',
      content.trim().substring(0, 100)
    ]);

    // Notify relevant roles who can access this ticket (Assigned Engineer, Managers, Admins)
    const ticketInfoResult = await db.query(
      `SELECT t.TicketID, t.Title, t.CompanyID, t.AssignedTo, u.CompanyID AS AssigneeCompanyID
       FROM Tickets t
       LEFT JOIN Users u ON t.AssignedTo = u.UserID
       WHERE t.TicketID = ?`,
      [ticketId]
    );
    const ticketInfo = ticketInfoResult[0]?.[0];

    if (ticketInfo) {
      const commenterResult = await db.query(
        'SELECT Name FROM Users WHERE UserID = ?',
        [userId]
      );
      const commenterName = commenterResult[0]?.[0]?.Name || 'Someone';

      const recipientSet = new Set();

      // Use the assigned engineer's company for manager notifications.
      // Fall back to ticket company when ticket is unassigned.
      const companyForNotif = ticketInfo.AssigneeCompanyID || ticketInfo.CompanyID;

      // Notify assigned engineer only (engineers can only open assigned tickets)
      if (ticketInfo.AssignedTo) {
        recipientSet.add(Number(ticketInfo.AssignedTo));
      }

      // Notify managers in the relevant internal company
      const managersResult = await db.query(
        `SELECT UserID
         FROM Users
         WHERE CompanyID = ?
           AND Role = 'Manager'`,
        [companyForNotif]
      );
      (managersResult[0] || []).forEach((row) => recipientSet.add(Number(row.UserID)));

      const adminsResult = await db.query(
        'SELECT UserID FROM Users WHERE Role = ?',
        ['Admin']
      );
      (adminsResult[0] || []).forEach((row) => recipientSet.add(Number(row.UserID)));

      recipientSet.delete(Number(userId));

      const recipientIds = Array.from(recipientSet).filter(Boolean);
      for (const recipientId of recipientIds) {
        await db.query(
          `INSERT INTO Notifications (UserID, TicketID, Type, Title, Message, IsRead, CreatedAt)
           VALUES (?, ?, ?, ?, ?, 0, NOW())`,
          [
            recipientId,
            ticketId,
            'commented',
            internal ? 'New Internal Note' : 'New Comment',
            `${commenterName} ${internal ? 'added an internal note' : 'commented'} on ticket: ${ticketInfo.Title}`,
          ]
        );
      }
    }

    res.json({ success: true, commentId: result[0].insertId || ticketId });
  } catch (err) {
    console.error('Add comment error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================================================
// ROUTE 3: PUT /api/tickets/:ticketId/status
// Update ticket status
// ============================================================================
router.put('/:ticketId/status', verifyToken, authorize(['Engineer', 'Manager']), 
  async (req, res) => {
    try {
      const { ticketId } = req.params;
      const { statusId } = req.body;
      const { userId, role, companyId } = req;

      if (!statusId) {
        return res.status(400).json({ success: false, message: 'StatusID required' });
      }

      const ticketAccessResult = await db.query(
        `SELECT t.TicketID, t.AssignedTo, t.CompanyID, s.Name AS oldStatus
         FROM Tickets t
         JOIN Status s ON t.StatusID = s.StatusID
         WHERE t.TicketID = ? AND IFNULL(t.IsDeleted, 0) = 0`,
        [ticketId]
      );

      if (!ticketAccessResult || !Array.isArray(ticketAccessResult[0]) || ticketAccessResult[0].length === 0) {
        return res.status(404).json({ success: false, message: 'Ticket not found' });
      }

      const ticketAccess = ticketAccessResult[0][0];

      if (role === 'Engineer' && Number(ticketAccess.AssignedTo) !== Number(userId)) {
        return res.status(403).json({ success: false, message: 'Engineers can update only assigned tickets' });
      }

      if (role === 'Manager' && Number(ticketAccess.CompanyID) !== Number(companyId)) {
        return res.status(403).json({ success: false, message: 'Managers can update only company tickets' });
      }

      // Get new status name
      const newStatusResult = await db.query(
        'SELECT Name FROM Status WHERE StatusID = ?',
        [statusId]
      );

      if (!newStatusResult || !Array.isArray(newStatusResult[0]) || newStatusResult[0].length === 0) {
        return res.status(400).json({ success: false, message: 'Invalid status' });
      }

      const newStatus = newStatusResult[0][0];

      // Update ticket status
      await db.query(`
        UPDATE Tickets
        SET StatusID = ?, UpdatedAt = NOW()
        WHERE TicketID = ? AND IFNULL(IsDeleted, 0) = 0
      `, [statusId, ticketId]);

      // Add to AuditLogs
      await db.query(`
        INSERT INTO AuditLogs (TicketID, UserId, Action, OldValue, NewValue)
        VALUES (?, ?, ?, ?, ?)
      `, [
        ticketId,
        userId,
        'Status changed',
        ticketAccess.oldStatus || '',
        newStatus.Name
      ]);

      // 📧 TRIGGER RESOLVED EMAIL if status = Resolved (4) or Closed (5)
      if ([4, 5].includes(Number(statusId))) {
        const { notifyTicketResolved } = require('../services/notificationService');
        notifyTicketResolved(ticketId).catch(err => {
          console.error('⚠️ Resolution email warning (non-blocking):', err.message);
          // Don't fail the status update if email fails
        });
      }

      res.json({ success: true, message: `Status updated to ${newStatus.Name}` });
    } catch (err) {
      console.error('Update status error:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// ============================================================================
// ROUTE 4: PUT /api/tickets/:ticketId/assign
// Assign ticket to engineer (Admin only)
// ============================================================================
router.put('/:ticketId/assign', verifyToken, authorize(['Admin']), 
  async (req, res) => {
    try {
      const { ticketId } = req.params;
      const { engineerId } = req.body;
      const { userId } = req;

      if (!engineerId) {
        return res.status(400).json({ success: false, message: 'Engineer ID required' });
      }

      // Verify engineer exists
      const engineerResult = await db.query(
        'SELECT UserID, Name FROM Users WHERE UserID = ? AND Role = ?',
        [engineerId, 'Engineer']
      );

      if (!engineerResult || !Array.isArray(engineerResult[0]) || engineerResult[0].length === 0) {
        return res.status(404).json({ success: false, message: 'Engineer not found' });
      }

      const engineer = engineerResult[0][0];

      // Get In Progress StatusID
      const inProgressResult = await db.query(
        'SELECT StatusID FROM Status WHERE Name = ?',
        ['In Progress']
      );

      const inProgressStatus = inProgressResult[0][0];

      // Update ticket — assign engineer + change status to In Progress
      await db.query(`
        UPDATE Tickets
        SET AssignedTo = ?,
            StatusID   = ?,
            UpdatedAt  = NOW()
        WHERE TicketID = ? AND IFNULL(IsDeleted, 0) = 0
      `, [engineerId, inProgressStatus.StatusID, ticketId]);

      // Add to AuditLogs
      await db.query(`
        INSERT INTO AuditLogs (TicketID, UserId, Action, NewValue)
        VALUES (?, ?, ?, ?)
      `, [
        ticketId,
        userId,
        `Assigned to ${engineer.Name}`,
        engineer.Name
      ]);

      // Send email to engineer notifying of assignment
      const { notifyTicketAssigned } = require('../services/notificationService');
      notifyTicketAssigned(ticketId).catch(err => {
        console.error('⚠️ Assignment email warning (non-blocking):', err.message);
      });

      res.json({ success: true, message: `Ticket assigned to ${engineer.Name}` });
    } catch (err) {
      console.error('Assign ticket error:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// ============================================================================
// ROUTE 5: GET /api/tickets
// Get all tickets (filtered by role)
// ============================================================================
router.get('/', verifyToken, async (req, res) => {
  try {
    const { role, companyId, userId } = req;
    const hasPagination = req.query.page || req.query.limit;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const requestedLimit = parseInt(req.query.limit, 10) || 25;
    const limit = Math.min(Math.max(requestedLimit, 1), 100);
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE IFNULL(t.IsDeleted, 0) = 0';
    let params = [];

    if (role === 'Client') {
      // Client sees all tickets in their company
      whereClause += ' AND t.CompanyID = ?';
      params = [companyId];
    } else if (role === 'Engineer') {
      // Engineer sees only assigned tickets
      whereClause += ' AND t.AssignedTo = ?';
      params = [userId];
    }
    // Manager sees ALL tickets — no filter

    const countResult = await db.query(
      `SELECT COUNT(*) AS total
       FROM Tickets t
       ${whereClause}`,
      params
    );
    const total = countResult[0]?.[0]?.total || 0;

    const limitClause = hasPagination ? 'LIMIT ? OFFSET ?' : '';
    const queryParams = hasPagination ? [...params, limit, offset] : params;

    const tickets = await db.query(`
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
        c.Name AS CompanyName,
        creator.Name  AS CreatedByName,
        assignee.Name AS AssignedToName
      FROM Tickets t
      JOIN Status    s ON t.StatusID   = s.StatusID
      JOIN Priority  p ON t.PriorityID = p.PriorityID
      JOIN Companies c ON t.CompanyID  = c.CompanyID
      JOIN Users creator  ON t.CreatedBy  = creator.UserID
      LEFT JOIN Users assignee ON t.AssignedTo = assignee.UserID
      ${whereClause}
      ORDER BY t.CreatedAt DESC
      ${limitClause}
    `, queryParams);

    const data = tickets[0] || [];
    if (hasPagination) {
      return res.json({
        success: true,
        data,
        page,
        limit,
        total,
        hasMore: offset + data.length < total,
      });
    }

    res.json({ success: true, data });
  } catch (err) {
    console.error('Get tickets error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ============================================================================
// ROUTE 7: POST /api/tickets
// Create ticket
// ============================================================================
router.post('/', verifyToken, async (req, res) => {
  try {
    const { title, description, priorityId, productId } = req.body;
    const { userId, companyId, role } = req;

    if (!title?.trim() || !description?.trim() || !priorityId) {
      return res.status(400).json({ success: false, message: 'All fields required' });
    }

    // Get SLAHours for this priority
    const priorityResult = await db.query(
      'SELECT SLAHours FROM Priority WHERE PriorityID = ?',
      [priorityId]
    );

    if (!priorityResult || !Array.isArray(priorityResult[0]) || priorityResult[0].length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid priority' });
    }

    const priority = priorityResult[0][0];

    // Calculate SLA deadline (add SLAHours to now) - convert to MySQL DATETIME format
    const slaDeadline = new Date();
    slaDeadline.setHours(slaDeadline.getHours() + priority.SLAHours);
    const slaDeadlineStr = slaDeadline.toISOString().slice(0, 19).replace('T', ' ');

    // Get Open and In Progress StatusID
    const openStatusResult = await db.query(
      'SELECT StatusID FROM Status WHERE Name = ?',
      ['Open']
    );

    const inProgressStatusResult = await db.query(
      'SELECT StatusID FROM Status WHERE Name = ?',
      ['In Progress']
    );

    if (!openStatusResult || !Array.isArray(openStatusResult[0]) || openStatusResult[0].length === 0) {
      return res.status(400).json({ success: false, message: 'Open status not found in system' });
    }

    if (!inProgressStatusResult || !Array.isArray(inProgressStatusResult[0]) || inProgressStatusResult[0].length === 0) {
      return res.status(400).json({ success: false, message: 'In Progress status not found in system' });
    }

    const openStatus = openStatusResult[0][0];
    const inProgressStatus = inProgressStatusResult[0][0];

    // Verify StatusID is valid
    if (!openStatus || !openStatus.StatusID) {
      return res.status(400).json({ success: false, message: 'Invalid status ID' });
    }

    // Load-aware round-robin auto assignment.
    // 1) Find least-loaded engineers by active tickets.
    // 2) Apply round-robin only within the least-loaded tie group.
    let assignedEngineerId = null;
    let assignedEngineerName = null;
    let assignmentDeferredReason = '';

    const engineersResult = await db.query(
      `SELECT
         u.UserID,
         u.Name,
         COALESCE(SUM(CASE WHEN LOWER(TRIM(s.Name)) NOT IN ('resolved', 'closed') THEN 1 ELSE 0 END), 0) AS ActiveCount
       FROM Users u
       LEFT JOIN Tickets t ON t.AssignedTo = u.UserID AND IFNULL(t.IsDeleted, 0) = 0
       LEFT JOIN Status s ON s.StatusID = t.StatusID
       WHERE LOWER(TRIM(u.Role)) = 'engineer'
         AND IFNULL(u.IsDeleted, 0) = 0
         AND u.CompanyID = 1
       GROUP BY u.UserID, u.Name
       ORDER BY ActiveCount ASC, u.UserID ASC`,
      []
    );

    const engineers = engineersResult[0] || [];
    if (engineers.length > 0) {
      const eligibleEngineers = engineers.filter(
        (row) => Number(row.ActiveCount || 0) < MAX_ACTIVE_TICKETS_PER_ENGINEER
      );

      if (eligibleEngineers.length > 0) {
        const minimumLoad = Math.min(...eligibleEngineers.map((row) => Number(row.ActiveCount || 0)));
        const tieEngineers = eligibleEngineers
          .filter((row) => Number(row.ActiveCount || 0) === minimumLoad)
          .sort((a, b) => Number(a.UserID) - Number(b.UserID));

        const tieEngineerIds = tieEngineers.map((row) => Number(row.UserID)).filter(Boolean);

        const placeholders = tieEngineerIds.map(() => '?').join(', ');
        const lastAssignedResult = await db.query(
          `SELECT t.AssignedTo
           FROM Tickets t
           WHERE t.AssignedTo IS NOT NULL
             AND IFNULL(t.IsDeleted, 0) = 0
             AND t.AssignedTo IN (${placeholders})
           ORDER BY t.UpdatedAt DESC, t.TicketID DESC
           LIMIT 1`,
          [...tieEngineerIds]
        );

        const lastAssignedId = Number(lastAssignedResult[0]?.[0]?.AssignedTo || 0);
        const lastIndex = tieEngineerIds.findIndex((id) => id === lastAssignedId);
        const nextIndex = lastIndex >= 0 ? (lastIndex + 1) % tieEngineerIds.length : 0;

        assignedEngineerId = tieEngineerIds[nextIndex];
        assignedEngineerName = tieEngineers.find((row) => Number(row.UserID) === assignedEngineerId)?.Name || null;
      } else {
        assignmentDeferredReason = `All engineers are at capacity (max ${MAX_ACTIVE_TICKETS_PER_ENGINEER} active tickets)`;
      }
    } else {
      assignmentDeferredReason = 'No engineer available for auto-assignment';
    }

    // Insert ticket (auto-assign engineer when available)
    // If engineer is assigned, set status to "In Progress", otherwise "Open"
    const ticketStatusId = assignedEngineerId ? inProgressStatus.StatusID : openStatus.StatusID;
    
    const result = await db.query(`
      INSERT INTO Tickets
        (Title, Description, CompanyID, CreatedBy, AssignedTo, PriorityID,
         StatusID, SLADeadline, IsOverdue, ProductID, CreatedAt, UpdatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, NOW(), NOW())
    `, [
      title.trim(),
      description.trim(),
      companyId,
      userId,
      assignedEngineerId,
      priorityId,
      ticketStatusId,
      slaDeadlineStr,
      productId || null
    ]);

    // Add to AuditLogs
    await db.query(`
      INSERT INTO AuditLogs (TicketID, UserId, Action, NewValue)
      VALUES (?, ?, ?, ?)
    `, [result[0].insertId, userId, 'Ticket created', title.trim()]);

    if (assignedEngineerId && assignedEngineerName) {
      await db.query(
        `INSERT INTO AuditLogs (TicketID, UserId, Action, NewValue)
         VALUES (?, ?, ?, ?)`,
        [
          result[0].insertId,
          userId,
          'Auto-assigned (Round Robin)',
          assignedEngineerName,
        ]
      );
    } else if (assignmentDeferredReason) {
      await db.query(
        `INSERT INTO AuditLogs (TicketID, UserId, Action, NewValue)
         VALUES (?, ?, ?, ?)`,
        [
          result[0].insertId,
          userId,
          'Auto-assignment deferred',
          assignmentDeferredReason,
        ]
      );
    }

    // Notify managers and admins when a ticket is created
    const ticketId = result[0].insertId;

    const creatorResult = await db.query(
      'SELECT Name, Role FROM Users WHERE UserID = ?',
      [userId]
    );
    const creatorName = creatorResult[0]?.[0]?.Name || 'User';
    const creatorRole = creatorResult[0]?.[0]?.Role || role || 'User';

    const recipientSet = new Set();

    // All managers
    const managersResult = await db.query(
      `SELECT UserID
       FROM Users
      WHERE LOWER(TRIM(Role)) = 'manager'`
    );
    (managersResult[0] || []).forEach((row) => recipientSet.add(Number(row.UserID)));

    // All admins
    const adminsResult = await db.query(
      `SELECT UserID
       FROM Users
      WHERE LOWER(TRIM(Role)) IN ('admin', 'super admin', 'superadmin')`
    );
    (adminsResult[0] || []).forEach((row) => recipientSet.add(Number(row.UserID)));

    // Safety: do not notify creator
    recipientSet.delete(Number(userId));

    const recipientIds = Array.from(recipientSet).filter(Boolean);
    for (const recipientId of recipientIds) {
      await db.query(
        `INSERT INTO Notifications (UserID, TicketID, Type, Title, Message, IsRead, CreatedAt)
         VALUES (?, ?, ?, ?, ?, 0, NOW())`,
        [
          recipientId,
          ticketId,
          'created',
          'New Ticket Created',
          `${creatorName} (${creatorRole}) created a new ticket: ${title.trim()}`,
        ]
      );
    }

    if (assignedEngineerId && assignedEngineerName) {
      await db.query(
        `INSERT INTO Notifications (UserID, TicketID, Type, Title, Message, IsRead, CreatedAt)
         VALUES (?, ?, ?, ?, ?, 0, NOW())`,
        [
          assignedEngineerId,
          ticketId,
          'assigned',
          'Ticket Assigned',
          `You have been auto-assigned (Round Robin) to ticket: ${title.trim()}`,
        ]
      );
    }

    // TRIGGER EMAIL NOTIFICATIONS (non-blocking)
    console.log(`📧 [TICKET ROUTE] Triggering email notifications for Ticket #${ticketId}...`);
    const { notifyTicketCreated } = require('../services/notificationService');
    notifyTicketCreated(ticketId).then(() => {
      console.log(`✅ [TICKET ROUTE] Email notifications sent for Ticket #${ticketId}`);
    }).catch(err => {
      console.error(`❌ [TICKET ROUTE] Email notification error for Ticket #${ticketId}:`, err.message);
    });

    res.json({
      success: true,
      ticketId: result[0].insertId,
      autoAssignedTo: assignedEngineerId
        ? { userId: assignedEngineerId, name: assignedEngineerName }
        : null,
      message: assignedEngineerId
        ? `Ticket created and auto-assigned to ${assignedEngineerName}`
        : `Ticket created and queued. ${assignmentDeferredReason || 'Awaiting manual assignment.'}`
    });
  } catch (err) {
    console.error('Create ticket error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
