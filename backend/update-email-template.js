const mysql = require('mysql2/promise');

async function updateEmailTemplate() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Aditya@2004',
    database: 'TicketingSystem'
  });

  try {
    const newBody = `<h2>Hello {{ClientName}},</h2>
<p>Your support ticket has been resolved by our engineering team.</p>
<h3>Resolution Details:</h3>
<ul>
  <li><strong>Ticket ID:</strong> #{{TicketID}}</li>
  <li><strong>Title:</strong> {{TicketTitle}}</li>
  <li><strong>Engineer:</strong> {{EngineerName}}</li>
  <li><strong>Resolved At:</strong> {{ResolvedAt}}</li>
</ul>
<h3>Need Help?</h3>
<p>If you have any questions or concerns about the resolution, simply <strong>reply to this email</strong> and our team will assist you.</p>
<p><strong>Note:</strong> You have <strong>48 hours</strong> to reply if you need further assistance. After that, the ticket will be permanently closed.</p>
<p><a href="{{PORTAL_LINK}}" style="color:#2196F3;text-decoration:none;">View Full Ticket Details</a></p>
<p>Thank you for contacting us!<br/>TicketDesk Support Team</p>`;

    await conn.execute(
      'UPDATE EmailTemplates SET Body=? WHERE TemplateType=? AND RecipientRole=?',
      [newBody, 'TICKET_RESOLVED', 'Client']
    );

    console.log('\n✅ EMAIL TEMPLATE UPDATED!\n');
    console.log('❌ REMOVED:\n');
    console.log('   • "??? Yes, Issue Fixed" button');
    console.log('   • "??? Issue Not Resolved" button\n');
    console.log('✅ ADDED:\n');
    console.log('   • "Reply to this email" instruction');
    console.log('   • 48-hour window notice\n');

    await conn.end();
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    await conn.end();
    process.exit(1);
  }
}

updateEmailTemplate();
