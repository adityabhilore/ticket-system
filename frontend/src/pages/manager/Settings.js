import React, { useEffect, useState } from 'react';
import useAuth from '../../hooks/useAuth';
import authService from '../../services/authService';
import userService from '../../services/userService';

export default function Settings() {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    name: '',
    email: '',
    role: '',
    companyId: '',
    createdAt: '',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      setLoading(true);
      setError('');

      const current = await authService.getCurrentUser();
      setForm({
        name: current?.Name || user?.name || '',
        email: current?.Email || user?.email || '',
        role: current?.Role || user?.role || '',
        companyId: current?.CompanyID || user?.companyId || '',
        createdAt: current?.CreatedAt || '',
      });
    } catch (e) {
      setError(e?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.name.trim() || !form.email.trim()) {
      setError('Name and email are required');
      return;
    }

    try {
      setSaving(true);
      await userService.updateProfile(form.name.trim(), form.email.trim());

      const updatedAuthUser = {
        ...(user || {}),
        name: form.name.trim(),
        email: form.email.trim(),
      };

      if (updateUser) {
        updateUser(updatedAuthUser);
      }

      setSuccess('Profile updated successfully');
    } catch (e) {
      setError(e?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #E2E8F0',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: 'inherit',
    outline: 'none',
    background: '#fff',
    color: '#1E293B',
  };

  if (loading) {
    return <div className="spinner">Loading settings...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-welcome">Manage your profile and account details</p>
        </div>
      </div>

      <div className="page-content-wrapper">
        <div className="card" style={{ maxWidth: '760px' }}>
          <div className="card-header">
            <div>
              <h2 className="card-title">Profile Settings</h2>
              <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '13px' }}>
                Update your personal information
              </p>
            </div>
          </div>

          {error && (
            <div className="alert alert-danger" style={{ marginBottom: '16px' }}>
              {error}
            </div>
          )}

          {success && (
            <div className="alert alert-success" style={{ marginBottom: '16px' }}>
              {success}
            </div>
          )}

          <form onSubmit={handleSave}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  style={inputStyle}
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label className="form-label">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  style={inputStyle}
                  placeholder="Enter your email"
                />
              </div>

              <div>
                <label className="form-label">Role</label>
                <input type="text" value={form.role || '—'} style={{ ...inputStyle, background: '#F8FAFC' }} readOnly />
              </div>

              <div>
                <label className="form-label">Company ID</label>
                <input type="text" value={form.companyId || '—'} style={{ ...inputStyle, background: '#F8FAFC' }} readOnly />
              </div>
            </div>

            <div style={{ marginTop: '16px' }}>
              <label className="form-label">Member Since</label>
              <input
                type="text"
                value={form.createdAt ? new Date(form.createdAt).toLocaleString() : '—'}
                style={{ ...inputStyle, background: '#F8FAFC' }}
                readOnly
              />
            </div>

            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                className="btn"
                onClick={loadProfile}
                disabled={saving}
                style={{ border: '1px solid #E2E8F0', background: '#fff', color: '#475569' }}
              >
                Reset
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
