import api from './api';

const reportService = {
  /**
   * Get dashboard data
   */
  getDashboard: async () => {
    try {
      const response = await api.get('/reports/dashboard');
      return response.data.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Get SLA report
   */
  getSLAReport: async () => {
    try {
      const response = await api.get('/reports/sla');
      return response.data.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Get performance report
   */
  getPerformanceReport: async () => {
    try {
      const response = await api.get('/reports/performance');
      return response.data.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Get trending data
   */
  getTrendingData: async () => {
    try {
      const response = await api.get('/reports/trending');
      return response.data.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Get ticket trend (last 7 days)
   */
  getTicketTrend: async () => {
    try {
      const response = await api.get('/reports/ticket-trend');
      return response.data.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Get tickets by status
   */
  getByStatus: async () => {
    try {
      const response = await api.get('/reports/by-status');
      return response.data.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Get tickets by priority
   */
  getByPriority: async () => {
    try {
      const response = await api.get('/reports/by-priority');
      return response.data.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Get recent tickets
   */
  getRecentTickets: async () => {
    try {
      const response = await api.get('/reports/recent-tickets');
      return response.data.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Get engineer stats
   */
  getEngineerStats: async () => {
    try {
      const response = await api.get('/reports/engineer-stats');
      return response.data.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

export default reportService;
