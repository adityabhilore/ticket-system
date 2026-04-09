const db           = require('../config/database');
const gmailService = require('./gmailService');
const {
  notifyTicketCreated,
  notifyTicketReopened,
} = require('./notificationService');

// ─────────────────────────────────────────
// MAIN PROCESSOR — called by cron job
// ─────────────────────────────────────────
const processInboundEmails = async () => {
  console.log('📧 Checking inbox for new emails...');

  try {
    // Get unread emails
    const messages = await gmailService.getUnreadEmails();
    if (messages.length === 0) return;

    console.log(`📬 Found ${messages.length} unread email(s)`);

    for (const msg of messages) {
      await processEmail(msg.id);
    }
  } catch(err) {
    console.error('Email processor error:', err.message);
  }
};

// ─────────────────────────────────────────
// PROCESS SINGLE EMAIL
// ─────────────────────────────────────────
const processEmail = async (gmailMessageId) => {
  try {
    console.log(`\n🔄 [START] Processing email: ${gmailMessageId}`);
    
    // Check if already processed
    const result = await db.query(
      'SELECT InboundEmailID FROM InboundEmails WHERE GmailMessageID=?',
      [gmailMessageId]
    );
    const existing = result[0]?.[0];
    if (existing) {
      console.log(`⏭️ Already processed - skipping`);
      return;
    }

    // Get full email
    console.log(`📨 Fetching full email from Gmail...`);
    const message = await gmailService.getEmailById(gmailMessageId);
    if (!message) {
      console.log(`❌ Could not fetch email`);
      return;
    }

    // Parse email
    console.log(`🔍 Parsing email...`);
    const email = gmailService.parseEmail(message);
    console.log(`   From: ${email.fromEmail}`);
    console.log(`   Subject: ${email.subject}`);
    console.log(`   ThreadID: ${email.threadId}`);

    // Skip emails FROM our own support address (avoid loops)
    if (email.fromEmail === process.env.SUPPORT_EMAIL?.toLowerCase()) {
      console.log(`⏭️ Email from support address - skipping (avoid loops)`);
      await gmailService.markAsRead(gmailMessageId);
      return;
    }

    // Save to InboundEmails table
    // First check if already exists
    const existingResult = await db.query(
      'SELECT InboundEmailID FROM InboundEmails WHERE GmailMessageID=?',
      [email.gmailMessageId]
    );

    if (existingResult[0]?.[0]) {
      console.log(`⏭️ Already in DB - skipping`);
      await gmailService.markAsRead(gmailMessageId);
      return;
    }

    // Insert new email
    console.log(`💾 Inserting into InboundEmails table...`);
    const insertResult = await db.query(`
      INSERT INTO InboundEmails
        (GmailMessageID, FromEmail, FromName, Subject,
         BodyText, ReceivedAt, Status, CreatedAt)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())
    `, [
      email.gmailMessageId,
      email.fromEmail,
      email.fromName,
      email.subject,
      email.bodyText,
      email.receivedAt,
    ]);

    const inboundEmailId = insertResult[0]?.insertId;
    console.log(`✅ Saved as InboundEmailID: ${inboundEmailId}`);

    // Mark as read in Gmail
    await gmailService.markAsRead(gmailMessageId);

    // ── DECIDE: New ticket OR Reply (reopen) ──
    const isReply = !!(email.inReplyTo || email.references);

    console.log(`📧 Email Processing: inReplyTo=${email.inReplyTo}, references=${email.references}, isReply=${isReply}, subject=${email.subject}`);

    if (isReply) {
      console.log(`↩️ Detected as REPLY - calling handleReplyEmail`);
      await handleReplyEmail(email, inboundEmailId, message.threadId);
    } else {
      console.log(`📝 Detected as NEW email - calling handleNewEmail`);
      await handleNewEmail(email, inboundEmailId);
    }
    console.log(`✅ [END] Email processing complete\n`);

  } catch(err) {
    console.error(`\n❌ [ERROR] Processing email ${gmailMessageId}:`);
    console.error(`   Message: ${err.message}`);
    console.error(`   Code: ${err.code}`);
    console.error(`   Stack: ${err.stack}\n`);
    
    // Silently skip duplicate entry errors (old emails already processed)
    if (!err.message.includes('Duplicate entry')) {
      console.error(`Error details:`, err);
    }
    // Update status to failed
    try {
      await db.query(
        `UPDATE InboundEmails SET Status='failed', ErrorMessage=?
         WHERE GmailMessageID=?`,
        [err.message || err.code || 'Unknown error', gmailMessageId]
      );
    } catch (e) {
      console.error('  Failed to update error status:', e.message);
    }
  }
};

