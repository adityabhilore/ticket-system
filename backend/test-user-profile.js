const axios = require('axios');

const API_URL = 'http://localhost:5000/api';
let token;
let userId;

async function testUserProfile() {
  try {
    // Login
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: 'adityabhilore@gmail.com',
      password: 'password',
    });
    token = loginRes.data.data.token;
    userId = loginRes.data.data.user.userId;
    console.log('✅ Logged in as user', userId);

    // Test GET /api/users/:id
    console.log('\n📝 Testing: GET /api/users/:id');
    const res = await axios.get(`${API_URL}/users/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log('✅ Response status:', res.status);
    console.log('✅ User profile data:', JSON.stringify(res.data, null, 2));

  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.response?.data) {
      console.error('Response:', err.response.data);
    }
  }
}

testUserProfile();
