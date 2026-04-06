const { query } = require('../config/database');

/**
 * Add attachment to ticket
 */
const addAttachment = async (ticketId, fileName, filePath) => {
  const result = await query(
    `INSERT INTO Attachments (TicketID, FileName, FilePath, CreatedAt)
     VALUES (?, ?, ?, NOW())`,
    [ticketId, fileName, filePath]
  );

  return result[0] && result[0].affectedRows > 0;
};

/**
 * Get attachments for ticket
 */
const getTicketAttachments = async (ticketId) => {
  const result = await query(
    `SELECT AttachmentID, TicketID, FileName, FilePath, CreatedAt
     FROM Attachments
     WHERE TicketID = ?
     ORDER BY CreatedAt DESC`,
    [ticketId]
  );

  return result[0] || [];
};

/**
 * Delete attachment
 */
const deleteAttachment = async (attachmentId) => {
  const result = await query(
    `DELETE FROM Attachments WHERE AttachmentID = ?`,
    [attachmentId]
  );

  return result[0] && result[0].affectedRows > 0;
};

/**
 * Get attachment by ID
 */
const getAttachmentById = async (attachmentId) => {
  const result = await query(
    `SELECT AttachmentID, TicketID, FileName, FilePath, CreatedAt
     FROM Attachments
     WHERE AttachmentID = ?`,
    [attachmentId]
  );

  return result[0][0] || null;
};

module.exports = {
  addAttachment,
  getTicketAttachments,
  deleteAttachment,
  getAttachmentById,
};
