const mysql = require('mysql2/promise');

const main = async () => {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Aditya@2004',
    database: 'TicketingSystem',
  });

  const [results] = await connection.execute(
    `SELECT UserID, Email, Name, Role FROM Users LIMIT 20`
  );

  console.log('=== USERS IN DATABASE ===\n');
  console.table(results);

  // Also check tickets
  const [tickets] = await connection.execute(
    `SELECT TicketID, Title, StatusID, CreatedBy, AssignedTo FROM Tickets LIMIT 5`
  );

  console.log('\n=== OPEN TICKETS ===\n');
  console.table(tickets);

  await connection.end();
};

main().catch(console.error);
