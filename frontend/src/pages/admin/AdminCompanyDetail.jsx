import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import '../../styles/admin.css';

export default function AdminCompanyDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchCompanyDetail();
  }, [id]);

  const fetchCompanyDetail = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/companies/${id}`);
      setCompany(res.data.data || res.data);
      setError('');
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load company details');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/companies/${id}`);
      navigate('/admin/companies', { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to delete company');
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-page">
        <div style={{ textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ fontSize: '14px', color: '#6B7280' }}>Loading company details...</div>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="admin-page">
        <div style={{ maxWidth: '560px' }}>
          <button
            className="admin-btn admin-btn-ghost"
            onClick={() => navigate('/admin/companies')}
            style={{ marginBottom: '20px', padding: '0' }}
          >
            ← Back to Companies
          </button>
          <div className="admin-alert admin-alert-error">Company not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div style={{ maxWidth: '640px' }}>
        <button
          className="admin-btn admin-btn-ghost"
          onClick={() => navigate('/admin/companies')}
          style={{ marginBottom: '20px', padding: '0' }}
        >
          ← Back to Companies
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '24px' }}>
          <div>
            <h1 className="admin-page-title">{company.Name}</h1>
            <p className="admin-page-sub">Company Profile</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="admin-btn admin-btn-primary"
              onClick={() => navigate(`/admin/companies/${id}/edit`)}
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
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div>
              <div style={{ fontSize: '12px', color: '#9CA3AF', fontWeight: '600', marginBottom: '6px' }}>
                Company Name
              </div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                {company.Name}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#9CA3AF', fontWeight: '600', marginBottom: '6px' }}>
                Email Address
              </div>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                {company.Email}
              </div>
            </div>
          </div>

          {company.CreatedAt && (
            <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #E5E7EB' }}>
              <div style={{ fontSize: '12px', color: '#9CA3AF', fontWeight: '600', marginBottom: '6px' }}>
                Created On
              </div>
              <div style={{ fontSize: '14px', color: '#6B7280' }}>
                {new Date(company.CreatedAt).toLocaleDateString()} at{' '}
                {new Date(company.CreatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50
          }}>
            <div className="admin-card" style={{ maxWidth: '400px', margin: '0 20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px', color: '#111827' }}>
                Delete Company?
              </h3>
              <p style={{ color: '#6B7280', marginBottom: '24px' }}>
                Are you sure you want to delete <strong>{company.Name}</strong>? This action cannot be undone.
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
                  {deleting ? 'Deleting...' : 'Delete Company'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
