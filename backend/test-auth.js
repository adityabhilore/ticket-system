const axios = require('axios');

const API_URL = 'http://localhost:5000/api';
let token;

async function test() {
  try {
    // Step 1: Login
    console.log('\n=== STEP 1: LOGIN ===');
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: 'adityabhilore@gmail.com',
      password: 'password',
    });
    console.log('Login response:', loginRes.data);
    token = loginRes.data.data?.token;
    console.log('Token extracted:', token ? token.substring(0, 30) + '...' : 'NONE');

    if (!token) {
      throw new Error('No token in login response');
    }

    // Step 2: Get tickets list
    console.log('\n=== STEP 2: GET TICKETS LIST ===');
    const ticketsRes = await axios.get(`${API_URL}/tickets`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log('Tickets response:', ticketsRes.data);
    const ticketId = ticketsRes.data.data?.[0]?.TicketID;
    console.log('First ticket ID:', ticketId);

    if (!ticketId) {
      throw new Error('No tickets found');
    }

    // Step 3: Get ticket detail
    console.log('\n=== STEP 3: GET TICKET DETAIL ===');
    const ticketDetailRes = await axios.get(`${API_URL}/tickets/${ticketId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    console.log('Ticket detail response:', ticketDetailRes.data);

    console.log('\n✅ ALL TESTS PASSED');
  } catch (err) {
    console.error('\n❌ ERROR:', {
      status: err.response?.status,
      statusText: err.response?.statusText,
      message: err.response?.data?.message || err.message,
      data: err.response?.data,
      url: err.config?.url,
      headers: err.config?.headers,
    });
  }
}

test();
