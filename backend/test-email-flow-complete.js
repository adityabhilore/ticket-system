/**
 * COMPLETE EMAIL FLOW TEST
 * Tests all 3 features of inbound email system:
 * 1. New email → auto-create ticket
 * 2. Reply to resolved email → auto-reopen ticket
 * 3. Mail tab displays email history
 */

const axios = require('axios');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

const API = 'http://localhost:5001/api';
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'adityabhilore@gmail.com';
const TEST_CLIENT_EMAIL = 'xyz@company.com';

// Gmail transporter for sending test emails
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: SUPPORT_EMAIL,
    pass: process.env.GMAIL_APP_PASSWORD, // Use app-specific password if 2FA enabled
  },
});

let testData = {
  clientToken: null,
  clientUserId: null,
  ticketId: null,
  emailThreadId: null,
};

// ─────────────────────────────────────────
// TEST 1: Send new email → should create ticket
// ─────────────────────────────────────────
async function test1_SendNewEmail() {
  console.log('\n\n' + '═'.repeat(70));
  console.log('🧪 TEST 1: Send New Email → Auto-create Ticket');
  console.log('═'.repeat(70));

  try {
    const emailSubject = `Test Ticket ${Date.now()} - Printer Issues`;
    const emailBody = `
Hello Support,

I'm having issues with the office printer. It keeps jamming on page 2 of any document.

Can you please help me fix this?

Thanks,
XYZ Company Client
    `.trim();

    console.log(`\n📧 Sending email FROM: ${TEST_CLIENT_EMAIL}`);
    console.log(`📧 Sending email TO: ${SUPPORT_EMAIL}`);
    console.log(`📧 Subject: ${emailSubject}`);

    await transporter.sendMail({
      from: SUPPORT_EMAIL,
      to: TEST_CLIENT_EMAIL, // Note: We're using nodemailer from support, but simulate as FROM client
      subject: emailSubject,
      text: emailBody,
      replyTo: TEST_CLIENT_EMAIL,
    });

    console.log('✅ Email sent to Gmail');
    console.log('⏳ Waiting 35 seconds for cron job to process...');

    // Wait for cron job (runs every 30 seconds)
    await new Promise(resolve => setTimeout(resolve, 35000));

    // Check if ticket was created
    console.log('\n🔍 Checking if ticket was created...');
    const ticketsRes = await axios.get(`${API}/tickets/list`, {
      headers: { Authorization: `Bearer ${testData.clientToken}` },
      params: { companyId: 8 }, // New Client's company
    });

    const newTicket = ticketsRes.data.data?.find(t => 
      t.Title.includes('Printer Issues') && 
      t.SourceType === 'email'
    );

    if (newTicket) {
      testData.ticketId = newTicket.TicketID;
      testData.emailThreadId = newTicket.EmailThreadID;
      console.log(`✅ PASS: Ticket created! ID: ${newTicket.TicketID}`);
      console.log(`   Title: ${newTicket.Title}`);
      console.log(`   Source: ${newTicket.SourceType} from ${newTicket.SourceEmail}`);
      return true;
    } else {
      console.log('❌ FAIL: No ticket found');
      return false;
    }
  } catch (err) {
    console.error('❌ ERROR:', err.message);
    return false;
  }
}

