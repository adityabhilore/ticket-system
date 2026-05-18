import axios from 'axios';

// Force Vercel rebuild: 12:30 UTC
// Production: https://ticket-system-api-5pr4.onrender.com/api
// Local: http://localhost:5000/api
const API_URL = 'https://ticket-system-api-5pr4.onrender.com/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Accept-Charset': 'utf-8',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    console.log('✅ Token added to request:', token.substring(0, 20) + '...');
  } else {
    console.warn('⚠️  No token found in localStorage');
  }
  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', {
      status: error.response?.status,
      message: error.response?.data?.message,
      url: error.config?.url,
      headers: error.config?.headers,
    });

    if (error.response?.status === 401) {
      console.warn('🔓 Unauthorized (401) - Logging out');
      // Clear token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
