const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

let transporter = null;

/**
 * Initialize email transporter (SMTP connection)
 * Creates a reusable connection pool for sending emails
 */
const initEmailService = () => {
  if (transporter) return transporter;

  console.log(`📧 [EmailConfig] Initializing email service...`);
  
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: process.env.SMTP_PORT === '465',  // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  console.log(`✅ [EmailConfig] Email service initialized`);
  console.log(`   SMTP_HOST: ${process.env.SMTP_HOST}`);
  console.log(`   SMTP_PORT: ${process.env.SMTP_PORT}`);
  console.log(`   SMTP_USER: ${process.env.SMTP_USER}`);
  
  return transporter;
};

/**
 * Get transporter instance (lazy initialization)
 */
const getTransporter = () => {
  if (!transporter) {
    initEmailService();
  }
  return transporter;
};

module.exports = { initEmailService, getTransporter };
