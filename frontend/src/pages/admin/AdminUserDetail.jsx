import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import '../../styles/admin.css';

export default function AdminUserDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchUserDetail = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/admin/users/${id}`);
      setUser(res.data.data || res.data);
      setError('');
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load user details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/admin/users/${id}`);
      navigate('/admin/users', { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to delete user');
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'Admin':
        return '#DC2626';
      case 'Manager':
        return '#F59E0B';
      case 'Engineer':
        return '#10B981';
      case 'Client':
        return '#3B82F6';
      default:
        return '#6B7280';
    }
  };

  if (loading) {
    return (
      <div className="admin-page">
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: '14px', color: '#6B7280' }}>Loading user details...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="admin-page">
        <div style={{ maxWidth: '560px' }}>
          <button
            className="admin-btn admin-btn-ghost"
            onClick={() => navigate('/admin/users')}
            style={{ marginBottom: '20px', padding: '0' }}
          >
            ← Back to Users
          </button>
          <div className="admin-alert admin-alert-error">User not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div style={{ maxWidth: '640px' }}>
        <button
          className="admin-btn admin-btn-ghost"
          onClick={() => navigate('/admin/users')}
          style={{ marginBottom: '20px', padding: '0' }}
        >
          ← Back to Users
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '24px' }}>
          <div>
            <h1 className="admin-page-title">{user.Name}</h1>
            <div style={{ marginTop: '8px' }}>
              <span
                style={{
                  display: 'inline-block',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: '600',
                  background: getRoleColor(user.Role) + '20',
                  color: getRoleColor(user.Role),
                }}
              >
                {user.Role}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="admin-btn admin-btn-primary"
              onClick={() => navigate(`/admin/users/${id}/edit`)}
            >
              Edit
            </button>
            <button
              className="admin-btn admin-btn-danger"
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete
            </button>
          </div>
        </div>

        {error && <div className="admin-alert admin-alert-error">{error}</div>}

        <div className="admin-card">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#9CA3AF', fontWeight: '600', marginBottom: '6px' }}>
                Full Name
              </div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                {user.Name}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#9CA3AF', fontWeight: '600', marginBottom: '6px' }}>
                Email Address
              </div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                {user.Email}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#9CA3AF', fontWeight: '600', marginBottom: '6px' }}>
                Role
              </div>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: getRoleColor(user.Role),
                }}
              >
                {user.Role}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#9CA3AF', fontWeight: '600', marginBottom: '6px' }}>
                Company
              </div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                {user.CompanyName || 'N/A'}
              </div>
            </div>
          </div>

          {user.CreatedAt && (
            <div style={{ paddingTop: '24px', borderTop: '1px solid #E5E7EB' }}>
              <div style={{ fontSize: '12px', color: '#9CA3AF', fontWeight: '600', marginBottom: '6px' }}>
                Created On
              </div>
              <div style={{ fontSize: '14px', color: '#6B7280' }}>
                {new Date(user.CreatedAt).toLocaleDateString()} at{' '}
                {new Date(user.CreatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 50,
            }}
          >
            <div className="admin-card" style={{ maxWidth: '400px', margin: '0 20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px', color: '#111827' }}>
                Delete User?
              </h3>
              <p style={{ color: '#6B7280', marginBottom: '24px' }}>
                Are you sure you want to delete <strong>{user.Name}</strong>? This action cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  className="admin-btn admin-btn-ghost"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  className="admin-btn admin-btn-danger"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? 'Deleting...' : 'Delete User'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
