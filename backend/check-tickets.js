const mysql=require('mysql2/promise');

(async()=>{
  try {
    const c=await mysql.createConnection({
      host:'localhost',
      user:'root',
      password:'Aditya@2004',
      database:'TicketingSystem'
    });

    console.log('=== CHECKING ALL TICKETS (INCLUDING DELETED) ===\n');
    const [all]=await c.execute('SELECT TicketID, Title, IsDeleted, DeletedAt, DeletedBy FROM Tickets ORDER BY TicketID');
    console.table(all);

    console.log('\n=== AUTO_INCREMENT STATUS ===');
    const [ai]=await c.execute('SELECT AUTO_INCREMENT FROM information_schema.TABLES WHERE TABLE_NAME=? AND TABLE_SCHEMA=?', ['Tickets','TicketingSystem']);
    console.log('Current Auto Increment:', ai[0]);

    console.log('\n=== SOFT DELETED COUNT ===');
    const [deleted]=await c.execute('SELECT COUNT(*) as count FROM Tickets WHERE IsDeleted=1');
    console.log('Soft deleted tickets:', deleted[0].count);

    await c.end();
  } catch(e){
    console.error(e);
    process.exit(1);
  }
})();
