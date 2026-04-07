import React from 'react';
import { Navigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';

/**
 * Protected Route Component
 * Redirects to login if user is not authenticated
 */
const ProtectedRoute = ({ children, requiredRoles = [] }) => {
  const { isAuthenticated, user, loading } = useAuth();

  console.log('🛡️  ProtectedRoute Check:', {
    loading,
    isAuthenticated,
    userRole: user?.role,
    requiredRoles,
  });

  if (loading) {
    console.log('⏳ Loading state - showing spinner');
    return <div className="spinner"></div>;
  }

  if (!isAuthenticated) {
    console.warn('❌ Not authenticated - redirecting to login');
    return <Navigate to="/login" />;
  }

  if (requiredRoles.length > 0 && !requiredRoles.includes(user?.role)) {
    console.warn('⛔ User role not in required roles - access denied');
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
      }}>
        <div className="card" style={{ maxWidth: '400px' }}>
          <h2>Access Denied</h2>
          <p>You don't have permission to access this page.</p>
          <p>Required role: {requiredRoles.join(', ')}</p>
          <p>Your role: {user?.role}</p>
        </div>
      </div>
    );
  }

  console.log('✅ Access granted to protected route');
  return children;
};

export default ProtectedRoute;
