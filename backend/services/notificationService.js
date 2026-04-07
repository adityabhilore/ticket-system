const { getTemplate, renderTemplate } = require('./emailTemplateService');
const { sendEmail } = require('./emailService');
const { getNextEngineer } = require('./roundRobinService');
const { query } = require('../config/database');

/**
 * SIMPLIFIED EMAIL SYSTEM: Only Client + Engineer
 * 
 * Workflow:
 * 1. Get ticket details
 * 2. Auto-assign engineer via round-robin
 * 3. Send Email #1: CLIENT (ticket created notification)
 * 4. Send Email #2: ENGINEER (ticket assigned notification)
 */
const notifyTicketCreated = async (ticketId) => {
  try {
    // ADD SYNCHRONOUS DEBUG LOG TO STDOUT
    process.stdout.write(`\n${'='.repeat(70)}\n`);
    process.stdout.write(`📬 [Email] TICKET CREATED - Ticket #${ticketId}\n`);
    process.stdout.write(`${'='.repeat(70)}\n\n`);
    
    console.log(`\n${'='.repeat(70)}`);
    console.log(`📬 [Email] TICKET CREATED - Ticket #${ticketId}`);
    console.log(`${'='.repeat(70)}\n`);

    // ===== STEP 1: GET TICKET DETAILS =====
    console.log(`[STEP 1] Fetching ticket details...`);
    const ticketResult = await query(
      `SELECT t.*, 
              p.Name as PriorityName, 
              s.Name as StatusName,
              c.Name as CompanyName, 
              u.Name as ClientName, 
              u.Email as ClientEmail
       FROM Tickets t
       LEFT JOIN Priority p ON t.PriorityID = p.PriorityID
       LEFT JOIN Status s ON t.StatusID = s.StatusID
       LEFT JOIN Companies c ON t.CompanyID = c.CompanyID
       LEFT JOIN Users u ON t.CreatedBy = u.UserID
       WHERE t.TicketID = ?`,
      [ticketId]
    );

    console.log(`[DEBUG] ticketResult type: ${typeof ticketResult}, length: ${ticketResult?.length || 'N/A'}`);
    
    if (!ticketResult[0] || !ticketResult[0][0]) {
      console.log(`❌ Ticket not found: #${ticketId}\n`);
      return;
    }

    const ticket = ticketResult[0][0];
    console.log(`✅ Ticket found: "${ticket.Title}"`);
    console.log(`   Client: ${ticket.ClientName} (${ticket.ClientEmail})`);
    console.log(`   CompanyID: ${ticket.CompanyID}`);
    console.log(`   AssignedTo: ${ticket.AssignedTo || 'Unassigned'}\n`);

    // ===== STEP 2: GET ASSIGNED ENGINEER (from existing assignment, not new) =====
    console.log(`[STEP 2] Checking if engineer is already assigned...`);
    let selectedEngineer = null;
    
    if (ticket.AssignedTo) {
      // Engineer is already assigned - fetch their details
      const engineerResult = await query(
        'SELECT UserID, Name, Email FROM Users WHERE UserID = ?',
        [ticket.AssignedTo]
      );
      selectedEngineer = engineerResult[0]?.[0] || null;
      
      if (selectedEngineer) {
        console.log(`✅ Engineer already assigned: ${selectedEngineer.Name} (${selectedEngineer.Email})\n`);
      }
    } else {
      // No engineer assigned - try auto-assign
      console.log(`⚠️ No engineer assigned - attempting auto-assignment from provider company...\n`);
      const { getNextEngineer } = require('./roundRobinService');
      selectedEngineer = await getNextEngineer(1);
      
      if (selectedEngineer) {
        await query('UPDATE Tickets SET AssignedTo = ? WHERE TicketID = ?', 
          [selectedEngineer.UserID, ticketId]);
        console.log(`✅ Auto-assigned to: ${selectedEngineer.Name} (${selectedEngineer.Email})\n`);
      } else {
        console.log(`⚠️ No engineer available for auto-assignment\n`);
      }
    }

    // ===== PREPARE EMAIL VARIABLES =====
    console.log(`[STEP 3] Preparing email variables...`);
    const emailVars = {
      TicketID: ticket.TicketID,
      TicketTitle: ticket.Title,
      TicketDescription: ticket.Description,
      ClientName: ticket.ClientName,
      CompanyName: ticket.CompanyName,
      Priority: ticket.PriorityName || 'Standard',
      SLA_DEADLINE: ticket.SLADeadline ? new Date(ticket.SLADeadline).toLocaleString() : 'N/A',
      EngineerName: selectedEngineer?.Name || 'Pending Assignment',
    };
    console.log(`✅ Variables prepared\n`);

    // ===== EMAIL #1: TO CLIENT (Ticket Created) =====
    console.log(`[EMAIL 1/2] Getting CLIENT template...`);
    const clientTemplate = await getTemplate('TICKET_CREATED', 'Client');
    console.log(`[DEBUG] clientTemplate: ${clientTemplate ? 'FOUND' : 'NOT_FOUND'}`);
    
    if (clientTemplate && ticket.ClientEmail) {
      console.log(`[EMAIL 1/2] Rendering and sending to CLIENT (${ticket.ClientEmail})...`);
      const { subject, body } = renderTemplate(clientTemplate, emailVars);
      const emailSent = await sendEmail(
        ticket.ClientEmail,
        subject,
        body,
        'TICKET_CREATED',  // ✅ FIXED: Use 'TICKET_CREATED', not 'TICKET_CREATED_CLIENT'
        ticketId,
        ticket.ClientName,
        'Client'
      );
      console.log(`${emailSent ? '✅' : '❌'} Email to CLIENT: ${emailSent ? 'SENT' : 'FAILED'}\n`);
    } else {
      console.log(`⚠️ Skipped CLIENT email - Template: ${clientTemplate ? 'OK' : 'MISSING'}, Email: ${ticket.ClientEmail || 'MISSING'}\n`);
    }

    // ===== EMAIL #2: TO ENGINEER (Ticket Assigned) =====
    if (selectedEngineer) {
      console.log(`[EMAIL 2/2] Getting ENGINEER template...`);
      const engineerTemplate = await getTemplate('TICKET_ASSIGNED', 'Engineer');
      console.log(`[DEBUG] engineerTemplate: ${engineerTemplate ? 'FOUND' : 'NOT_FOUND'}`);
      
      if (engineerTemplate && selectedEngineer.Email) {
        console.log(`[EMAIL 2/2] Rendering and sending to ENGINEER (${selectedEngineer.Email})...`);
        const { subject, body } = renderTemplate(engineerTemplate, emailVars);
        const emailSent = await sendEmail(
          selectedEngineer.Email,
          subject,
          body,
          'TICKET_ASSIGNED',  // ✅ FIXED: Use 'TICKET_ASSIGNED', not 'TICKET_ASSIGNED_ENGINEER'
          ticketId,
          selectedEngineer.Name,
          'Engineer'
        );
        console.log(`${emailSent ? '✅' : '❌'} Email to ENGINEER: ${emailSent ? 'SENT' : 'FAILED'}\n`);
      } else {
        console.log(`⚠️ Skipped ENGINEER email - Template: ${engineerTemplate ? 'OK' : 'MISSING'}, Email: ${selectedEngineer.Email || 'MISSING'}\n`);
      }
    }

    console.log(`${'='.repeat(70)}\n`);

  } catch (error) {
    console.error(`❌ [Email Error] ${error.message}`);
    console.error(error.stack);
  }
};

