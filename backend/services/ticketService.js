const { query } = require('../config/database');
const { calculateSLADeadline } = require('../utils/sla');

/**
 * Create ticket
 */
const createTicket = async (title, description, companyId, createdBy, priorityId, productId = null) => {
  // Get SLA hours for priority
  const priorityResult = await query(
    `SELECT SLAHours FROM Priority WHERE PriorityID = ?`,
    [priorityId]
  );

  const slaHours = priorityResult[0][0]?.SLAHours || 24;
  const slaDeadline = calculateSLADeadline(new Date(), slaHours);

  const result = await query(
    `INSERT INTO Tickets (Title, Description, CompanyID, CreatedBy, PriorityID, ProductID, StatusID, SLADeadline, CreatedAt, UpdatedAt)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?, NOW(), NOW())`,
    [title, description, companyId, createdBy, priorityId, productId, slaDeadline]
  );

  if (result[0] && result[0].affectedRows > 0) {
    // For MySQL, use LAST_INSERT_ID()
    const lastIdResult = await query('SELECT LAST_INSERT_ID() as id');
    return lastIdResult[0][0]?.id || null;
  }

  return null;
};

/**
 * Get ticket by ID (with company filter)
 */
const getTicketById = async (ticketId, companyId = null) => {
  let sql = `
    SELECT t.*, 
           p.Name AS PriorityName,
           s.Name AS StatusName,
           uc.Name AS CreatedByName,
           ua.Name AS AssignedToName,
           c.Name AS CompanyName,
           pr.ProductName,
           pr.ProductVersion
    FROM Tickets t
    LEFT JOIN Priority p ON t.PriorityID = p.PriorityID
    LEFT JOIN Status s ON t.StatusID = s.StatusID
    LEFT JOIN Users uc ON t.CreatedBy = uc.UserID
    LEFT JOIN Users ua ON t.AssignedTo = ua.UserID
    LEFT JOIN Companies c ON t.CompanyID = c.CompanyID
    LEFT JOIN Products pr ON t.ProductID = pr.ProductID
    WHERE t.TicketID = ?
      AND IFNULL(t.IsDeleted, 0) = 0
  `;

  const params = [ticketId];

  if (companyId) {
    sql += ` AND t.CompanyID = ?`;
    params.push(companyId);
  }

  const result = await query(sql, params);
  return result[0][0] || null;
};

/**
 * Get tickets by company
 */
const getTicketsByCompany = async (companyId, filters = {}) => {
  let sql = `
    SELECT t.*, 
           p.Name AS PriorityName,
           s.Name AS StatusName,
           uc.Name AS CreatedByName,
           ua.Name AS AssignedToName,
           CASE 
             WHEN s.Name IN ('Resolved', 'Closed') AND t.UpdatedAt <= t.SLADeadline THEN 0
             WHEN s.Name IN ('Resolved', 'Closed') AND t.UpdatedAt > t.SLADeadline THEN 1
             WHEN s.Name NOT IN ('Resolved', 'Closed') AND t.SLADeadline < NOW() THEN 1
             ELSE 0
           END AS IsOverdue
    FROM Tickets t
    LEFT JOIN Priority p ON t.PriorityID = p.PriorityID
    LEFT JOIN Status s ON t.StatusID = s.StatusID
    LEFT JOIN Users uc ON t.CreatedBy = uc.UserID
    LEFT JOIN Users ua ON t.AssignedTo = ua.UserID
    WHERE t.CompanyID = ?
      AND IFNULL(t.IsDeleted, 0) = 0
  `;

  const params = [companyId];

  // Apply filters
  if (filters.statusId) {
    sql += ` AND t.StatusID = ?`;
    params.push(filters.statusId);
  }

  if (filters.priorityId) {
    sql += ` AND t.PriorityID = ?`;
    params.push(filters.priorityId);
  }

  if (filters.assignedTo) {
    sql += ` AND t.AssignedTo = ?`;
    params.push(filters.assignedTo);
  }

  sql += ` ORDER BY t.CreatedAt DESC`;

  const result = await query(sql, params);
  return result[0] || [];
};

/**
 * Get tickets assigned to user
 */
const getTicketsAssignedToUser = async (userId, companyId) => {
  const result = await query(
    `SELECT t.*, 
            p.Name AS PriorityName,
            s.Name AS StatusName,
            uc.Name AS CreatedByName,
            CASE 
              WHEN s.Name IN ('Resolved', 'Closed') AND t.UpdatedAt <= t.SLADeadline THEN 0
              WHEN s.Name IN ('Resolved', 'Closed') AND t.UpdatedAt > t.SLADeadline THEN 1
              WHEN s.Name NOT IN ('Resolved', 'Closed') AND t.SLADeadline < NOW() THEN 1
              ELSE 0
            END AS IsOverdue
     FROM Tickets t
     LEFT JOIN Priority p ON t.PriorityID = p.PriorityID
     LEFT JOIN Status s ON t.StatusID = s.StatusID
     LEFT JOIN Users uc ON t.CreatedBy = uc.UserID
     WHERE t.AssignedTo = ? AND t.CompanyID = ? AND IFNULL(t.IsDeleted, 0) = 0
     ORDER BY t.CreatedAt DESC`,
    [userId, companyId]
  );

  return result[0] || [];
};

/**
 * Get tickets created by user
 */