// ─────────────────────────────────────────
// HANDLE REPLY EMAIL → Reopen ticket
// ─────────────────────────────────────────
const handleReplyEmail = async (email, inboundEmailId, gmailThreadId) => {
  try {
    console.log(`🔍 Processing reply from ${email.fromEmail}, threadId=${gmailThreadId}`);

    // Find ticket by Gmail thread ID
    let ticketResult = await db.query(`
      SELECT
        t.TicketID,
        t.Title,
        t.AssignedTo,
        t.CreatedBy,
        t.CompanyID,
        s.Name AS StatusName
      FROM Tickets t
      JOIN Status s ON t.StatusID = s.StatusID
      WHERE t.EmailThreadID = ?
    `, [gmailThreadId]);
    let ticket = ticketResult[0]?.[0];
    console.log(`  ThreadID match: ${ticket ? 'YES - Found TKT-' + ticket.TicketID : 'NO'}`);

    // If no threadId match, try subject line matching [TKT-{id}]
    if (!ticket) {
      const subjectMatch = email.subject?.match(/\[TKT-(\d+)\]/);
      console.log(`  Subject match attempt: ${subjectMatch ? 'Found [TKT-' + subjectMatch[1] + ']' : 'No [TKT-id] pattern'}`);
      if (subjectMatch) {
        const extractedTicketId = subjectMatch[1];
        const ticketBySubjectResult = await db.query(`
          SELECT t.TicketID, t.Title, t.AssignedTo, t.CreatedBy,
                 t.CompanyID, s.Name AS StatusName
          FROM Tickets t
          JOIN Status s ON t.StatusID = s.StatusID
          WHERE t.TicketID=?
        `, [extractedTicketId]);
        ticket = ticketBySubjectResult[0]?.[0];
        console.log(`  Subject match result: ${ticket ? 'YES - Found TKT-' + ticket.TicketID : 'NO'}`);
      }
    }

    if (!ticket) {
      console.log(`  ⚠️ No ticket found — treating as NEW email`);
      // No ticket found for this thread — treat as new ticket
      await handleNewEmail(email, inboundEmailId);
      return;
    }

    console.log(`  ✅ Ticket found: TKT-${ticket.TicketID}, Status="${ticket.StatusName}"`);

    // Only reopen if ticket is Resolved or Closed
    if (!['Resolved', 'Closed'].includes(ticket.StatusName)) {
      console.log(`  Status is "${ticket.StatusName}" (not Resolved/Closed) — adding comment instead`);
      // Ticket is active — add comment instead
      await addEmailAsComment(ticket.TicketID, email, inboundEmailId);
      return;
    }

    console.log(`  Status is "${ticket.StatusName}" — proceeding to reopen...`);

    // Verify sender is the client who raised this ticket
    const clientResult = await db.query(
      'SELECT UserID, Name, Email FROM Users WHERE UserID=? AND LOWER(Email)=?',
      [ticket.CreatedBy, email.fromEmail]
    );
    const client = clientResult[0]?.[0];
    console.log(`  Sender verification: ${client ? 'YES - Matches client' : 'NO - Unknown sender'}`);

    if (!client) {
      console.log(`  ❌ Unknown sender — ignoring`);
      // Unknown sender — ignore
      await db.query(
        `UPDATE InboundEmails SET Status='ignored', ProcessType='ignored'
         WHERE InboundEmailID=?`,
        [inboundEmailId]
      );
      return;
    }

    // ── REOPEN THE TICKET ──
    const statusResult = await db.query(
      "SELECT StatusID FROM Status WHERE Name='Reopened'"
    );
    const reopenedStatus = statusResult[0]?.[0];

    await db.query(`
      UPDATE Tickets
      SET StatusID=?, IsOverdue=FALSE,
          ReopenToken=NULL, ReopenTokenExp=NULL,
          UpdatedAt=NOW()
      WHERE TicketID=?
    `, [reopenedStatus.StatusID, ticket.TicketID]);

    // Add audit log
    await db.query(`
      INSERT INTO AuditLogs
        (TicketID, UserId, Action, OldValue, NewValue, CreatedAt)
      VALUES (?, ?, ?, ?, ?, NOW())
    `, [
      ticket.TicketID, client.UserID,
      'Ticket reopened via email reply',
      ticket.StatusName, 'Reopened'
    ]);

    // Add to Notifications table - for ENGINEER
    await db.query(`
      INSERT INTO Notifications
        (UserID, Title, Message, Type, TicketID, InboundEmailID, CreatedAt)
      VALUES (?, ?, ?, 'email', ?, ?, NOW())
    `, [
      ticket.AssignedTo,
      `Ticket #${ticket.TicketID} Reopened via Email`,
      `${client.Name} replied to email — issue not resolved. Ticket reopened.`,
      ticket.TicketID,
      inboundEmailId,
    ]);

    // Add to Notifications table - for CLIENT (so it appears in their Mail tab)
    await db.query(`
      INSERT INTO Notifications
        (UserID, Title, Message, Type, TicketID, InboundEmailID, CreatedAt)
      VALUES (?, ?, ?, 'email', ?, ?, NOW())
    `, [
      ticket.CreatedBy,
      `Ticket #${ticket.TicketID} Status: Reopened`,
      `Your ticket has been reopened and will be reviewed by our team.`,
      ticket.TicketID,
      inboundEmailId,
    ]);

    // Update InboundEmails record
    await db.query(`
      UPDATE InboundEmails
      SET Status='processed', ProcessType='reopen',
          TicketID=?, ProcessedAt=NOW()
      WHERE InboundEmailID=?
    `, [ticket.TicketID, inboundEmailId]);

    // Trigger reopen notification email (non-blocking)
    notifyTicketReopened(ticket.TicketID).catch(err => {
      console.error('⚠️ Reopen email notification error:', err.message);
    });

    console.log(`✅ Ticket #${ticket.TicketID} reopened via email reply from ${email.fromEmail}`);

  } catch(err) {
    console.error('Handle reply error:', err.message);
    try {
      await db.query(
        `UPDATE InboundEmails SET Status='failed', ErrorMessage=?
         WHERE InboundEmailID=?`,
        [err.message, inboundEmailId]
      );
    } catch (e) {
      // Ignore
    }
  }
};