/**
 * TICKET RESOLVED/CLOSED: Email to Client with reopen buttons
 */
const notifyTicketResolved = async (ticketId, reopenToken) => {
  try {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`📬 [Email] TICKET RESOLVED - Ticket #${ticketId}`);
    console.log(`${'='.repeat(70)}\n`);

    // Get ticket, client info, and engineer name
    const ticketResult = await query(
      `SELECT t.*, 
              u.Name as ClientName, 
              u.Email as ClientEmail,
              e.Name as EngineerName,
              e.Email as EngineerEmail
       FROM Tickets t
       LEFT JOIN Users u ON t.CreatedBy = u.UserID
       LEFT JOIN Users e ON t.AssignedTo = e.UserID
       WHERE t.TicketID = ?`,
      [ticketId]
    );

    if (!ticketResult[0] || !ticketResult[0][0]) {
      console.log(`❌ Ticket not found: #${ticketId}\n`);
      return;
    }

    const ticket = ticketResult[0][0];
    console.log(`✅ Ticket: "${ticket.Title}"`);
    console.log(`   Client: ${ticket.ClientName} (${ticket.ClientEmail})`);
    console.log(`   Engineer: ${ticket.EngineerName || 'Not assigned'}\n`);

    // Use provided token OR fallback to ticket's stored token
    const token = reopenToken || ticket.ReopenToken;
    
    if (!token) {
      console.log(`⚠️ [Warning] No reopen token available for ticket #${ticketId}`);
      console.log(`   Email will be sent but reopen links will not work\n`);
    } else {
      console.log(`✅ Using reopen token: ${token.substring(0, 20)}...\n`);
    }

    const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000';

    // Prepare email with engineer name, reopen token, and action buttons
    const emailVars = {
      TicketID: ticket.TicketID,
      TicketTitle: ticket.Title,
      ClientName: ticket.ClientName,
      EngineerName: ticket.EngineerName || 'Support Team',
      ResolvedAt: new Date().toLocaleString(),
      reopenToken: token,
      backendUrl: backendUrl,
      confirmUrl: token ? `${backendUrl}/api/tickets/${ticketId}/confirm-resolved?token=${token}&action=confirmed` : '#',
      reopenUrl: token ? `${backendUrl}/api/tickets/${ticketId}/confirm-resolved?token=${token}&action=reopen` : '#',
    };

    // Send email to CLIENT with reopen buttons
    console.log(`[EMAIL] Sending to CLIENT (${ticket.ClientEmail})...`);
    const clientTemplate = await getTemplate('TICKET_RESOLVED', 'Client');
    if (clientTemplate && ticket.ClientEmail) {
      const { subject, body } = renderTemplate(clientTemplate, emailVars);
      await sendEmail(
        ticket.ClientEmail,
        subject,
        body,
        'TICKET_RESOLVED',  // ✅ Use 'TICKET_RESOLVED'
        ticketId,
        ticket.ClientName,
        'Client'
      );
      console.log(`✅ Email sent to CLIENT with reopen token\n`);
    }

    console.log(`${'='.repeat(70)}\n`);

  } catch (error) {
    console.error(`❌ [Email Error] ${error.message}\n`);
  }
};

