const { query } = require('../config/database');

/**
 * Submit CSAT rating
 */
const submitCSATRating = async (ticketId, userId, rating, comment) => {
  console.log('CSAT: Submitting rating - ticketId:', ticketId, 'userId:', userId, 'rating:', rating);

  // Validate rating is 1-5
  const ratingNum = Number(rating);
  if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    console.error('Invalid rating:', rating);
    throw new Error('Rating must be an integer between 1 and 5');
  }

  // Validate comment is not empty and at least 10 chars
  if (!comment || comment.trim().length < 10) {
    console.error('Comment too short:', comment?.length);
    throw new Error('Comment must be at least 10 characters');
  }

  // Check if rating already exists for this ticket
  console.log('Checking for existing rating...');
  const existing = await query(
    'SELECT RatingID FROM CSATRatings WHERE TicketID = ? LIMIT 1',
    [ticketId]
  );

  if (existing[0] && existing[0].length > 0) {
    console.log('Rating already exists for ticket:', ticketId);
    throw new Error('This ticket has already been rated');
  }

  // Insert rating
  console.log('Inserting rating into database...');
  const result = await query(
    `INSERT INTO CSATRatings (TicketID, UserID, Stars, Comment, CreatedAt)
     VALUES (?, ?, ?, ?, NOW())`,
    [ticketId, userId, ratingNum, comment.trim()]
  );

  const success = result[0] && result[0].affectedRows > 0;
  console.log('Rating insert result:', success);
  return success;
};

/**
 * Get rating for a specific ticket
 */
const getRatingByTicket = async (ticketId) => {
  const result = await query(
    `SELECT cr.RatingID, cr.TicketID, cr.UserID, cr.Stars, cr.Comment, 
            cr.CreatedAt, u.Name AS UserName
     FROM CSATRatings cr
     LEFT JOIN Users u ON cr.UserID = u.UserID
     WHERE cr.TicketID = ?`,
    [ticketId]
  );

  return result[0][0] || null;
};

/**
 * Get CSAT statistics for a company
 */
const getCompanyCSATStats = async (companyId) => {
  const result = await query(
    `SELECT 
       COUNT(cr.RatingID) AS TotalRatings,
       ROUND(AVG(cr.Stars), 2) AS AverageRating,
       SUM(CASE WHEN cr.Stars = 5 THEN 1 ELSE 0 END) AS FiveStarCount,
       SUM(CASE WHEN cr.Stars = 4 THEN 1 ELSE 0 END) AS FourStarCount,
       SUM(CASE WHEN cr.Stars = 3 THEN 1 ELSE 0 END) AS ThreeStarCount,
       SUM(CASE WHEN cr.Stars = 2 THEN 1 ELSE 0 END) AS TwoStarCount,
       SUM(CASE WHEN cr.Stars = 1 THEN 1 ELSE 0 END) AS OneStarCount,
       SUM(CASE WHEN cr.Stars <= 3 THEN 1 ELSE 0 END) AS LowScoreCount,
       MAX(cr.CreatedAt) AS LastRatedDate
     FROM CSATRatings cr
     JOIN Tickets t ON cr.TicketID = t.TicketID
     WHERE t.CompanyID = ?`,
    [companyId]
  );

  const data = result[0][0] || {
    TotalRatings: 0,
    AverageRating: 0,
    FiveStarCount: 0,
    FourStarCount: 0,
    ThreeStarCount: 0,
    TwoStarCount: 0,
    OneStarCount: 0,
    LowScoreCount: 0,
  };

  return data;
};

/**
 * Get CSAT report by period with filters
 */
const getCSATReportByPeriod = async (companyId, startDate, endDate, filters = {}) => {
  let sql = `
    SELECT 
      cr.RatingID,
      cr.TicketID,
      cr.Stars,
      cr.Comment,
      cr.CreatedAt,
      t.Title,
      t.StatusID,
      s.Name AS StatusName,
      p.Name AS PriorityName,
      prod.ProductName,
      u.Name AS CreatedByName,
      c.Name AS CompanyName
    FROM CSATRatings cr
    JOIN Tickets t ON cr.TicketID = t.TicketID
    LEFT JOIN Status s ON t.StatusID = s.StatusID
    LEFT JOIN Priority p ON t.PriorityID = p.PriorityID
    LEFT JOIN Products prod ON t.ProductID = prod.ProductID
    LEFT JOIN Users u ON t.CreatedBy = u.UserID
    LEFT JOIN Companies c ON t.CompanyID = c.CompanyID
    WHERE t.CompanyID = ? AND cr.CreatedAt >= ? AND cr.CreatedAt <= ?
  `;

  const params = [companyId, startDate, endDate];

  // Apply filters
  if (filters.productId) {
    sql += ` AND t.ProductID = ?`;
    params.push(filters.productId);
  }

  if (filters.priorityId) {
    sql += ` AND t.PriorityID = ?`;
    params.push(filters.priorityId);
  }

  if (filters.ratingMin) {
    sql += ` AND cr.Stars >= ?`;
    params.push(filters.ratingMin);
  }

  sql += ` ORDER BY cr.CreatedAt DESC`;

  const result = await query(sql, params);
  return result[0] || [];
};

