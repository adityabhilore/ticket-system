import api from './api';

const ticketService = {
  /**
   * Create new ticket
   */
  createTicket: async (title, description, priorityId, attachments = [], productId = null) => {
    try {
      const response = await api.post('/tickets', {
        title,
        description,
        priorityId,
        productId,
        attachments,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Get tickets list
   */
  getTickets: async (filters = {}) => {
    try {
      const response = await api.get('/tickets', { params: filters });
      return response.data.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Get ticket details
   */
  getTicketDetails: async (ticketId) => {
    try {
      const response = await api.get(`/tickets/${ticketId}`);
      return response.data.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Get overdue tickets
   */
  getOverdueTickets: async () => {
    try {
      const response = await api.get('/tickets/overdue');
      return response.data.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Update ticket status
   */
  updateTicketStatus: async (ticketId, statusId) => {
    try {
      const response = await api.put(`/tickets/${ticketId}/status`, { statusId });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Assign ticket to engineer
   */
  assignTicket: async (ticketId, engineerId) => {
    try {
      const response = await api.put(`/tickets/${ticketId}/assign`, { engineerId });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Add comment to ticket
   */
  addComment: async (ticketId, commentText, isInternal = false) => {
    try {
      const response = await api.post(`/tickets/${ticketId}/comment`, {
        commentText,
        isInternal,
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

export default ticketService;
