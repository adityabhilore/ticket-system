import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import '../../styles/admin.css';

export default function AdminEditUser() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [companies, setCompanies] = useState([]);
  const [form, setForm] = useState({
    name: '',
    email: '',
    role: 'Engineer',
    companyId: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch user details
        const userRes = await api.get(`/admin/users/${id}`);
        const user = userRes.data.data || userRes.data;
        setForm({
          name: user.Name,
          email: user.Email,
          role: user.Role,
          companyId: user.CompanyID || '',
        });

        // Fetch companies
        const companiesRes = await api.get('/admin/companies');
        setCompanies(companiesRes.data.data || companiesRes.data || []);
        setError('');
      } catch (err) {
        setError(err?.response?.data?.message || 'Failed to load user details');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.name || !form.email || !form.role) {
      setError('All fields are required');
      return;
    }
    if (!form.companyId) {
      setError('Please select a company');
      return;
    }

    setSubmitting(true);
    try {
      await api.put(`/admin/users/${id}`, {
        name: form.name,
        email: form.email,
        role: form.role,
        companyId: form.companyId,
      });
      setSuccess('User updated successfully!');
      setTimeout(() => navigate(`/admin/users/${id}`), 1500);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update user');
    } finally {
      setSubmitting(false);
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

  return (
    <div className="admin-page">
      <div style={{ maxWidth: '640px' }}>
        <button
          className="admin-btn admin-btn-ghost"
          onClick={() => navigate(`/admin/users/${id}`)}
          style={{ marginBottom: '20px', padding: '0' }}
        >
          ← Back to User
        </button>

        <h1 className="admin-page-title">Edit User</h1>
        <p className="admin-page-sub">Update user information</p>

        <div className="admin-card">
          {error && <div className="admin-alert admin-alert-error">{error}</div>}
          {success && <div className="admin-alert admin-alert-success">{success}</div>}

          <form onSubmit={handleSubmit} className="admin-form">
            {[
              { key: 'name', label: 'Full Name', type: 'text', placeholder: 'e.g. Rahul Sharma' },
              { key: 'email', label: 'Email Address', type: 'email', placeholder: 'e.g. rahul@company.com' },
            ].map((field) => (
              <div key={field.key} className="admin-form-group">
                <label className="admin-form-label">{field.label}</label>
                <input
                  type={field.type}
                  placeholder={field.placeholder}
                  className="admin-form-input"
                  value={form[field.key]}
                  onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                  disabled={submitting}
                  onFocus={(e) => (e.target.style.borderColor = '#4F46E5')}
                  onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
                />
              </div>
            ))}

            {/* Role selector */}
            <div className="admin-form-group">
              <label className="admin-form-label">Role</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px' }}>
                {['Manager', 'Engineer', 'Client'].map((role) => (
                  <div
                    key={role}
                    onClick={() => setForm({ ...form, role })}
                    style={{
                      padding: '10px 14px',
                      border: `2px solid ${form.role === role ? '#4F46E5' : '#E2E8F0'}`,
                      borderRadius: '8px',
                      cursor: submitting ? 'not-allowed' : 'pointer',
                      textAlign: 'center',
                      background: form.role === role ? 'rgba(79,70,229,0.1)' : '#fff',
                      transition: 'all 0.15s',
                      opacity: submitting ? 0.5 : 1,
                    }}
                  >
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: '700',
                        color: form.role === role ? '#4F46E5' : '#374151',
                      }}
                    >
                      {role}
                    </div>
                    <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>
                      {role === 'Manager'
                        ? 'Assigns tickets'
                        : role === 'Engineer'
                          ? 'Resolves tickets'
                          : 'Raises tickets'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Company selector */}
            <div className="admin-form-group">
              <label className="admin-form-label">
                Company <span style={{ color: '#4F46E5' }}>*</span>
              </label>
              <select
                value={form.companyId}
                className="admin-form-select"
                onChange={(e) => setForm({ ...form, companyId: e.target.value })}
                disabled={submitting}
                required
              >
                <option value="">-- Select Company --</option>
                {companies.map((c) => (
                  <option key={c.CompanyID} value={c.CompanyID}>
                    {c.Name}
                  </option>
                ))}
              </select>
              <div className="admin-form-hint">
                {form.role === 'Manager' && 'Manager belongs to this company (to manage its tickets)'}
                {form.role === 'Engineer' && 'Engineer belongs to this company (to resolve its tickets)'}
                {form.role === 'Client' && 'Client creator belongs to this company'}
              </div>
            </div>

            <div className="admin-form-actions">
              <button
                type="button"
                onClick={() => navigate(`/admin/users/${id}`)}
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
                {submitting ? 'Updating...' : 'Update User'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
