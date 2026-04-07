import React, { createContext, useState, useEffect } from 'react';
import authService from '../services/authService';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount, restore auth state from localStorage
  useEffect(() => {
    console.log('🔄 AuthProvider mounted - restoring from storage...');
    const storedToken = authService.getToken();
    const storedUser = authService.getStoredUser();

    console.log('💾 Stored token:', storedToken ? storedToken.substring(0, 20) + '...' : 'NONE');
    console.log('💾 Stored user:', storedUser);

    if (storedToken && storedUser) {
      console.log('✅ Restoring auth state from localStorage');
      setToken(storedToken);
      setUser(storedUser);
    } else {
      console.log('⚠️  No stored auth found');
    }

    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await authService.login(email, password);
      console.log('📨 Login response:', response);
      
      // authService.login returns response.data from axios
      // Backend response: { success, message, data: { token, user } }
      // So response here = { success, message, data: { token, user } }
      const tokenData = response.data?.token;
      const userData = response.data?.user;
      
      console.log('🔑 Token extracted:', tokenData ? tokenData.substring(0, 20) + '...' : 'NO TOKEN');
      console.log('👤 User extracted:', userData);
      
      if (tokenData && userData) {
        console.log('✅ Setting token and user...');
        setToken(tokenData);
        setUser(userData);
        console.log('✅ Auth state updated! Token in localStorage:', localStorage.getItem('token') ? 'YES' : 'NO');
        return userData;
      } else {
        console.error('❌ Missing token or user:', { tokenData, userData });
        throw new Error('Failed to extract token or user from response');
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setToken(null);
  };

  const updateUser = (nextUser) => {
    setUser(nextUser);
    localStorage.setItem('user', JSON.stringify(nextUser));
  };

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    updateUser,
    isAuthenticated: !!token,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