const getTicketsCreatedByUser = async (userId, companyId) => {
  const result = await query(
    `SELECT t.*, 
            p.Name AS PriorityName,
            s.Name AS StatusName,
            ua.Name AS AssignedToName,
            CASE 
              WHEN s.Name IN ('Resolved', 'Closed') AND t.UpdatedAt <= t.SLADeadline THEN 0
              WHEN s.Name IN ('Resolved', 'Closed') AND t.UpdatedAt > t.SLADeadline THEN 1
              WHEN s.Name NOT IN ('Resolved', 'Closed') AND t.SLADeadline < NOW() THEN 1
              ELSE 0
            END AS IsOverdue
     FROM Tickets t
     LEFT JOIN Priority p ON t.PriorityID = p.PriorityID
     LEFT JOIN Status s ON t.StatusID = s.StatusID
     LEFT JOIN Users ua ON t.AssignedTo = ua.UserID
     WHERE t.CreatedBy = ? AND t.CompanyID = ? AND IFNULL(t.IsDeleted, 0) = 0
     ORDER BY t.CreatedAt DESC`,
    [userId, companyId]
  );

  return result[0] || [];
};

/**
 * Get all tickets (for managers)
 */
const getAllTickets = async (filters = {}) => {
  let sql = `
    SELECT t.*, 
           p.Name AS PriorityName,
           s.Name AS StatusName,
           uc.Name AS CreatedByName,
           ua.Name AS AssignedToName,
           c.Name AS CompanyName,
           CASE 
             WHEN s.Name IN ('Resolved', 'Closed') AND t.UpdatedAt <= t.SLADeadline THEN 0
             WHEN s.Name IN ('Resolved', 'Closed') AND t.UpdatedAt > t.SLADeadline THEN 1
             WHEN s.Name NOT IN ('Resolved', 'Closed') AND t.SLADeadline < NOW() THEN 1
             ELSE 0
           END AS IsOverdue
    FROM Tickets t
    LEFT JOIN Priority p ON t.PriorityID = p.PriorityID
    LEFT JOIN Status s ON t.StatusID = s.StatusID
    LEFT JOIN Users uc ON t.CreatedBy = uc.UserID
    LEFT JOIN Users ua ON t.AssignedTo = ua.UserID
    LEFT JOIN Companies c ON t.CompanyID = c.CompanyID
    WHERE IFNULL(t.IsDeleted, 0) = 0
  `;

  const params = [];

  if (filters.companyId) {
    sql += ` AND t.CompanyID = ?`;
    params.push(filters.companyId);
  }

  if (filters.statusId) {
    sql += ` AND t.StatusID = ?`;
    params.push(filters.statusId);
  }

  sql += ` ORDER BY t.CreatedAt DESC`;

  const result = await query(sql, params);
  return result[0] || [];
};

/**
 * Update ticket status
 */
const updateTicketStatus = async (ticketId, statusId) => {
  const result = await query(
    `UPDATE Tickets
     SET StatusID = ?, UpdatedAt = NOW()
     WHERE TicketID = ? AND IFNULL(IsDeleted, 0) = 0`,
    [statusId, ticketId]
  );

  return result[0] && result[0].affectedRows > 0;
};

/**
 * Assign ticket to engineer
 */
const assignTicketToEngineer = async (ticketId, engineerId) => {
  const result = await query(
    `UPDATE Tickets
     SET AssignedTo = ?, UpdatedAt = NOW()
     WHERE TicketID = ? AND IFNULL(IsDeleted, 0) = 0`,
    [engineerId, ticketId]
  );

  return result[0] && result[0].affectedRows > 0;
};

/**
 * Get overdue tickets
 */
const getOverdueTickets = async (companyId = null) => {
  let sql = `
    SELECT t.*, 
           p.Name AS PriorityName,
           s.Name AS StatusName,
           uc.Name AS CreatedByName,
           c.Name AS CompanyName
    FROM Tickets t
    LEFT JOIN Priority p ON t.PriorityID = p.PriorityID
    LEFT JOIN Status s ON t.StatusID = s.StatusID
    LEFT JOIN Users uc ON t.CreatedBy = uc.UserID
    LEFT JOIN Companies c ON t.CompanyID = c.CompanyID
    WHERE t.SLADeadline < NOW() AND t.StatusID != 4 AND IFNULL(t.IsDeleted, 0) = 0
  `;

  const params = [];

  if (companyId) {
    sql += ` AND t.CompanyID = ?`;
    params.push(companyId);
  }

  sql += ` ORDER BY t.SLADeadline ASC`;

  const result = await query(sql, params);
  return result[0] || [];
};

/**
 * Mark tickets as overdue
 */
const markOverdueTickets = async () => {
  const result = await query(
    `UPDATE Tickets SET IsOverdue = 1, UpdatedAt = NOW() 
     WHERE SLADeadline < NOW() 
       AND IsOverdue = 0 
       AND StatusID IN (1, 2)
       AND IFNULL(IsDeleted, 0) = 0`,
    []
  );

  return (result[0] && result[0].affectedRows) || 0;
};

module.exports = {
  createTicket,
  getTicketById,
  getTicketsByCompany,
  getTicketsAssignedToUser,
  getTicketsCreatedByUser,
  getAllTickets,
  updateTicketStatus,
  assignTicketToEngineer,
  getOverdueTickets,
  markOverdueTickets,
};
