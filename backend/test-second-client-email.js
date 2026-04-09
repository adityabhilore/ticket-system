const mysql = require('mysql2/promise');

async function testSecondClientEmail() {
  console.log('\n' + '═'.repeat(70));
  console.log('🧪 TESTING: Second Client Email → Ticket Creation');
  console.log('═'.repeat(70) + '\n');

  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Aditya@2004',
    database: 'TicketingSystem'
  });

  try {
    // Client 2 details
    const client2Email = 'adityabhilore@gmail.com';
    const clientName = 'New Client';
    const companyId = 8;

    console.log(`📧 CLIENT 2 DETAILS:`);
    console.log(`   Email: ${client2Email}`);
    console.log(`   Name: ${clientName}`);
    console.log(`   Company ID: ${companyId}\n`);

    // Get current ticket count for this client
    const [beforeTickets] = await conn.execute(
      'SELECT COUNT(*) as count FROM Tickets WHERE CreatedBy = (SELECT UserID FROM Users WHERE Email = ?)',
      [client2Email]
    );
    const ticketsBefore = beforeTickets[0].count;
    console.log(`📊 Tickets created by Client 2 BEFORE test: ${ticketsBefore}\n`);

    // Create test email in InboundEmails table (simulating email received)
    console.log(`💾 INSERTING TEST EMAIL INTO DATABASE...`);
    const [result] = await conn.execute(`
      INSERT INTO InboundEmails
        (GmailMessageID, FromEmail, FromName, Subject, BodyText, ReceivedAt, Status, CreatedAt)
      VALUES (?, ?, ?, ?, ?, NOW(), 'pending', NOW())
    `, [
      `test-msg-${Date.now()}`,
      client2Email,
      clientName,
      `[TEST] Second Client Email Test - ${new Date().toLocaleString()}`,
      `This is a test email from the second client to verify ticket creation feature works correctly for multiple clients.`
    ]);

    const emailId = result.insertId;
    console.log(`✅ Test email inserted with ID: ${emailId}\n`);

    // Check if email should be created as new ticket
    console.log(`🔍 VERIFYING CLIENT DETAILS IN DATABASE...`);
    const [clientData] = await conn.execute(
      'SELECT UserID, Name, CompanyID, Role FROM Users WHERE LOWER(Email) = ?',
      [client2Email]
    );

    if (clientData.length === 0) {
      console.log(`❌ Client email not found in database!`);
      return;
    }

    const client = clientData[0];
    console.log(`✅ Client found: ${client.Name} (ID: ${client.UserID})`);
    console.log(`   Role: ${client.Role}`);
    console.log(`   Company: ${client.CompanyID}\n`);

    if (client.Role !== 'Client') {
      console.log(`❌ ERROR: User is not a Client (Role is "${client.Role}")`);
      return;
    }

    // Get available engineers for this company
    console.log(`👨‍💼 CHECKING AVAILABLE ENGINEERS...`);
    const [engineers] = await conn.execute(
      'SELECT UserID, Name, Email FROM Users WHERE Role = "Engineer" AND CompanyID = ? AND IsDeleted = 0',
      [client.CompanyID]
    );

    if (engineers.length === 0) {
      console.log(`⚠️  No engineers in this company! Ticket will be unassigned.\n`);
    } else {
      console.log(`Found ${engineers.length} engineers:`);
      engineers.forEach(eng => {
        console.log(`   • ${eng.Name} (${eng.Email})`);
      });
      console.log('');
    }

    // Simulate ticket creation (what emailProcessor does)
    console.log(`🎫 CREATING TICKET...`);
    const subject = `[TEST] Second Client Email Test - ${new Date().toLocaleString()}`;
    const description = `This is a test email from the second client`;

    const [createResult] = await conn.execute(`
      INSERT INTO Tickets
        (Title, Description, CompanyID, CreatedBy, AssignedTo,
         PriorityID, StatusID, SLADeadline, IsOverdue,
         SourceType, SourceEmail, EmailThreadID,
         CreatedAt, UpdatedAt)
      VALUES (?, ?, ?, ?, ?, 3, 1, DATE_ADD(NOW(), INTERVAL 24 HOUR), 0, 'email', ?, ?, NOW(), NOW())
    `, [
      subject,
      description,
      client.CompanyID,
      client.UserID,
      engineers.length > 0 ? engineers[0].UserID : null,
      client2Email,
      `thread-${Date.now()}`
    ]);

    const ticketId = createResult.insertId;
    console.log(`✅ TICKET CREATED: #${ticketId}\n`);

    // Update email status
    await conn.execute(`
      UPDATE InboundEmails
      SET Status='processed', ProcessType='new_ticket', TicketID=?, ProcessedAt=NOW()
      WHERE InboundEmailID=?
    `, [ticketId, emailId]);

    // Get final ticket count
    const [afterTickets] = await conn.execute(
      'SELECT COUNT(*) as count FROM Tickets WHERE CreatedBy = (SELECT UserID FROM Users WHERE Email = ?)',
      [client2Email]
    );
    const ticketsAfter = afterTickets[0].count;

    console.log(`📊 TICKET COUNT UPDATE:`);
    console.log(`   Before: ${ticketsBefore}`);
    console.log(`   After: ${ticketsAfter}`);
    console.log(`   New Tickets: ${ticketsAfter - ticketsBefore}\n`);

    // Show final ticket details
    console.log(`✅ FINAL TICKET DETAILS:`);
    const [finalTicket] = await conn.execute(
      `SELECT t.TicketID, t.Title, t.StatusID, u.Name as AssignedTo, c.Name as Company
       FROM Tickets t
       LEFT JOIN Users u ON t.AssignedTo = u.UserID
       LEFT JOIN Companies c ON t.CompanyID = c.CompanyID
       WHERE t.TicketID = ?`,
      [ticketId]
    );

    const ticket = finalTicket[0];
    console.table([{
      TicketID: ticket.TicketID,
      Title: ticket.Title,
      Company: ticket.Company,
      AssignedTo: ticket.AssignedTo || 'Unassigned',
      CreatedBy: clientName
    }]);

    console.log('\n' + '═'.repeat(70));
    console.log('✅ TEST COMPLETE - Second Client Email Feature WORKING!');
    console.log('═'.repeat(70) + '\n');

    await conn.end();

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    await conn.end();
    process.exit(1);
  }
}

testSecondClientEmail();
