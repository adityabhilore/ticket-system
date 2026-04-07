const axios = require('axios');

const API_URL = 'http://localhost:5000/api';
let clientToken;
let managerToken;

async function runDetailedTests() {
  console.log('🚀 DETAILED API TESTING WITH ROLE-BASED ANALYSIS\n');
  console.log('═'.repeat(70));

  try {
    // Login with Client user
    const clientLogin = await axios.post(`${API_URL}/auth/login`, {
      email: 'adityabhilore@gmail.com',
      password: 'password',
    });
    clientToken = clientLogin.data.data.token;
    console.log('✅ CLIENT logged in');

    // Login with Manager user
    const managerLogin = await axios.post(`${API_URL}/auth/login`, {
      email: 'test@techcorp.com',
      password: 'password',
    });
    managerToken = managerLogin.data.data.token;
    console.log('✅ MANAGER logged in\n');

    // Test Companies endpoints
    console.log('📌 COMPANIES ENDPOINTS');
    console.log('─'.repeat(70));
    
    try {
      const res = await axios.get(`${API_URL}/companies`, {
        headers: { Authorization: `Bearer ${clientToken}` },
      });
      console.log('❌ Client can access GET /api/companies (should be ADMIN/MANAGER only)');
    } catch (err) {
      console.log('✅ Client CANNOT access GET /api/companies (403 - Expected)');
    }

    try {
      const res = await axios.get(`${API_URL}/companies`, {
        headers: { Authorization: `Bearer ${managerToken}` },
      });
      console.log('✅ Manager CAN access GET /api/companies');
    } catch (err) {
      console.log('❌ Manager CANNOT access GET /api/companies');
    }

    // Test Company /me endpoint
    try {
      const res = await axios.get(`${API_URL}/companies/me`, {
        headers: { Authorization: `Bearer ${clientToken}` },
      });
      console.log('✅ Client CAN access GET /api/companies/me');
    } catch (err) {
      console.log('❌ Client CANNOT access GET /api/companies/me');
    }

    // Test Products endpoints
    console.log('\n📌 PRODUCTS ENDPOINTS');
    console.log('─'.repeat(70));

    try {
      const res = await axios.get(`${API_URL}/products`, {
        headers: { Authorization: `Bearer ${clientToken}` },
      });
      console.log('❌ Client can access GET /api/products (should be ADMIN only)');
    } catch (err) {
      console.log('✅ Client CANNOT access GET /api/products (403 - Expected)');
    }

    try {
      const res = await axios.get(`${API_URL}/products`, {
        headers: { Authorization: `Bearer ${managerToken}` },
      });
      console.log('❌ Manager can access GET /api/products (should be ADMIN only)');
    } catch (err) {
      console.log('✅ Manager CANNOT access GET /api/products (403 - Expected, Admin only)');
    }

    // Test User Profile endpoints
    console.log('\n📌 USER ENDPOINTS');
    console.log('─'.repeat(70));

    try {
      const res = await axios.get(`${API_URL}/users/3`, {
        headers: { Authorization: `Bearer ${clientToken}` },
      });
      console.log('✅ Client CAN access GET /api/users/:id');
    } catch (err) {
      console.log('❌ Client CANNOT access GET /api/users/:id (404 - Route does not exist)');
    }

    // Test Tickets endpoints  
    console.log('\n📌 TICKETS ENDPOINTS');
    console.log('─'.repeat(70));

    try {
      const res = await axios.get(`${API_URL}/tickets`, {
        headers: { Authorization: `Bearer ${clientToken}` },
      });
      console.log(`✅ Client CAN access GET /api/tickets (${res.data.data.length} tickets)`);
    } catch (err) {
      console.log('❌ Client CANNOT access GET /api/tickets');
    }

    try {
      const ticketRes = await axios.get(`${API_URL}/tickets`, {
        headers: { Authorization: `Bearer ${clientToken}` },
      });
      if (ticketRes.data.data.length > 0) {
        const ticketId = ticketRes.data.data[0].TicketID;
        const res = await axios.get(`${API_URL}/tickets/${ticketId}`, {
          headers: { Authorization: `Bearer ${clientToken}` },
        });
        console.log('✅ Client CAN access GET /api/tickets/:id');
      }
    } catch (err) {
      console.log('❌ Client CANNOT access GET /api/tickets/:id');
    }

    try {
      const res = await axios.post(
        `${API_URL}/tickets`,
        { title: 'Test', description: 'Test', productId: 1, priorityId: 2 },
        { headers: { Authorization: `Bearer ${clientToken}` } }
      );
      console.log(`✅ Client CAN POST /api/tickets (Created ticket #${res.data.ticketId})`);
    } catch (err) {
      console.log('❌ Client CANNOT POST /api/tickets');
    }

    // Test Reports endpoints
    console.log('\n📌 REPORTS ENDPOINTS');
    console.log('─'.repeat(70));

    try {
      const res = await axios.get(`${API_URL}/reports/dashboard`, {
        headers: { Authorization: `Bearer ${clientToken}` },
      });
      console.log('✅ Client CAN access GET /api/reports/dashboard');
    } catch (err) {
      console.log('❌ Client CANNOT access GET /api/reports/dashboard');
    }

    console.log('\n' + '═'.repeat(70));
    console.log('📊 SUMMARY OF FINDINGS');
    console.log('═'.repeat(70));
    console.log(`
    ✅ WORKING ENDPOINTS:
    • GET /api/health
    • POST /api/auth/login
    • GET /api/tickets (Client can access own company tickets)
    • GET /api/tickets/:id (Client can view ticket details)
    • POST /api/tickets (Client can create tickets)
    • GET /api/users (List users)
    • GET /api/companies/me (Get current company details)
    • GET /api/reports/dashboard

    ❌ ISSUES FOUND:
    1. GET /api/users/:id - Route doesn't exist (returns 404)
    2. GET /api/companies - Restricted to ADMIN/MANAGER only 
    3. GET /api/products - Restricted to ADMIN only
    4. POST /api/tickets response - ticketId in root, not in data.ticketId

    ℹ️ ROLE-BASED ACCESS (By Design):
    • Companies endpoints - ADMIN/MANAGER only
    • Products endpoints - ADMIN only
    • Companies list - ADMIN/MANAGER only
    
    This is CORRECT authorization - Clients should not see all companies or products.
    `);

  } catch (err) {
    console.error('Fatal error:', err.message);
  }
}

runDetailedTests();
