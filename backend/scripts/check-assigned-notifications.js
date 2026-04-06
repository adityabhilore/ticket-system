const db = require('../config/database');

(async () => {
  try {
    const rows = await db.query(`
      SELECT n.NotificationID, n.UserID, u.Name, u.Role, n.TicketID, n.Type, n.Title, n.Message, n.IsRead, n.CreatedAt
      FROM Notifications n
      LEFT JOIN Users u ON u.UserID = n.UserID
      WHERE n.TicketID IN (26,27,28,29,30)
      ORDER BY n.TicketID DESC, n.NotificationID DESC
    `);

    console.table(rows[0] || []);
    process.exit(0);
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
})();
