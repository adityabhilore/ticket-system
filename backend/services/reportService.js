const { query } = require('../config/database');

/**
 * Get ticket statistics for company
 */
const getTicketStats = async (companyId) => {
  const result = await query(
    `SELECT 
      (
        SELECT COUNT(*)
        FROM Tickets t
        JOIN Status s ON t.StatusID = s.StatusID
        WHERE t.CompanyID = ?
          AND IFNULL(t.IsDeleted, 0) = 0
          AND s.Name IN ('Open', 'In Progress', 'On Hold')
      ) AS OpenTickets,
      (
        SELECT COUNT(*)
        FROM Tickets t
        JOIN Status s ON t.StatusID = s.StatusID
        WHERE t.CompanyID = ? AND IFNULL(t.IsDeleted, 0) = 0 AND s.Name = 'Closed'
      ) AS ClosedTickets,
      (
        SELECT COUNT(*)
        FROM Tickets t
        JOIN Status s ON t.StatusID = s.StatusID
        WHERE t.CompanyID = ? AND IFNULL(t.IsDeleted, 0) = 0 AND s.Name = 'Resolved'
      ) AS ResolvedTickets,
      (
        SELECT COUNT(*)
        FROM Tickets t
        JOIN Status s ON t.StatusID = s.StatusID
        WHERE t.CompanyID = ?
          AND IFNULL(t.IsDeleted, 0) = 0
          AND t.SLADeadline < NOW()
          AND s.Name NOT IN ('Resolved', 'Closed')
      ) AS OverdueTickets,
      (SELECT COUNT(*) FROM Tickets WHERE CompanyID = ? AND IFNULL(IsDeleted, 0) = 0) AS TotalTickets`,
    [companyId, companyId, companyId, companyId, companyId]
  );

  return result[0][0] || {};
};

/**
 * Get SLA compliance report
 */
const getSLAComplianceReport = async (companyId) => {
  const result = await query(
    `SELECT
      COUNT(*) AS TotalTickets,
      SUM(CASE WHEN s.Name IN ('Resolved', 'Closed') THEN 1 ELSE 0 END) AS CompletedTickets,
      SUM(CASE WHEN s.Name IN ('Resolved', 'Closed') AND t.UpdatedAt <= t.SLADeadline THEN 1 ELSE 0 END) AS CompletedOnTime,
      SUM(CASE WHEN t.SLADeadline < NOW() AND s.Name NOT IN ('Resolved', 'Closed') THEN 1 ELSE 0 END) AS OverdueCount
     FROM Tickets t
     JOIN Status s ON t.StatusID = s.StatusID
       WHERE t.CompanyID = ? AND IFNULL(t.IsDeleted, 0) = 0`,
    [companyId]
  );

  const data = result[0][0] || {};
  const slaPercentage = data.CompletedTickets > 0
    ? ((data.CompletedOnTime / data.CompletedTickets) * 100).toFixed(2)
    : 0;

  return {
    ...data,
    SLAPercentage: parseFloat(slaPercentage),
  };
};

/**
 * Get tickets by priority
 */
const getTicketsByPriority = async (companyId) => {
  const result = await query(
    `SELECT p.PriorityID, p.Name, COUNT(*) AS Count
     FROM Tickets t
     JOIN Priority p ON t.PriorityID = p.PriorityID
     WHERE t.CompanyID = ? AND t.StatusID != 5 AND IFNULL(t.IsDeleted, 0) = 0
     GROUP BY p.PriorityID, p.Name`,
    [companyId]
  );

  return result[0] || [];
};

/**
 * Get tickets by status
 */
const getTicketsByStatus = async (companyId) => {
  const result = await query(
    `SELECT s.StatusID, s.Name, COUNT(*) AS Count
     FROM Tickets t
     JOIN Status s ON t.StatusID = s.StatusID
     WHERE t.CompanyID = ? AND IFNULL(t.IsDeleted, 0) = 0
     GROUP BY s.StatusID, s.Name`,
    [companyId]
  );

  return result[0] || [];
};

/**
 * Get engineer performance
 */
const getEngineerPerformance = async (companyId) => {
  const result = await query(
    `SELECT 
      u.UserID,
      u.Name,
      COUNT(*) AS TotalAssigned,
      SUM(CASE WHEN t.StatusID = 5 THEN 1 ELSE 0 END) AS Closed,
      SUM(CASE WHEN t.SLADeadline < NOW() AND t.StatusID != 5 THEN 1 ELSE 0 END) AS Overdue
     FROM Tickets t
     JOIN Users u ON t.AssignedTo = u.UserID
     WHERE t.CompanyID = ?
       AND u.Role = 'Engineer'
       AND IFNULL(t.IsDeleted, 0) = 0
       AND IFNULL(u.IsDeleted, 0) = 0
     GROUP BY u.UserID, u.Name
     ORDER BY Closed DESC`,
    [companyId]
  );

  return result[0] || [];
};

