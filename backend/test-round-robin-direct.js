const mysql = require('mysql2/promise');

async function testRoundRobin() {
  console.log('\n' + '═'.repeat(75));
  console.log('🔄 ROUND ROBIN TEST - DIRECT DATABASE CHECK');
  console.log('═'.repeat(75) + '\n');

  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'Aditya@2004',
      database: 'TicketingSystem'
    });

    // Step 1: Get all companies
    console.log('📋 Step 1: Getting all companies...\n');
    const [companies] = await conn.execute('SELECT CompanyID, Name FROM Companies WHERE IsDeleted = 0 LIMIT 5');
    
    if (companies.length === 0) {
      console.log('❌ No companies found');
      await conn.end();
      return;
    }

    console.log(`Found ${companies.length} company/companies:\n`);

    for (const company of companies) {
      console.log(`\n${'─'.repeat(75)}`);
      console.log(`🏢 Company: ${company.Name} (ID: ${company.CompanyID})`);
      console.log(`${'─'.repeat(75)}\n`);

      // Get engineers for this company
      const [engineers] = await conn.execute(
        `SELECT UserID, Name, Email FROM Users 
         WHERE Role = 'Engineer' AND CompanyID = ? AND IsDeleted = 0
         ORDER BY UserID ASC`,
        [company.CompanyID]
      );

      if (engineers.length === 0) {
        console.log('   ❌ No engineers in this company\n');
        continue;
      }

      console.log(`   📊 Engineers (${engineers.length}):\n`);

      // Get workload for each engineer
      const engineerStats = [];
      for (const eng of engineers) {
        const [openTickets] = await conn.execute(
          `SELECT COUNT(*) as OpenCount FROM Tickets t
           JOIN Status s ON t.StatusID = s.StatusID
           WHERE t.AssignedTo = ? AND LOWER(TRIM(s.Name)) NOT IN ('resolved', 'closed') 
           AND IFNULL(t.IsDeleted, 0) = 0`,
          [eng.UserID]
        );

        const openCount = openTickets[0]?.OpenCount || 0;
        engineerStats.push({
          UserID: eng.UserID,
          Name: eng.Name,
          Email: eng.Email,
          OpenTicketCount: openCount
        });
      }

      // Sort by workload
      engineerStats.sort((a, b) => a.OpenTicketCount - b.OpenTicketCount);

      // Display workload
      engineerStats.forEach((eng, idx) => {
        const bar = '█'.repeat(eng.OpenTicketCount) + '░'.repeat(Math.max(0, 10 - eng.OpenTicketCount));
        console.log(`   ${idx + 1}. ${eng.Name.padEnd(20)} | Open: ${String(eng.OpenTicketCount).padEnd(2)} | ${bar}`);
      });

      // Get EngineerAssignment info
      const [assignment] = await conn.execute(
        `SELECT AssignmentID, LastAssignedEngineerID, TotalAssignmentsInRotation, LastAssignmentAt
         FROM EngineerAssignment 
         WHERE CompanyID = ?`,
        [company.CompanyID]
      );

      console.log(`\n   🔄 Round-Robin Info:`);
      if (assignment.length > 0) {
        const assign = assignment[0];
        const lastEng = engineerStats.find(e => e.UserID === assign.LastAssignedEngineerID);
        console.log(`      Last Assigned: ${lastEng ? lastEng.Name : 'None'} (ID: ${assign.LastAssignedEngineerID})`);
        console.log(`      Total Assignments: ${assign.TotalAssignmentsInRotation}`);
        console.log(`      Last Assignment Time: ${assign.LastAssignmentAt}`);
      } else {
        console.log(`      No assignment record yet`);
      }

      // Test: Who would be assigned next?
      if (engineerStats.length > 0) {
        console.log(`\n   ✅ Next Engineer to be assigned: ${engineerStats[0].Name} (${engineerStats[0].OpenTicketCount} open tickets)`);
      }
    }

    console.log('\n' + '═'.repeat(75));
    console.log('✅ ROUND ROBIN CHECK COMPLETE');
    console.log('═'.repeat(75) + '\n');

    await conn.end();

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testRoundRobin();
