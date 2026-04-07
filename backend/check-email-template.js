const mysql = require('mysql2/promise');

const main = async () => {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Aditya@2004',
    database: 'TicketingSystem',
  });

  // First, let's see what templates exist
  console.log('=== ALL EMAIL TEMPLATES ===\n');
  const [allTemplates] = await connection.execute(
    `SELECT TemplateName, TemplateType, RecipientRole FROM EmailTemplates`
  );
  console.table(allTemplates);

  // Now look for resolved template
  console.log('\n=== LOOKING FOR RESOLVED TEMPLATE ===\n');
  const [results] = await connection.execute(
    `SELECT TemplateName, TemplateType, RecipientRole, Body FROM EmailTemplates 
     WHERE TemplateType LIKE '%RESOLVED%'`
  );

  if (results.length > 0) {
    results.forEach((template, idx) => {
      console.log(`\n--- Template ${idx + 1}: ${template.TemplateName} (${template.TemplateType}) ---`);
      console.log(`RecipientRole: ${template.RecipientRole}`);
      const body = template.Body;
      console.log('\nBody snippet (first 500 chars):');
      console.log(body.substring(0, 500));
      console.log('\n=== CHECKING FOR PLACEHOLDERS ===');
      console.log('Has {{confirmUrl}}:', body.includes('{{confirmUrl}}'));
      console.log('Has {{reopenUrl}}:', body.includes('{{reopenUrl}}'));
      console.log('Has {{ConfirmUrl}}:', body.includes('{{ConfirmUrl}}'));
      console.log('Has {{ReopenUrl}}:', body.includes('{{ReopenUrl}}'));
      console.log('Has {{CONFIRMURL}}:', body.includes('{{CONFIRMURL}}'));
      console.log('Has {{REOPENURL}}:', body.includes('{{REOPENURL}}'));
    });
  } else {
    console.log('No resolved templates found');
  }

  await connection.end();
};

main().catch(console.error);