/**
 * Get tickets created per day (last 30 days)
 */
const getTicketsPerDay = async (companyId) => {
  const result = await query(
    `SELECT
      CAST(CreatedAt AS DATE) AS Date,
      COUNT(*) AS Count
     FROM Tickets
       WHERE CompanyID = ?
         AND IFNULL(IsDeleted, 0) = 0
         AND CreatedAt >= DATE_SUB(NOW(), INTERVAL 30 DAY)
     GROUP BY CAST(CreatedAt AS DATE)
     ORDER BY Date ASC`,
    [companyId]
  );

  return result[0] || [];
};

/**
 * Get ticket trend for last 7 days
 */
const getTicketTrend = async () => {
  const result = await query(
    `SELECT
      CAST(CreatedAt AS DATE) AS date,
      COUNT(*) AS created
     FROM Tickets
       WHERE CreatedAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)
         AND IFNULL(IsDeleted, 0) = 0
     GROUP BY CAST(CreatedAt AS DATE)
     ORDER BY date ASC`
  );

  return result[0] || [];
};

/**
 * Get ticket counts by status (all companies)
 */
const getAllTicketsByStatus = async () => {
  const result = await query(
    `SELECT s.Name AS status, COUNT(t.TicketID) AS count
     FROM Status s
      LEFT JOIN Tickets t ON t.StatusID = s.StatusID AND IFNULL(t.IsDeleted, 0) = 0
     GROUP BY s.StatusID, s.Name`
  );

  return result[0] || [];
};

/**
 * Get ticket counts by priority (all companies)
 */
const getAllTicketsByPriority = async () => {
  const result = await query(
    `SELECT p.Name AS priority, COUNT(t.TicketID) AS count
     FROM Priority p
      LEFT JOIN Tickets t ON t.PriorityID = p.PriorityID AND IFNULL(t.IsDeleted, 0) = 0
     GROUP BY p.PriorityID, p.Name`
  );

  return result[0] || [];
};

/**
 * Get recent tickets (last 5)
 */
const getRecentTickets = async () => {
  const result = await query(
    `SELECT
      t.TicketID,
      t.Title,
      t.CreatedAt,
      CASE WHEN t.SLADeadline < NOW() AND s.Name NOT IN ('Resolved', 'Closed') THEN 1 ELSE 0 END AS IsOverdue,
      s.Name AS StatusName,
      p.Name AS PriorityName,
      c.Name AS CompanyName,
      u.Name AS AssignedTo
     FROM Tickets t
     JOIN Status s ON t.StatusID = s.StatusID
     JOIN Priority p ON t.PriorityID = p.PriorityID
     JOIN Companies c ON t.CompanyID = c.CompanyID
     LEFT JOIN Users u ON t.AssignedTo = u.UserID
     WHERE IFNULL(t.IsDeleted, 0) = 0
       AND IFNULL(c.IsDeleted, 0) = 0
     ORDER BY t.CreatedAt DESC
     LIMIT 5`
  );

  return result[0] || [];
};

/**
 * Get top engineers by resolved count
 */
const getEngineerStats = async () => {
  const result = await query(
    `SELECT
      u.UserID,
      u.Name,
      COUNT(DISTINCT t.TicketID) AS assigned,
      SUM(CASE WHEN s.Name IN ('Resolved','Closed') THEN 1 ELSE 0 END) AS resolved
     FROM Users u
      LEFT JOIN Tickets t ON t.AssignedTo = u.UserID AND IFNULL(t.IsDeleted, 0) = 0
     LEFT JOIN Status s ON t.StatusID = s.StatusID
      WHERE u.Role = 'Engineer' AND IFNULL(u.IsDeleted, 0) = 0
     GROUP BY u.UserID, u.Name
     ORDER BY resolved DESC, assigned DESC
     LIMIT 10`
  );

  return result[0] || [];
};

/**
 * Get all companies statistics (manager view)
 */
const getManagerDashboard = async () => {
  const result = await query(
    `SELECT 
      c.CompanyID,
      c.Name,
      COUNT(*) AS TotalTickets,
      SUM(CASE WHEN t.StatusID IN (1, 2) THEN 1 ELSE 0 END) AS OpenTickets,
      SUM(CASE WHEN t.StatusID = 5 THEN 1 ELSE 0 END) AS ClosedTickets,
      SUM(CASE WHEN t.SLADeadline < NOW() AND t.StatusID != 5 THEN 1 ELSE 0 END) AS OverdueTickets
     FROM Companies c
        LEFT JOIN Tickets t ON c.CompanyID = t.CompanyID AND IFNULL(t.IsDeleted, 0) = 0
        WHERE c.Status = 'Active' AND IFNULL(c.IsDeleted, 0) = 0
     GROUP BY c.CompanyID, c.Name
     ORDER BY TotalTickets DESC`
  );

  return result[0] || [];
};

module.exports = {
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
};