/**
 * TICKET ASSIGNED: Email to Engineer only
 */
const notifyTicketAssigned = async (ticketId) => {
  try {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`📬 [Email] TICKET ASSIGNED - Ticket #${ticketId}`);
    console.log(`${'='.repeat(70)}\n`);

    // Get ticket and engineer info
    const ticketResult = await query(
      `SELECT t.*, 
              p.Name as PriorityName, 
              s.Name as StatusName,
              c.Name as CompanyName, 
              u.Name as CreatorName,
              e.UserID as EngineerID,
              e.Name as EngineerName, 
              e.Email as EngineerEmail
       FROM Tickets t
       LEFT JOIN Priority p ON t.PriorityID = p.PriorityID
       LEFT JOIN Status s ON t.StatusID = s.StatusID
       LEFT JOIN Companies c ON t.CompanyID = c.CompanyID
       LEFT JOIN Users u ON t.CreatedBy = u.UserID
       LEFT JOIN Users e ON t.AssignedTo = e.UserID
       WHERE t.TicketID = ?`,
      [ticketId]
    );

    if (!ticketResult[0] || !ticketResult[0][0]) {
      console.log(`❌ Ticket not found: #${ticketId}\n`);
      return;
    }

    const ticket = ticketResult[0][0];
    console.log(`✅ Ticket found: "${ticket.Title}"`);
    console.log(`   Assigned to: ${ticket.EngineerName || 'Unassigned'}\n`);

    if (!ticket.EngineerID || !ticket.EngineerEmail) {
      console.log(`⚠️ No engineer assigned to ticket #${ticketId}\n`);
      return;
    }

    // Generate token with deadline
    const token = `${ticket.TicketID}-${ticket.EngineerID}-${Date.now()}`;

    // Prepare email variables
    const emailVars = {
      TicketID: ticket.TicketID,
      TicketTitle: ticket.Title,
      TicketDescription: ticket.Description,
      EngineerName: ticket.EngineerName,
      CreatorName: ticket.CreatorName || 'Client',
      CompanyName: ticket.CompanyName,
      Priority: ticket.PriorityName || 'Standard',
      SLA_DEADLINE: ticket.SLADeadline ? new Date(ticket.SLADeadline).toLocaleString() : 'N/A',
    };

    // Get engineer email template and send
    console.log(`[EMAIL] Getting ENGINEER template...`);
    const engineerTemplate = await getTemplate('TICKET_ASSIGNED', 'Engineer');
    console.log(`[DEBUG] engineerTemplate: ${engineerTemplate ? 'FOUND' : 'NOT_FOUND'}`);

    if (engineerTemplate && ticket.EngineerEmail) {
      console.log(`[EMAIL] Rendering and sending to ENGINEER (${ticket.EngineerEmail})...`);
      const { subject, body } = renderTemplate(engineerTemplate, emailVars);
      const emailSent = await sendEmail(
        ticket.EngineerEmail,
        subject,
        body,
        'TICKET_ASSIGNED',
        ticketId,
        ticket.EngineerName,
        'Engineer'
      );
      console.log(`${emailSent ? '✅' : '❌'} Email to ENGINEER: ${emailSent ? 'SENT' : 'FAILED'}\n`);
    } else {
      console.log(`⚠️ Skipped ENGINEER email - Template: ${engineerTemplate ? 'OK' : 'MISSING'}, Email: ${ticket.EngineerEmail || 'MISSING'}\n`);
    }

    console.log(`${'='.repeat(70)}\n`);

  } catch (error) {
    console.error(`❌ [Email Error] ${error.message}\n`);
  }
};

