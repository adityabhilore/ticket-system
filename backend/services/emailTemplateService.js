const { query } = require('../config/database');

/**
 * Get email template from database
 * @param {string} templateType - Type (TICKET_CREATED, TICKET_ASSIGNED, etc)
 * @param {string} recipientRole - Role (Client, Engineer, Manager, Admin)
 * @returns {object|null} Template with Subject and Body
 */
const getTemplate = async (templateType, recipientRole = 'Client') => {
  try {
    console.log(`🔍 [Template] Getting: ${templateType} for ${recipientRole}`);

    const result = await query(
      `SELECT * FROM EmailTemplates 
       WHERE TemplateType = ? AND RecipientRole = ? AND IsActive = 1 
       LIMIT 1`,
      [templateType, recipientRole]
    );

    if (!result[0] || !result[0][0]) {
      console.log(`⚠️ [Template] Not found: ${templateType}/${recipientRole}`);
      return null;
    }

    console.log(`✅ [Template] Found: ${result[0][0].TemplateName}`);
    return result[0][0];

  } catch (error) {
    console.error(`❌ [Template] Error: ${error.message}`);
    return null;
  }
};

/**
 * Replace {{VARIABLES}} in template with actual values
 * 
 * Example:
 * Input:  Subject = "Ticket #{{TicketID}} assigned to {{EngineerName}}"
 *         variables = { TicketID: 57, EngineerName: "Rahul" }
 * Output: Subject = "Ticket #57 assigned to Rahul"
 * 
 * @param {object} template - Template object
 * @param {object} variables - Key-value pairs for replacement
 * @returns {object} { subject, body } with replacements done
 */
const renderTemplate = (template, variables) => {
  if (!template) {
    console.error(`❌ [Template] Template is null`);
    throw new Error('Template not found');
  }

  console.log(`🎨 [Template] Rendering with ${Object.keys(variables).length} variables...`);

  let subject = template.Subject;
  let body = template.Body;

  // Replace all {{VARIABLE}} patterns
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    const replacementValue = value !== null && value !== undefined ? String(value) : '(N/A)';
    subject = subject.replace(regex, replacementValue);
    body = body.replace(regex, replacementValue);
  });

  console.log(`✅ [Template] Rendered successfully`);
  return { subject, body };
};

module.exports = { getTemplate, renderTemplate };
