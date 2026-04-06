/**
 * API Constants - Shared across all routes
 * Status codes, error messages, role definitions
 */

// HTTP Status Codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
};

// User Roles
const USER_ROLES = {
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  ENGINEER: 'Engineer',
  CLIENT: 'Client',
};

// Ticket Priority Levels
const TICKET_PRIORITY = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

// Ticket Status
const TICKET_STATUS = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  ON_HOLD: 'On Hold',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};

// Audit Log Actions
const AUDIT_ACTIONS = {
  TICKET_CREATED: 'Ticket Created',
  TICKET_UPDATED: 'Ticket Updated',
  TICKET_ASSIGNED: 'Ticket Assigned',
  TICKET_RESOLVED: 'Ticket Resolved',
  TICKET_CLOSED: 'Ticket Closed',
  COMMENT_ADDED: 'Comment Added',
  COMMENT_DELETED: 'Comment Deleted',
  STATUS_CHANGED: 'Status Changed',
  PRIORITY_CHANGED: 'Priority Changed',
  USER_CREATED: 'User Created',
  USER_UPDATED: 'User Updated',
  USER_DELETED: 'User Deleted',
};

// Error Messages
const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'You do not have permission to perform this action',
  NOT_FOUND: 'Resource not found',
  INVALID_EMAIL: 'Invalid email format',
  PASSWORD_TOO_SHORT: 'Password must be at least 8 characters',
  DUPLICATE_EMAIL: 'Email already exists',
  INVALID_CREDENTIALS: 'Invalid email or password',
  SERVER_ERROR: 'Internal server error',
  MISSING_FIELDS: 'Missing required fields',
  INVALID_ROLE: 'Invalid user role',
  TICKET_NOT_ASSIGNED: 'Ticket is not assigned to anyone',
  ALREADY_ASSIGNED: 'Ticket is already assigned',
};

// Success Messages
const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Login successful',
  LOGOUT_SUCCESS: 'Logout successful',
  TICKET_CREATED: 'Ticket created successfully',
  TICKET_UPDATED: 'Ticket updated successfully',
  TICKET_ASSIGNED: 'Ticket assigned successfully',
  COMMENT_ADDED: 'Comment added successfully',
  USER_CREATED: 'User created successfully',
  USER_UPDATED: 'User updated successfully',
};

// Notification Types
const NOTIFICATION_TYPES = {
  TICKET_CREATED: 'ticket_created',
  TICKET_ASSIGNED: 'ticket_assigned',
  TICKET_RESOLVED: 'ticket_resolved',
  COMMENT_ADDED: 'comment_added',
  TICKET_UPDATED: 'ticket_updated',
};

// SLA Response Times (in hours)
const SLA_TIMES = {
  CRITICAL: 4,
  HIGH: 8,
  MEDIUM: 24,
  LOW: 48,
};

module.exports = {
  HTTP_STATUS,
  USER_ROLES,
  TICKET_PRIORITY,
  TICKET_STATUS,
  AUDIT_ACTIONS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  NOTIFICATION_TYPES,
  SLA_TIMES,
};
