const { query } = require('../config/database');

/**
 * Add comment to ticket
 */
const addComment = async (ticketId, userId, commentText, isInternal = false) => {
  const result = await query(
    `INSERT INTO TicketComments (TicketID, UserID, CommentText, IsInternal, CreatedAt)
     VALUES (?, ?, ?, ?, NOW())`,
    [ticketId, userId, commentText, isInternal ? 1 : 0]
  );

  return result[0] && result[0].affectedRows > 0;
};

/**
 * Get comments for ticket
 */
const getTicketComments = async (ticketId, includeInternal = false) => {
  let sql = `
    SELECT tc.*, u.Name AS UserName, u.Role
    FROM TicketComments tc
    JOIN Users u ON tc.UserID = u.UserID
    WHERE tc.TicketID = ?
  `;

  const params = [ticketId];

  if (!includeInternal) {
    sql += ` AND tc.IsInternal = 0`;
  }

  sql += ` ORDER BY tc.CreatedAt ASC`;

  const result = await query(sql, params);
  return result[0] || [];
};

/**
 * Get all comments including internal notes
 */
const getAllTicketComments = async (ticketId) => {
  const result = await query(
    `SELECT tc.*, u.Name AS UserName, u.Role
     FROM TicketComments tc
     JOIN Users u ON tc.UserID = u.UserID
     WHERE tc.TicketID = ?
     ORDER BY tc.CreatedAt ASC`,
    [ticketId]
  );

  return result[0] || [];
};

/**
 * Delete comment
 */
const deleteComment = async (commentId, userId) => {
  const result = await query(
    `DELETE FROM TicketComments WHERE CommentID = ? AND UserID = ?`,
    [commentId, userId]
  );

  return result[0] && result[0].affectedRows > 0;
};

module.exports = {
  addComment,
  getTicketComments,
  getAllTicketComments,
  deleteComment,
};
