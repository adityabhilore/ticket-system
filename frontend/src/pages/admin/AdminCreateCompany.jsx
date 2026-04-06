import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import '../../styles/admin.css';

export default function AdminCreateCompany() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '' });
  const [error, setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    
    if (!form.name.trim()) { setError('Company name is required'); return; }
    if (form.name.trim().length < 3) {
      setError('Company name must be at least 3 characters'); return;
    }
    if (!form.email.trim()) { setError('Company email is required'); return; }
    if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      setError('Please enter a valid email'); return;
    }
    
    setLoading(true);
    try {
      await api.post('/companies', { name: form.name.trim(), email: form.email.trim() });
      setSuccess(`Company "${form.name}" created successfully!`);
      setForm({ name: '', email: '' });
      setTimeout(() => navigate('/admin/companies'), 1500);
    } catch(err) {
      setError(err?.response?.data?.message || 'Failed to create company');
    } finally { setLoading(false); }
  };

  return (
    <div className="admin-page">
      <div style={{maxWidth:'560px'}}>

      <button className="admin-btn admin-btn-ghost" onClick={() => navigate('/admin/companies')}
        style={{marginBottom:'20px',padding:'0'}}>
        ← Back to Companies
      </button>

      <h1 className="admin-page-title">Register New Company</h1>
      <p className="admin-page-sub">Add a new client company to the system</p>

      <div className="admin-card">

        {error && (
          <div className="admin-alert admin-alert-error">{error}</div>
        )}
        {success && (
          <div className="admin-alert admin-alert-success">{success}</div>
        )}

        <form onSubmit={handleSubmit} className="admin-form">
          <div className="admin-form-group">
            <label className="admin-form-label">
              Company Name <span style={{color:'#4F46E5'}}>*</span>
            </label>
            <input type="text"
              placeholder="e.g. Digital Solutions Ltd"
              value={form.name}
              onChange={e => setForm({...form, name: e.target.value})}
              disabled={loading} className="admin-form-input"
              onFocus={e=>e.target.style.borderColor='#4F46E5'}
              onBlur={e=>e.target.style.borderColor='#E2E8F0'} />
            <div className="admin-form-hint">
              This company's clients will use this name when they log in
            </div>
          </div>

          <div className="admin-form-group">
            <label className="admin-form-label">
              Company Email <span style={{color:'#4F46E5'}}>*</span>
            </label>
            <input type="email"
              placeholder="e.g. admin@company.com"
              value={form.email}
              onChange={e => setForm({...form, email: e.target.value})}
              disabled={loading} className="admin-form-input"
              onFocus={e=>e.target.style.borderColor='#4F46E5'}
              onBlur={e=>e.target.style.borderColor='#E2E8F0'} />
            <div className="admin-form-hint">
              Company email for communications and updates
            </div>
          </div>

          <div className="admin-form-actions">
            <button type="button" onClick={() => navigate('/admin/companies')}
              className="admin-btn admin-btn-ghost">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="admin-btn admin-btn-primary">
              {loading ? 'Registering...' : 'Register Company'}
            </button>
          </div>
        </form>
      </div>

      {/* Info card */}
      <div style={{background:'#EFF6FF',border:'1px solid #BFDBFE',
        borderRadius:'10px',padding:'14px 16px',fontSize:'12px',color:'#374151',lineHeight:'1.8'}}>
        <div style={{fontWeight:'700',color:'#1E40AF',marginBottom:'6px'}}>📋 After registering a company:</div>
        1. Go to Create User → select "Client" role<br/>
        2. Select this company from the dropdown<br/>
        3. Client can now login and raise tickets<br/>
        4. Tickets from this company appear in Manager's dashboard
      </div>
      </div>
    </div>
  );
}