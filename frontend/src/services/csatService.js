import api from './api';

/**
 * Submit CSAT rating for a ticket
 */
export const submitCSATRating = async (ticketId, rating, comment) => {
  return await api.post('/csat/submit', {
    ticketId,
    rating,
    comment,
  });
};

/**
 * Check if user can rate a ticket
 */
export const checkCanRate = async (ticketId) => {
  return await api.get(`/csat/can-rate/${ticketId}`);
};

/**
 * Get CSAT statistics and distribution for dashboard
 */
export const getCSATStats = async () => {
  return await api.get('/csat/stats');
};

/**
 * Get CSAT report with filters
 */
export const getCSATReport = async (params = {}) => {
  return await api.get('/csat/report', { params });
};

/**
 * Get low-score tickets
 */
export const getLowScoreTickets = async (threshold = 3) => {
  return await api.get('/csat/low-scores', { params: { threshold } });
};

export default {
  submitCSATRating,
  checkCanRate,
  getCSATStats,
  getCSATReport,
  getLowScoreTickets,
};
