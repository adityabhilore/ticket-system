const { google } = require('googleapis');
require('dotenv').config();

// Create OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  process.env.GMAIL_REDIRECT_URI
);

// Set credentials using refresh token
oauth2Client.setCredentials({
  refresh_token: process.env.GMAIL_REFRESH_TOKEN,
});

const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

// ─────────────────────────────────────────
// Get list of unread emails
// ─────────────────────────────────────────
const getUnreadEmails = async () => {
  try {
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: 'is:unread',
      maxResults: 20,
    });
    return response.data.messages || [];
  } catch(err) {
    console.error('Gmail list error:', err.message);
    return [];
  }
};

// ─────────────────────────────────────────
// Get full email content by ID
// ─────────────────────────────────────────
const getEmailById = async (messageId) => {
  try {
    const response = await gmail.users.messages.get({
      userId: 'me',
      id: messageId,
      format: 'full',
    });
    return response.data;
  } catch(err) {
    console.error('Gmail get error:', err.message);
    return null;
  }
};

// ─────────────────────────────────────────
// Mark email as read
// ─────────────────────────────────────────
const markAsRead = async (messageId) => {
  try {
    await gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: {
        removeLabelIds: ['UNREAD'],
      },
    });
  } catch(err) {
    console.error('Mark read error:', err.message);
  }
};

// ─────────────────────────────────────────
// Parse email headers and body
// ─────────────────────────────────────────
const parseEmail = (message) => {
  const headers = message.payload?.headers || [];

  const getHeader = (name) =>
    headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';

  // Get body text
  let bodyText = '';
  const extractBody = (parts) => {
    if (!parts) return;
    for (const part of parts) {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        bodyText += Buffer.from(part.body.data, 'base64').toString('utf-8');
      } else if (part.parts) {
        extractBody(part.parts);
      }
    }
  };

  if (message.payload?.parts) {
    extractBody(message.payload.parts);
  } else if (message.payload?.body?.data) {
    bodyText = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
  }

  // Extract sender name and email
  const fromRaw    = getHeader('from');
  const fromMatch  = fromRaw.match(/^(.*?)\s*<(.+?)>$/) ||
                     fromRaw.match(/^(.+)$/);
  const fromName   = fromMatch?.[1]?.trim()  || '';
  const fromEmail  = fromMatch?.[2]?.trim()  || fromRaw.trim();

  return {
    gmailMessageId: message.id,
    threadId:       message.threadId,
    fromEmail:      fromEmail.toLowerCase(),
    fromName,
    subject:        getHeader('subject'),
    bodyText:       bodyText.trim(),
    inReplyTo:      getHeader('in-reply-to'),
    references:     getHeader('references'),
    receivedAt:     new Date(parseInt(message.internalDate)),
  };
};

module.exports = { getUnreadEmails, getEmailById, markAsRead, parseEmail };