/**
 * TICKET REOPENED: Email to Engineer when client reopens a resolved ticket
 */
const notifyTicketReopened = async (ticketId) => {
  try {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`📬 [Email] TICKET REOPENED - Ticket #${ticketId}`);
    console.log(`${'='.repeat(70)}\n`);

    // Get ticket, client info, and engineer details
    const ticketResult = await query(
      `SELECT t.*, 
              u.Name as ClientName, 
              u.Email as ClientEmail,
              s.Name as StatusName,
              p.Name as PriorityName,
              e.UserID as EngineerID,
              e.Name as EngineerName,
              e.Email as EngineerEmail
       FROM Tickets t
       LEFT JOIN Users u ON t.CreatedBy = u.UserID
       LEFT JOIN Users e ON t.AssignedTo = e.UserID
       LEFT JOIN Status s ON t.StatusID = s.StatusID
       LEFT JOIN Priority p ON t.PriorityID = p.PriorityID
       WHERE t.TicketID = ?`,
      [ticketId]
    );

    if (!ticketResult[0] || !ticketResult[0][0]) {
      console.log(`❌ Ticket not found: #${ticketId}\n`);
      return;
    }

    const ticket = ticketResult[0][0];
    console.log(`✅ Ticket: "${ticket.Title}"`);
    console.log(`   Client: ${ticket.ClientName} (${ticket.ClientEmail})`);
    console.log(`   Engineer: ${ticket.EngineerName || 'Not assigned'}\n`);

    if (!ticket.EngineerEmail) {
      console.log(`⚠️ No engineer email found for ticket #${ticketId}\n`);
      return;
    }

    // Prepare email variables
    const emailVars = {
      TicketID: ticket.TicketID,
      TicketTitle: ticket.Title,
      ClientName: ticket.ClientName,
      EngineerName: ticket.EngineerName || 'Support Team',
      StatusName: ticket.StatusName || 'Reopened',
      Priority: ticket.PriorityName || 'Standard',
      ReopenedAt: new Date().toLocaleString(),
      SLA_DEADLINE: ticket.SLADeadline ? new Date(ticket.SLADeadline).toLocaleString() : 'N/A',
    };

    // Send email to ENGINEER
    console.log(`[EMAIL] Sending REOPENED notification to ENGINEER (${ticket.EngineerEmail})...`);
    const engineerTemplate = await getTemplate('TICKET_REOPENED', 'Engineer');
    if (engineerTemplate && ticket.EngineerEmail) {
      const { subject, body } = renderTemplate(engineerTemplate, emailVars);
      await sendEmail(
        ticket.EngineerEmail,
        subject,
        body,
        'TICKET_REOPENED',
        ticketId,
        ticket.EngineerName,
        'Engineer'
      );
      console.log(`✅ REOPENED notification sent to ENGINEER\n`);
    } else {
      console.log(`⚠️ Skipped ENGINEER email - Template: ${engineerTemplate ? 'OK' : 'MISSING'}\n`);
    }

    console.log(`${'='.repeat(70)}\n`);

  } catch (error) {
    console.error(`❌ [Email Error] ${error.message}\n`);
  }
};

module.exports = { notifyTicketCreated, notifyTicketResolved, notifyTicketAssigned, notifyTicketReopened };


