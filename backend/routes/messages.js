const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { verifyToken } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const chatUploadDir = path.join(__dirname, '..', 'uploads', 'chat');
if (!fs.existsSync(chatUploadDir)) {
  fs.mkdirSync(chatUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, chatUploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '');
    const base = path.basename(file.originalname || 'file', ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${Date.now()}_${base}${ext}`);
  },
});

const allowedMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (allowedMimeTypes.has(file.mimetype)) return cb(null, true);
    return cb(new Error('Unsupported file type'));
  },
});

const encodeAttachmentMessage = ({ fileName, fileMime, fileSize, fileUrl }) => {
  return `[ATTACHMENT]${JSON.stringify({ fileName, fileMime, fileSize, fileUrl })}`;
};

const normalizeRole = (role) => String(role || '').trim().toLowerCase();

const canMessageRole = (senderRole, targetRole) => {
  const sender = normalizeRole(senderRole);
  const target = normalizeRole(targetRole);

  if (!sender || !target) return false;

  if (sender === 'admin') {
    return ['admin', 'manager', 'engineer', 'client'].includes(target);
  }

  if (sender === 'manager') {
    return ['admin', 'engineer'].includes(target);
  }

  if (sender === 'engineer') {
    return ['admin', 'manager'].includes(target);
  }

  if (sender === 'client') {
    return target === 'admin';
  }

  return false;
};

const getRows = (result) => result?.recordset || result?.[0] || [];

const getConversationForUser = async (conversationId, userId) => {
  const result = await db.query(
    `SELECT
      c.ConversationID,
      c.User1ID,
      c.User2ID,
      u1.Role AS User1Role,
      u2.Role AS User2Role
     FROM Conversations c
     JOIN Users u1 ON u1.UserID = c.User1ID
     JOIN Users u2 ON u2.UserID = c.User2ID
     WHERE c.ConversationID = ?
       AND (c.User1ID = ? OR c.User2ID = ?)`,
    [conversationId, userId, userId]
  );

  return getRows(result)?.[0] || null;
};

// ─────────────────────────────────────────────────
// ROUTE 1: GET /api/messages/unread-count
// Get total unread messages for logged-in user
// Used for sidebar badge
// ─────────────────────────────────────────────────
router.get('/unread-count', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;

    const result = await db.query(`
      SELECT COUNT(*) as count
      FROM Messages m
      JOIN Conversations c ON m.ConversationID = c.ConversationID
      WHERE m.IsRead = FALSE
        AND m.SenderID != ?
        AND (c.User1ID = ? OR c.User2ID = ?)
    `, [userId, userId, userId]);

    res.json({ success: true, count: result[0]?.[0]?.count || 0 });
  } catch (err) {
    console.error('Unread count error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─────────────────────────────────────────────────
// ROUTE 2: GET /api/messages/users
// Get all users (to start new conversation)
// Excludes the logged-in user
// ─────────────────────────────────────────────────
router.get('/users', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const currentRole = req.role;

    const users = await db.query(`
      SELECT
        u.UserID,
        u.Name,
        u.Email,
        u.Role,
        c.Name as CompanyName
      FROM Users u
      LEFT JOIN Companies c ON u.CompanyID = c.CompanyID
      WHERE u.UserID != ?
      ORDER BY u.Role ASC, u.Name ASC
    `, [userId]);

    const filteredUsers = getRows(users).filter((row) =>
      canMessageRole(currentRole, row.Role)
    );

    res.json({ success: true, data: filteredUsers });
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─────────────────────────────────────────────────
// ROUTE 3: GET /api/messages/conversations
// Get all conversations for logged-in user
// Returns last message preview + unread count
// ─────────────────────────────────────────────────
router.get('/conversations', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const currentRole = req.role;

    const conversations = await db.query(`
      SELECT
        c.ConversationID,
        c.LastMessageAt,
        c.CreatedAt,
        -- Get the OTHER user's info
        CASE WHEN c.User1ID = ? THEN c.User2ID ELSE c.User1ID END AS OtherUserID,
        CASE WHEN c.User1ID = ? THEN u2.Name   ELSE u1.Name   END AS OtherUserName,
        CASE WHEN c.User1ID = ? THEN u2.Role   ELSE u1.Role   END AS OtherUserRole,
        CASE WHEN c.User1ID = ? THEN u2.Email  ELSE u1.Email  END AS OtherUserEmail,
        -- Last message preview
        (SELECT MessageText FROM Messages
         WHERE ConversationID = c.ConversationID
         ORDER BY CreatedAt DESC LIMIT 1) AS LastMessage,
        (SELECT SenderID FROM Messages
         WHERE ConversationID = c.ConversationID
         ORDER BY CreatedAt DESC LIMIT 1) AS LastSenderID,
        -- Unread count for THIS user
        (SELECT COUNT(*) FROM Messages
         WHERE ConversationID = c.ConversationID
           AND IsRead = FALSE
           AND SenderID != ?) AS UnreadCount
      FROM Conversations c
      JOIN Users u1 ON c.User1ID = u1.UserID
      JOIN Users u2 ON c.User2ID = u2.UserID
      WHERE c.User1ID = ? OR c.User2ID = ?
      ORDER BY c.LastMessageAt DESC
    `, [userId, userId, userId, userId, userId, userId, userId]);

    const filteredConversations = getRows(conversations).filter((row) =>
      canMessageRole(currentRole, row.OtherUserRole)
    );

    res.json({ success: true, data: filteredConversations });
  } catch (err) {
    console.error('Get conversations error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─────────────────────────────────────────────────
// ROUTE 4: POST /api/messages/conversations
// Start a new conversation OR get existing one
// ─────────────────────────────────────────────────
router.post('/conversations', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const currentRole = req.role;
    const otherUserId = Number(req.body.otherUserId);

    if (!otherUserId)
      return res.status(400).json({ message: 'otherUserId is required' });

    if (otherUserId === userId)
      return res.status(400).json({ message: 'Cannot message yourself' });

    const otherUserResult = await db.query(
      'SELECT Role FROM Users WHERE UserID = ?',
      [otherUserId]
    );
    const otherUser = getRows(otherUserResult)?.[0];

    if (!otherUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!canMessageRole(currentRole, otherUser.Role)) {
      return res.status(403).json({ message: 'You are not allowed to message this role' });
    }

    // Always store smaller ID as User1ID (ensures UNIQUE constraint works)
    const user1Id = Math.min(userId, otherUserId);
    const user2Id = Math.max(userId, otherUserId);

    // Check if conversation already exists
    const existingResult = await db.query(
      'SELECT ConversationID FROM Conversations WHERE User1ID=? AND User2ID=?',
      [user1Id, user2Id]
    );
    const existing = existingResult[0]?.[0];

    if (existing) {
      return res.json({ success: true, conversationId: existing.ConversationID, isNew: false });
    }

    // Create new conversation
    const result = await db.query(
      'INSERT INTO Conversations (User1ID, User2ID, LastMessageAt, CreatedAt) VALUES (?,?,NOW(),NOW())',
      [user1Id, user2Id]
    );

    res.json({ success: true, conversationId: result[0]?.insertId, isNew: true });
  } catch (err) {
    console.error('Create conversation error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─────────────────────────────────────────────────
// ROUTE 4.1: POST /api/messages/upload
// Upload chat file attachment (image/doc/etc.)
// ─────────────────────────────────────────────────
router.post('/upload', verifyToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const fileUrl = `/uploads/chat/${req.file.filename}`;
    res.json({
      success: true,
      data: {
        fileName: req.file.originalname,
        fileMime: req.file.mimetype,
        fileSize: req.file.size,
        fileUrl,
      },
    });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ success: false, message: 'Upload failed' });
  }
});

// ─────────────────────────────────────────────────
// ROUTE 5: GET /api/messages/:conversationId
// Get all messages in a conversation
// Also marks messages as read
// ─────────────────────────────────────────────────
router.get('/:conversationId', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const currentRole = req.role;
    const { conversationId } = req.params;

    const conv = await getConversationForUser(conversationId, userId);

    if (!conv)
      return res.status(403).json({ message: 'Access denied' });

    const otherRole = Number(conv.User1ID) === Number(userId)
      ? conv.User2Role
      : conv.User1Role;

    if (!canMessageRole(currentRole, otherRole)) {
      return res.status(403).json({ message: 'Access denied for this conversation' });
    }

    // Get messages
    const messages = await db.query(`
      SELECT
        m.MessageID,
        m.ConversationID,
        m.SenderID,
        m.MessageText,
        m.IsRead,
        m.CreatedAt,
        u.Name AS SenderName,
        u.Role AS SenderRole
      FROM Messages m
      JOIN Users u ON m.SenderID = u.UserID
      WHERE m.ConversationID = ?
      ORDER BY m.CreatedAt ASC
    `, [conversationId]);

    // Mark all unread messages as read
    await db.query(`
      UPDATE Messages
      SET IsRead = TRUE
      WHERE ConversationID = ?
        AND SenderID != ?
        AND IsRead = FALSE
    `, [conversationId, userId]);

    res.json({ success: true, data: messages[0] || [] });
  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─────────────────────────────────────────────────
// ROUTE 6: POST /api/messages/:conversationId
// Send a new message
// ─────────────────────────────────────────────────
router.post('/:conversationId', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const currentRole = req.role;
    const { conversationId } = req.params;
    const {
      messageText,
      attachmentFileName,
      attachmentFileMime,
      attachmentFileSize,
      attachmentFileUrl,
    } = req.body;

    let normalizedMessageText = (messageText || '').trim();

    if (attachmentFileUrl) {
      normalizedMessageText = encodeAttachmentMessage({
        fileName: attachmentFileName || 'Attachment',
        fileMime: attachmentFileMime || 'application/octet-stream',
        fileSize: Number(attachmentFileSize || 0),
        fileUrl: attachmentFileUrl,
      });
    }

    if (!normalizedMessageText)
      return res.status(400).json({ message: 'Message text or attachment is required' });

    const conv = await getConversationForUser(conversationId, userId);

    if (!conv)
      return res.status(403).json({ message: 'Access denied' });

    const otherRole = Number(conv.User1ID) === Number(userId)
      ? conv.User2Role
      : conv.User1Role;

    if (!canMessageRole(currentRole, otherRole)) {
      return res.status(403).json({ message: 'You are not allowed to message this role' });
    }

    // Insert message
    const result = await db.query(`
      INSERT INTO Messages (ConversationID, SenderID, MessageText, IsRead, CreatedAt)
      VALUES (?, ?, ?, FALSE, NOW())
    `, [conversationId, userId, normalizedMessageText]);

    // Update conversation last message time
    await db.query(
      'UPDATE Conversations SET LastMessageAt=NOW() WHERE ConversationID=?',
      [conversationId]
    );

    res.json({ success: true, messageId: result[0]?.insertId });
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ─────────────────────────────────────────────────
// ROUTE 7: PUT /api/messages/:conversationId/read
// Mark all messages in conversation as read
// ─────────────────────────────────────────────────
router.put('/:conversationId/read', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const currentRole = req.role;
    const { conversationId } = req.params;

    const conv = await getConversationForUser(conversationId, userId);
    if (!conv) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const otherRole = Number(conv.User1ID) === Number(userId)
      ? conv.User2Role
      : conv.User1Role;

    if (!canMessageRole(currentRole, otherRole)) {
      return res.status(403).json({ message: 'Access denied for this conversation' });
    }

    await db.query(`
      UPDATE Messages
      SET IsRead = TRUE
      WHERE ConversationID = ?
        AND SenderID != ?
        AND IsRead = FALSE
    `, [conversationId, userId]);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