/**
 * Get low-score tickets (rating <= threshold)
 */
const getLowScoreTickets = async (companyId, threshold = 3) => {
  const result = await query(
    `SELECT 
       cr.RatingID,
       cr.TicketID,
       cr.Stars,
       cr.Comment,
       cr.CreatedAt,
       t.Title,
       t.Description,
       s.Name AS StatusName,
       p.Name AS PriorityName,
       prod.ProductName,
       u.Name AS CreatedByName,
       eng.Name AS AssignedToName
     FROM CSATRatings cr
     JOIN Tickets t ON cr.TicketID = t.TicketID
     LEFT JOIN Status s ON t.StatusID = s.StatusID
     LEFT JOIN Priority p ON t.PriorityID = p.PriorityID
     LEFT JOIN Products prod ON t.ProductID = prod.ProductID
     LEFT JOIN Users u ON t.CreatedBy = u.UserID
     LEFT JOIN Users eng ON t.AssignedTo = eng.UserID
     WHERE t.CompanyID = ? AND cr.Stars <= ?
     ORDER BY cr.Stars ASC, cr.CreatedAt DESC
     LIMIT 20`,
    [companyId, threshold]
  );

  return result[0] || [];
};

/**
 * Get CSAT trend by date (for charts)
 */
const getCSATTrendByDate = async (companyId, startDate, endDate) => {
  const result = await query(
    `SELECT 
       DATE(cr.CreatedAt) AS Date,
       COUNT(cr.RatingID) AS Count,
       ROUND(AVG(cr.Stars), 2) AS AverageRating,
       MIN(cr.Stars) AS MinRating,
       MAX(cr.Stars) AS MaxRating
     FROM CSATRatings cr
     JOIN Tickets t ON cr.TicketID = t.TicketID
     WHERE t.CompanyID = ? AND cr.CreatedAt >= ? AND cr.CreatedAt <= ?
     GROUP BY DATE(cr.CreatedAt)
     ORDER BY Date ASC`,
    [companyId, startDate, endDate]
  );

  return result[0] || [];
};

/**
 * Get rating distribution (for pie/bar chart)
 */
const getRatingDistribution = async (companyId) => {
  const result = await query(
    `SELECT 
       cr.Stars,
       COUNT(cr.RatingID) AS Count,
       ROUND((COUNT(cr.RatingID) / (SELECT COUNT(*) FROM CSATRatings cr2 
              JOIN Tickets t2 ON cr2.TicketID = t2.TicketID 
              WHERE t2.CompanyID = ?)) * 100, 1) AS Percentage
     FROM CSATRatings cr
     JOIN Tickets t ON cr.TicketID = t.TicketID
     WHERE t.CompanyID = ?
     GROUP BY cr.Stars
     ORDER BY cr.Stars DESC`,
    [companyId, companyId]
  );

  return result[0] || [];
};

/**
 * Get CSAT by product (for detailed analysis)
 */
const getCSATByProduct = async (companyId) => {
  const result = await query(
    `SELECT 
       prod.ProductID,
       prod.ProductName,
       COUNT(cr.RatingID) AS Count,
       ROUND(AVG(cr.Stars), 2) AS AverageRating,
       SUM(CASE WHEN cr.Stars <= 3 THEN 1 ELSE 0 END) AS LowScoreCount
     FROM CSATRatings cr
     JOIN Tickets t ON cr.TicketID = t.TicketID
     LEFT JOIN Products prod ON t.ProductID = prod.ProductID
     WHERE t.CompanyID = ?
     GROUP BY prod.ProductID, prod.ProductName
     ORDER BY AverageRating ASC`,
    [companyId]
  );

  return result[0] || [];
};

module.exports = {
  submitCSATRating,
  getRatingByTicket,
  getCompanyCSATStats,
  getCSATReportByPeriod,
  getLowScoreTickets,
  getCSATTrendByDate,
  getRatingDistribution,
  getCSATByProduct,
};
