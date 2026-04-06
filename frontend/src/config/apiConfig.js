/**
 * API Configuration
 * Centralized API endpoints for the frontend
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: `${API_BASE_URL}/auth/login`,
    LOGOUT: `${API_BASE_URL}/auth/logout`,
    REGISTER: `${API_BASE_URL}/auth/register`,
    ME: `${API_BASE_URL}/auth/me`,
  },

  // Tickets
  TICKETS: {
    LIST: `${API_BASE_URL}/tickets`,
    GET: (id) => `${API_BASE_URL}/tickets/${id}`,
    CREATE: `${API_BASE_URL}/tickets`,
    UPDATE: (id) => `${API_BASE_URL}/tickets/${id}`,
    DELETE: (id) => `${API_BASE_URL}/tickets/${id}`,
    ASSIGN: (id) => `${API_BASE_URL}/tickets/${id}/assign`,
    RESOLVE: (id) => `${API_BASE_URL}/tickets/${id}/resolve`,
    ADD_COMMENT: (id) => `${API_BASE_URL}/tickets/${id}/comments`,
    GET_COMMENTS: (id) => `${API_BASE_URL}/tickets/${id}/comments`,
    OVERDUE: `${API_BASE_URL}/tickets/status/overdue`,
    ACTIVITY_LOG: (id) => `${API_BASE_URL}/tickets/${id}/activity-log`,
  },

  // Users
  USERS: {
    LIST: `${API_BASE_URL}/users`,
    GET: (id) => `${API_BASE_URL}/users/${id}`,
    CREATE: `${API_BASE_URL}/users`,
    UPDATE: (id) => `${API_BASE_URL}/users/${id}`,
    DELETE: (id) => `${API_BASE_URL}/users/${id}`,
    ENGINEERS: `${API_BASE_URL}/users/engineers`,
  },

  // Companies
  COMPANIES: {
    LIST: `${API_BASE_URL}/companies`,
    GET: (id) => `${API_BASE_URL}/companies/${id}`,
    CREATE: `${API_BASE_URL}/companies`,
    UPDATE: (id) => `${API_BASE_URL}/companies/${id}`,
    DELETE: (id) => `${API_BASE_URL}/companies/${id}`,
  },

  // Products
  PRODUCTS: {
    LIST: `${API_BASE_URL}/products`,
    GET: (id) => `${API_BASE_URL}/products/${id}`,
    CREATE: `${API_BASE_URL}/products`,
    UPDATE: (id) => `${API_BASE_URL}/products/${id}`,
    DELETE: (id) => `${API_BASE_URL}/products/${id}`,
  },

  // Reports
  REPORTS: {
    TICKET_STATS: `${API_BASE_URL}/reports/ticket-stats`,
    SLA_COMPLIANCE: `${API_BASE_URL}/reports/sla-compliance`,
    ENGINEER_PERFORMANCE: `${API_BASE_URL}/reports/engineer-performance`,
    RESPONSE_TIME: `${API_BASE_URL}/reports/response-time`,
  },

  // Admin
  ADMIN: {
    AUDIT_LOGS: `${API_BASE_URL}/admin/audit-logs`,
    DASHBOARD_STATS: `${API_BASE_URL}/admin/dashboard/stats`,
    USER_MANAGEMENT: `${API_BASE_URL}/admin/users`,
  },

  // CSAT
  CSAT: {
    ADD_RATING: `${API_BASE_URL}/csat/rate`,
    GET_RATINGS: `${API_BASE_URL}/csat/ratings`,
  },

  // Messages
  MESSAGES: {
    LIST: (ticketId) => `${API_BASE_URL}/messages/ticket/${ticketId}`,
    SEND: `${API_BASE_URL}/messages`,
  },

  // Notifications
  NOTIFICATIONS: {
    LIST: `${API_BASE_URL}/notifications`,
    MARK_READ: (id) => `${API_BASE_URL}/notifications/${id}/read`,
    UNREAD_COUNT: `${API_BASE_URL}/notifications/unread/count`,
  },
};

// Request Headers
const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
};

// Timeout for API requests (in milliseconds)
const REQUEST_TIMEOUT = 30000;

// Retry configuration
const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // in milliseconds
  RETRY_ON_STATUSES: [408, 429, 500, 502, 503, 504],
};

module.exports = {
  API_BASE_URL,
  API_ENDPOINTS,
  DEFAULT_HEADERS,
  REQUEST_TIMEOUT,
  RETRY_CONFIG,
};