// ─────────────────────────────────────────
// HANDLE NEW EMAIL → Create new ticket
// ─────────────────────────────────────────
const handleNewEmail = async (email, inboundEmailId) => {
  try {
    // Find user by email address
    const userResult = await db.query(
      'SELECT UserID, Name, CompanyID, Role FROM Users WHERE LOWER(Email)=?',
      [email.fromEmail]
    );
    const user = userResult[0]?.[0];

    if (!user) {
      // Unknown email sender — ignore or flag
      await db.query(
        `UPDATE InboundEmails SET Status='ignored', ProcessType='ignored',
         ProcessedAt=NOW() WHERE InboundEmailID=?`,
        [inboundEmailId]
      );
      console.log(`⚠️ Unknown sender: ${email.fromEmail} — ignored`);
      return;
    }

    // Only clients can create tickets via email
    if (user.Role !== 'Client') {
      await db.query(
        `UPDATE InboundEmails SET Status='ignored', ProcessType='ignored',
         ProcessedAt=NOW() WHERE InboundEmailID=?`,
        [inboundEmailId]
      );
      return;
    }

    // Get priority — default Medium (ID=3) for email tickets
    const priorityResult = await db.query(
      'SELECT PriorityID, Name, SLAHours FROM Priority WHERE PriorityID=3'
    );
    const priority = priorityResult[0]?.[0];

    // Get Open status
    const statusResult = await db.query(
      "SELECT StatusID FROM Status WHERE Name='Open'"
    );
    const openStatus = statusResult[0]?.[0];

    // Calculate SLA deadline
    const slaDeadline = new Date();
    slaDeadline.setHours(slaDeadline.getHours() + (priority?.SLAHours || 0));

    // Build ticket title from email subject
    const ticketTitle = email.subject
      ? email.subject.replace(/^(re:|fwd?:)\s*/gi, '').trim().substring(0, 255)
      : 'Support Request via Email';

    // Build description from email body
    const description = email.bodyText ||
      'Ticket created from email. No description provided.';

    // Round Robin: find next engineer
    const engineerResult = await db.query(`
      SELECT UserID, Name, Email
      FROM Users
      WHERE Role='Engineer'
      ORDER BY UserID ASC
      LIMIT 1
    `);
    const nextEngineer = engineerResult[0]?.[0];

    // Create ticket
    const createResult = await db.query(`
      INSERT INTO Tickets
        (Title, Description, CompanyID, CreatedBy, AssignedTo,
         PriorityID, StatusID, SLADeadline, IsOverdue,
         SourceType, SourceEmail, EmailThreadID,
         CreatedAt, UpdatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, FALSE, 'email', ?, ?, NOW(), NOW())
    `, [
      ticketTitle,
      description,
      user.CompanyID,
      user.UserID,
      nextEngineer?.UserID || null,
      priority?.PriorityID || 3,
      openStatus?.StatusID || 1,
      slaDeadline,
      email.fromEmail,
      email.threadId, // Use thread ID so replies in same thread are recognized
    ]);

    const ticketId = createResult[0]?.insertId;

    // Add audit logs
    await db.query(`
      INSERT INTO AuditLogs (TicketID, UserId, Action, NewValue, CreatedAt)
      VALUES (?, ?, ?, ?, NOW())
    `, [ticketId, user.UserID, 'Ticket created via email', ticketTitle]);

    if (nextEngineer) {
      await db.query(`
        INSERT INTO AuditLogs (TicketID, UserId, Action, NewValue, CreatedAt)
        VALUES (?, ?, ?, ?, NOW())
      `, [ticketId, user.UserID,
          `Auto assigned to ${nextEngineer.Name}`, nextEngineer.Name]);
    }

    // Add notification for engineer
    if (nextEngineer?.UserID) {
      await db.query(`
        INSERT INTO Notifications
          (UserID, Title, Message, Type, TicketID, InboundEmailID, CreatedAt)
        VALUES (?, ?, ?, 'email', ?, ?, NOW())
      `, [
        nextEngineer.UserID,
        `New Ticket #${ticketId} via Email`,
        `${user.Name} raised a ticket via email: "${ticketTitle}"`,
        ticketId,
        inboundEmailId,
      ]);
    }

    // Update InboundEmails
    await db.query(`
      UPDATE InboundEmails
      SET Status='processed', ProcessType='new_ticket',
          TicketID=?, ProcessedAt=NOW()
      WHERE InboundEmailID=?
    `, [ticketId, inboundEmailId]);

    // Trigger notification emails (non-blocking)
    notifyTicketCreated(ticketId).catch(err => {
      console.error('⚠️ Email notification error:', err.message);
    });

    console.log(`✅ New ticket #${ticketId} created from email sent by ${email.fromEmail}`);

  } catch(err) {
    console.error('Handle new email error:', err.message);
    try {
      await db.query(
        `UPDATE InboundEmails SET Status='failed', ErrorMessage=?
         WHERE InboundEmailID=?`,
        [err.message, inboundEmailId]
      );
    } catch (e) {
      // Ignore
    }
  }
};

// ─────────────────────────────────────────
// ADD EMAIL AS COMMENT on active ticket
// ─────────────────────────────────────────
const addEmailAsComment = async (ticketId, email, inboundEmailId) => {
  const userResult = await db.query(
    'SELECT UserID FROM Users WHERE LOWER(Email)=?',
    [email.fromEmail]
  );
  const user = userResult[0]?.[0];
  if (!user) return;

  await db.query(`
    UPDATE InboundEmails
    SET Status='processed', ProcessType='email_reply',
        TicketID=?, ProcessedAt=NOW()
    WHERE InboundEmailID=?
  `, [ticketId, inboundEmailId]);
};

module.exports = { processInboundEmails };
