const axios = require('axios');

const API_URL = 'http://localhost:5000/api';
let token;

async function testCreateTicket() {
  try {
    // First login
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: 'adityabhilore@gmail.com',
      password: 'password',
    });
    token = loginRes.data.data.token;
    console.log('✅ Logged in');

    // Try to create a ticket
    console.log('\n📝 Creating ticket with payload:');
    const payload = {
      title: 'Test Ticket - ' + Date.now(),
      description: 'This is a test ticket',
      productId: 1,
      priorityId: 2,
    };
    console.log(JSON.stringify(payload, null, 2));

    const res = await axios.post(`${API_URL}/tickets`, payload, {
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log('\n📝 Response status:', res.status);
    console.log('📝 Response data:', JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    console.error('Status:', err.response?.status);
    console.error('Response:', err.response?.data);
  }
}

testCreateTicket();
