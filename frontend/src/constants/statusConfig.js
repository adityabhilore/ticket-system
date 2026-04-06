/**
 * Status Configuration for Ticket System
 * Defines the complete status flow and styling
 */

export const STATUS_STEPS = ['Open', 'In Progress', 'On Hold', 'Resolved', 'Closed'];

export const STATUS_COLORS = {
  'Open':        { bg:'#D1FAE5', color:'#065F46', dot:'#10B981', statusId: 1 },
  'In Progress': { bg:'#DBEAFE', color:'#1E40AF', dot:'#4F46E5', statusId: 2 },
  'On Hold':     { bg:'#FEF3C7', color:'#92400E', dot:'#EAB308', statusId: 3 },
  'Resolved':    { bg:'#CCFBF1', color:'#134E4A', dot:'#06B6D4', statusId: 4 },
  'Closed':      { bg:'#F3F4F6', color:'#374151', dot:'#9CA3AF', statusId: 5 },
};

export const FRIENDLY_STATUS = {
  'Open': 'We received your request',
  'In Progress': 'Our team is working on it',
  'On Hold': 'Waiting for additional information',
  'Resolved': 'Solution has been provided',
  'Closed': 'Issue completed'
};

export const STATUS_IDS = {
  OPEN: 1,
  IN_PROGRESS: 2,
  ON_HOLD: 3,
  RESOLVED: 4,
  CLOSED: 5,
};

// Helper to get status ID from status name
export const getStatusId = (statusName) => {
  const config = STATUS_COLORS[statusName];
  return config?.statusId || null;
};

// Helper to get status name from ID
export const getStatusName = (statusId) => {
  const entry = Object.entries(STATUS_COLORS).find(([_, config]) => config.statusId === statusId);
  return entry ? entry[0] : null;
};
