import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

/**
 * Custom hook to use auth context
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

/**
 * Custom hook to check if user has specific role
 */
export const useRole = () => {
  const { user } = useAuth();
  return user?.role;
};

/**
 * Custom hook to check authorization
 */
export const useAuthorize = (roles = []) => {
  const userRole = useRole();
  return roles.includes(userRole);
};

export default useAuth;
