import api from './api';

const userService = {
  /**
   * Get all users in company
   */
  getUsers: async () => {
    try {
      const response = await api.get('/users');
      return response.data.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Get engineers in company
   */
  getEngineers: async () => {
    try {
      const response = await api.get('/users/engineers');
      return response.data.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  /**
   * Update user profile
   */
  updateProfile: async (name, email) => {
    try {
      const response = await api.put('/users/profile', { name, email });
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },
};

export default userService;