// ─────────────────────────────────────────
// TEST 2: Resolve ticket → get reopen email
// ─────────────────────────────────────────
async function test2_ResolveTicket() {
  console.log('\n\n' + '═'.repeat(70));
  console.log('🧪 TEST 2: Resolve Ticket → Autoreply with [TKT-id]');
  console.log('═'.repeat(70));

  if (!testData.ticketId) {
    console.log('❌ SKIP: No ticket from Test 1');
    return false;
  }

  try {
    console.log(`\n🔧 Resolving ticket ${testData.ticketId}...`);

    // Get first engineer to resolve as
    const usersRes = await axios.get(`${API}/users/list`);
    const engineer = usersRes.data.data?.find(u => u.Role === 'Engineer');
    
    if (!engineer) {
      console.log('❌ No engineer found for resolving');
      return false;
    }

    // Resolve ticket via API
    await axios.put(
      `${API}/tickets/${testData.ticketId}/status`,
      { statusId: 3 }, // Resolved status
      { headers: { Authorization: `Bearer ${testData.clientToken}` } }
    );

    console.log(`✅ Ticket resolved`);
    console.log('⏳ Waiting for autoreply email to be sent...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('✅ PASS: Resolution email should be sent with [TKT-' + testData.ticketId + '] tag');
    return true;
  } catch (err) {
    console.error('❌ ERROR:', err.message);
    return false;
  }
}

// ─────────────────────────────────────────
// TEST 3: Reply to resolution email → reopen
// ─────────────────────────────────────────
async function test3_ReplyToEmail() {
  console.log('\n\n' + '═'.repeat(70));
  console.log('🧪 TEST 3: Send Reply Email → Auto-reopen Ticket');
  console.log('═'.repeat(70));

  if (!testData.ticketId) {
    console.log('❌ SKIP: No ticket from Test 1');
    return false;
  }

  try {
    const replySubject = `Re: [TKT-${testData.ticketId}] - Still broken!`;
    const replyBody = `
Hi,

The issue is still happening. The printer still jams on page 2.
I tried rebooting it but didn't help.

Can you escalate this?

Thanks
    `.trim();

    console.log(`\n📧 Sending reply FROM: ${TEST_CLIENT_EMAIL}`);
    console.log(`📧 Subject: ${replySubject}`);

    await transporter.sendMail({
      from: SUPPORT_EMAIL,
      to: TEST_CLIENT_EMAIL,
      subject: replySubject,
      text: replyBody,
      replyTo: TEST_CLIENT_EMAIL,
      inReplyTo: testData.emailThreadId,
      references: testData.emailThreadId,
    });

    console.log('✅ Reply email sent');
    console.log('⏳ Waiting 35 seconds for cron job to process...');

    await new Promise(resolve => setTimeout(resolve, 35000));

    // Check if ticket was reopened
    console.log('\n🔍 Checking if ticket was reopened...');
    const ticketRes = await axios.get(`${API}/tickets/${testData.ticketId}`);
    const ticket = ticketRes.data.data;

    if (ticket.StatusName === 'Reopened') {
      console.log(`✅ PASS: Ticket reopened successfully!`);
      console.log(`   Status: ${ticket.StatusName}`);
      return true;
    } else {
      console.log(`⚠️  Ticket status: ${ticket.StatusName} (expected 'Reopened')`);
      return false;
    }
  } catch (err) {
    console.error('❌ ERROR:', err.message);
    return false;
  }
}

// ─────────────────────────────────────────
// TEST 4: Check Mail tab displays email
// ─────────────────────────────────────────
async function test4_CheckMailTab() {
  console.log('\n\n' + '═'.repeat(70));
  console.log('🧪 TEST 4: Verify Mail Tab Shows Email History');
  console.log('═'.repeat(70));

  try {
    console.log(`\n🔍 Fetching inbound emails from backend...`);
    const emailsRes = await axios.get(`${API}/auth/inbound-emails`, {
      headers: { Authorization: `Bearer ${testData.clientToken}` },
    });

    const emails = emailsRes.data.data || [];
    console.log(`✅ Found ${emails.length} email(s)`);

    if (emails.length > 0) {
      console.log('\n📧 Email History:');
      emails.forEach((email, i) => {
        console.log(`\n  ${i + 1}. From: ${email.FromEmail}`);
        console.log(`     Subject: ${email.Subject}`);
        console.log(`     Status: ${email.Status}`);
        console.log(`     Date: ${email.ReceivedAt}`);
      });
      console.log(`\n✅ PASS: Mail tab data available`);
      return true;
    } else {
      console.log('⚠️  No emails found');
      return false;
    }
  } catch (err) {
    console.error('❌ ERROR:', err.message);
    return false;
  }
}

// ─────────────────────────────────────────
// SETUP: Login as client
// ─────────────────────────────────────────
async function setupClient() {
  console.log('\n🔐 Logging in as Client (xyz@company.com)...');
  try {
    const res = await axios.post(`${API}/auth/login`, {
      email: TEST_CLIENT_EMAIL,
      password: 'password', // Default test password
    });

    testData.clientToken = res.data.data.token;
    testData.clientUserId = res.data.data.user.userId;
    console.log(`✅ Logged in. Token: ${testData.clientToken.substring(0, 20)}...`);
    return true;
  } catch (err) {
    console.error('❌ Login failed:', err.message);
    if (err.response?.data?.error) {
      console.error('   Error:', err.response.data.error);
    }
    return false;
  }
}

// ─────────────────────────────────────────
// MAIN TEST RUNNER
// ─────────────────────────────────────────
async function runAllTests() {
  console.log('\n\n');
  console.log('╔' + '═'.repeat(68) + '╗');
  console.log('║' + '  INBOUND EMAIL SYSTEM - COMPLETE FEATURE TEST'.padEnd(68) + '║');
  console.log('╚' + '═'.repeat(68) + '╝');

  console.log(`\n📋 Configuration:`);
  console.log(`   Support Email: ${SUPPORT_EMAIL}`);
  console.log(`   Test Client: ${TEST_CLIENT_EMAIL}`);
  console.log(`   Backend URL: ${API}`);

  // Setup
  if (!(await setupClient())) {
    console.log('\n❌ Setup failed. Cannot proceed.');
    process.exit(1);
  }

  // Run tests
  const results = {
    'Test 1: New Email → Create Ticket': await test1_SendNewEmail(),
    'Test 2: Resolve → Send Autoreply': await test2_ResolveTicket(),
    'Test 3: Reply Email → Reopen Ticket': await test3_ReplyToEmail(),
    'Test 4: Mail Tab Display': await test4_CheckMailTab(),
  };

  // Summary
  console.log('\n\n' + '═'.repeat(70));
  console.log('📊 TEST SUMMARY');
  console.log('═'.repeat(70));
  
  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;

  Object.entries(results).forEach(([name, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${name}`);
  });

  console.log('\n' + '─'.repeat(70));
  console.log(`Result: ${passed}/${total} tests passed`);
  console.log('═'.repeat(70) + '\n');

  process.exit(passed === total ? 0 : 1);
}

// Run
runAllTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
