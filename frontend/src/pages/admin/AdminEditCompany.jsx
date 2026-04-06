import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import '../../styles/admin.css';

export default function AdminEditCompany() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [form, setForm] = useState({ name: '', email: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCompanyDetail();
  }, [id]);

  const fetchCompanyDetail = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/companies/${id}`);
      const company = res.data.data || res.data;
      setForm({ name: company.Name, email: company.Email });
      setError('');
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load company details');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.name.trim()) {
      setError('Company name is required');
      return;
    }
    if (form.name.trim().length < 3) {
      setError('Company name must be at least 3 characters');
      return;
    }
    if (!form.email.trim()) {
      setError('Company email is required');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      setError('Please enter a valid email');
      return;
    }

    setSubmitting(true);
    try {
      await api.put(`/companies/${id}`, {
        name: form.name.trim(),
        email: form.email.trim(),
      });
      setSuccess('Company updated successfully!');
      setTimeout(() => navigate(`/admin/companies/${id}`), 1500);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update company');
    } finally {
      setSubmitting(false);
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

  return (
    <div className="admin-page">
      <div style={{ maxWidth: '560px' }}>
        <button
          className="admin-btn admin-btn-ghost"
          onClick={() => navigate(`/admin/companies/${id}`)}
          style={{ marginBottom: '20px', padding: '0' }}
        >
          ← Back to Company
        </button>

        <h1 className="admin-page-title">Edit Company</h1>
        <p className="admin-page-sub">Update company information</p>

        <div className="admin-card">
          {error && <div className="admin-alert admin-alert-error">{error}</div>}
          {success && <div className="admin-alert admin-alert-success">{success}</div>}

          <form onSubmit={handleSubmit} className="admin-form">
            <div className="admin-form-group">
              <label className="admin-form-label">
                Company Name <span style={{ color: '#4F46E5' }}>*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Digital Solutions Ltd"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                disabled={submitting}
                className="admin-form-input"
                onFocus={(e) => (e.target.style.borderColor = '#4F46E5')}
                onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
              />
              <div className="admin-form-hint">
                This company's name as it appears in the system
              </div>
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">
                Company Email <span style={{ color: '#4F46E5' }}>*</span>
              </label>
              <input
                type="email"
                placeholder="e.g. admin@company.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                disabled={submitting}
                className="admin-form-input"
                onFocus={(e) => (e.target.style.borderColor = '#4F46E5')}
                onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
              />
              <div className="admin-form-hint">
                Company email for communications and updates
              </div>
            </div>

            <div className="admin-form-actions">
              <button
                type="button"
                onClick={() => navigate(`/admin/companies/${id}`)}
                disabled={submitting}
                className="admin-btn admin-btn-ghost"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="admin-btn admin-btn-primary"
              >
                {submitting ? 'Updating...' : 'Update Company'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
