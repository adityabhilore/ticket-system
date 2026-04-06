const { getTransporter } = require('../config/emailConfig');
const { query } = require('../config/database');

/**
 * Send email via SMTP and log to database
 * 
 * @param {string|array} to - Email address(es)
 * @param {string} subject - Email subject
 * @param {string} htmlBody - HTML body content
 * @param {string} templateType - Template type (TICKET_CREATED, TICKET_ASSIGNED, etc)
 * @param {number} ticketId - Ticket ID for logging
 * @param {string} recipientName - Recipient name for logging
 * @param {string} recipientRole - Role (Client, Engineer, Manager, Admin)
 * @returns {boolean} Success status
 */
const sendEmail = async (to, subject, htmlBody, templateType, ticketId, recipientName = '', recipientRole = '') => {
  try {
    const transporter = getTransporter();
    const recipients = Array.isArray(to) ? to : [to];
    const toList = recipients.join(',');

    console.log(`📧 [EmailService] Sending ${templateType}`);
    console.log(`   To: ${toList}`);
    console.log(`   Subject: ${subject.substring(0, 60)}...`);

    // Prepare mail options
    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME || 'TicketDesk'}" <${process.env.SMTP_FROM_EMAIL}>`,
      to: toList,
      subject: subject,
      html: htmlBody,
    };

    // Send email via SMTP
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ [EmailService] Email sent successfully`);
    console.log(`   MessageID: ${info.messageId}`);

    // Log to database as SENT
    for (const email of recipients) {
      await query(
        `INSERT INTO EmailNotifications 
         (TicketID, TemplateType, RecipientEmail, RecipientName, RecipientRole, Subject, EmailBody, Status, ErrorMessage, SentAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'SENT', '', NOW())`,
        [ticketId, templateType, email, recipientName, recipientRole, subject, htmlBody]
      );
      console.log(`📝 [EmailService] Logged SENT: ${email}`);
    }

    return true;

  } catch (error) {
    console.error(`❌ [EmailService] Send failed: ${error.message}`);

    // Log failure to database
    const recipients = Array.isArray(to) ? to : [to];
    for (const email of recipients) {
      await query(
        `INSERT INTO EmailNotifications 
         (TicketID, TemplateType, RecipientEmail, RecipientName, RecipientRole, Subject, EmailBody, Status, ErrorMessage)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'FAILED', ?)`,
        [ticketId, templateType, email, recipientName, recipientRole, subject, htmlBody, error.message]
      );
    }

    return false;
  }
};

module.exports = { sendEmail };
