const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

async function test() {
  try {
    // Login
    const loginRes = await axios.post(`${API_URL}/auth/login`, {
      email: 'adityabhilore@gmail.com',
      password: 'password',
    });
    const token = loginRes.data.data.token;

    // Get company
    const res = await axios.get(`${API_URL}/companies/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log('Response status:', res.status);
    console.log('Response data:', JSON.stringify(res.data, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
    if (err.response?.data) {
      console.error('Response:', err.response.data);
    }
  }
}

test();
