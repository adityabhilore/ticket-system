const axios = require('axios');
const mysql = require('mysql2/promise');

const API_URL = 'http://localhost:5000/api';
const DB_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: 'Aditya@2004',
  database: 'TicketingSystem',
};

let token = '';
let ticketId = '';
let userId = '';

const logStep = (title) => console.log(`\n\n${'='.repeat(70)}\n${title}\n${'='.repeat(70)}`);

const test = async () => {
  try {
    // Step 1: Login as engineer
    logStep('STEP 1: LOGIN AS ENGINEER');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: 'bhiloreaditya53@gmail.com',
      password: 'Aditya@2004'
    });
    token = loginRes.data.data.token;
    userId = loginRes.data.data.user.userId;
    console.log(`✅ Logged in as Engineer.`);
    console.log(`✅ Token: ${token.substring(0, 30)}...`);
    console.log(`✅ User ID: ${userId}`);

    // Step 2: Get or create a ticket
    logStep('STEP 2: GET A TICKET');
    const ticketsRes = await axios.get(`${API_URL}/tickets`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    let tickets = Array.isArray(ticketsRes.data) ? ticketsRes.data : ticketsRes.data.data || [];
    const openTickets = tickets.filter(t => t.StatusID === 1 || t.StatusID === 2);
    if (openTickets.length > 0) {
      ticketId = openTickets[0].TicketID;
      console.log(`✅ Found ticket #${ticketId} (Status: ${openTickets[0].Status})`);
    } else {
      console.log(`❌ No open/in-progress tickets found`);
      console.log(`Available tickets: ${tickets.map(t => `#${t.TicketID}`).join(', ')}`);
      return;
    }

    // Step 3: Get ticket details BEFORE status update
    logStep('STEP 3: GET TICKET BEFORE STATUS UPDATE');
    const ticketBefore = await axios.get(`${API_URL}/tickets/${ticketId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const ticketDataBefore = ticketBefore.data.data?.ticket || ticketBefore.data.ticket;
    console.log(`✅ Ticket Status: ${ticketDataBefore?.StatusName}`);
    console.log(`✅ ReopenToken (before): ${ticketDataBefore?.ReopenToken || '(empty)'}`);
    console.log(`✅ ReopenTokenExp (before): ${ticketDataBefore?.ReopenTokenExp || '(empty)'}`);

    // Step 4: Update ticket status to RESOLVED (4)
    logStep('STEP 4: UPDATE TICKET STATUS TO RESOLVED');
    const updateRes = await axios.put(
      `${API_URL}/tickets/${ticketId}/status`,
      { statusId: 4 },  // 4 = Resolved
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    console.log(`✅ Status update response:`, updateRes.data);

    // Wait a moment for the email to be queued/sent
    await new Promise(r => setTimeout(r, 2000));

    // Step 5: Check ticket details AFTER status update
    logStep('STEP 5: GET TICKET AFTER STATUS UPDATE');
    const ticketAfter = await axios.get(`${API_URL}/tickets/${ticketId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const ticketDataAfter = ticketAfter.data.data?.ticket || ticketAfter.data.ticket;
    console.log(`✅ Ticket Status: ${ticketDataAfter?.StatusName}`);
    console.log(`✅ ReopenToken (after): ${ticketDataAfter?.ReopenToken ? ticketDataAfter.ReopenToken.substring(0, 40) + '...' : '(empty)'}`);
    console.log(`✅ ReopenTokenExp (after): ${ticketDataAfter?.ReopenTokenExp}`);

    if (!ticketDataAfter?.ReopenToken) {
      console.log(`\n⚠️ CRITICAL ISSUE: ReopenToken is still empty after status update!`);
      return;
    }

    // Step 6: Query database directly to confirm token is saved
    logStep('STEP 6: QUERY DATABASE DIRECTLY');
    const conn = await mysql.createConnection(DB_CONFIG);
    const [dbResults] = await conn.execute(
      'SELECT TicketID, StatusID, ReopenToken, ReopenTokenExp FROM Tickets WHERE TicketID = ?',
      [ticketId]
    );
    if (dbResults.length > 0) {
      const dbTicket = dbResults[0];
      console.log(`✅ DB Query Result:`);
      console.log(`   TicketID: ${dbTicket.TicketID}`);
      console.log(`   StatusID: ${dbTicket.StatusID}`);
      console.log(`   ReopenToken: ${dbTicket.ReopenToken ? dbTicket.ReopenToken.substring(0, 40) + '...' : '(null)'}`);
      console.log(`   ReopenTokenExp: ${dbTicket.ReopenTokenExp}`);
    }

    // Step 7: Construct and test the email link
    logStep('STEP 7: TEST EMAIL LINK WITH TOKEN');
    const reopenUrl = `http://localhost:5000/api/tickets/${ticketId}/confirm-resolved?token=${ticketDataAfter.ReopenToken}&action=reopen`;
    console.log(`✅ Reopen URL:`);
    console.log(`   ${reopenUrl}`);
    console.log(`\n📮 Testing the reopen link...`);
    
    const emailLinkRes = await axios.get(reopenUrl, { 
      validateStatus: () => true 
    });
    console.log(`✅ Response Status: ${emailLinkRes.status}`);
    console.log(`\n📋 Response Body (first 500 chars):`);
    console.log(emailLinkRes.data.substring(0, 500));
    console.log(`\n✅ Response includes "success": ${emailLinkRes.data.includes('success')}`);
    console.log(`✅ Response includes "Invalid": ${emailLinkRes.data.includes('Invalid')}`);
    console.log(`✅ Response includes "error": ${emailLinkRes.data.includes('error')}`);
    console.log(`✅ Response includes "Reopened": ${emailLinkRes.data.includes('Reopened')}`);
    console.log(`✅ Response includes "Successfully": ${emailLinkRes.data.includes('Successfully')}`);
    
    if (emailLinkRes.data.includes('Invalid') || emailLinkRes.data.includes('ERROR')) {
      console.log(`\n❌ EMAIL LINK TEST FAILED`);
      console.log(`Response: ${emailLinkRes.data.substring(0, 500)}`);
    } else if (emailLinkRes.status === 200) {
      console.log(`\n✅ EMAIL LINK TEST PASSED - Token validation successful`);
    }

    await conn.end();

  } catch (err) {
    console.error(`\n❌ ERROR: ${err.message}`);
    if (err.response?.data) {
      console.error(`Response:`, err.response.data);
    }
  }
};

test();
