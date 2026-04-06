import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import '../../styles/admin.css';

export default function AdminCreateUser() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [form, setForm] = useState({
    name:'', email:'', password:'', role:'Engineer', companyId:''
  });
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/admin/companies').then(res =>
      setCompanies(res.data.data || res.data || [])
    );
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!form.name||!form.email||!form.password||!form.role) {
      setError('All fields are required'); return;
    }
    if (!form.companyId) {
      setError('Please select a company'); return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters'); return;
    }
    setLoading(true);
    try {
      await api.post('/admin/users/create', {
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        companyId: form.companyId,
      });
      setSuccess(`User "${form.name}" created successfully!`);
      setTimeout(() => navigate('/admin/users'), 1500);
    } catch(err) {
      setError(err?.response?.data?.message || 'Failed to create user');
    } finally { setLoading(false); }
  };

  return (
    <div className="admin-page">
      <div style={{maxWidth:'640px'}}>

      <button className="admin-btn admin-btn-ghost" onClick={() => navigate('/admin/users')}
        style={{marginBottom:'20px',padding:'0'}}>
        ← Back to Users
      </button>

      <h1 className="admin-page-title">Create New User</h1>
      <p className="admin-page-sub">Create a Manager, Engineer, or Client account</p>

      <div className="admin-card">

        {error && (
          <div className="admin-alert admin-alert-error">{error}</div>
        )}
        {success && (
          <div className="admin-alert admin-alert-success">{success}</div>
        )}

        <form onSubmit={handleSubmit} className="admin-form">
          {[
            {key:'name', label:'Full Name', type:'text',
              placeholder:'e.g. Rahul Sharma'},
            {key:'email', label:'Email Address', type:'email',
              placeholder:'e.g. rahul@company.com'},
            {key:'password', label:'Password', type:'password',
              placeholder:'Minimum 6 characters'},
          ].map(field => (
            <div key={field.key} className="admin-form-group">
              <label className="admin-form-label">{field.label}</label>
              <input type={field.type} placeholder={field.placeholder} className="admin-form-input"
                value={form[field.key]}
                onChange={e => setForm({...form,[field.key]:e.target.value})}
                disabled={loading}
                onFocus={e=>e.target.style.borderColor='#4F46E5'}
                onBlur={e=>e.target.style.borderColor='#E2E8F0'} />
            </div>
          ))}

          {/* Role selector */}
          <div className="admin-form-group">
            <label className="admin-form-label">Role</label>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'8px'}}>
              {['Manager','Engineer','Client'].map(role => (
                <div key={role}
                  onClick={() => setForm({...form, role})}
                  style={{padding:'10px 14px',border:`2px solid ${form.role===role?'#4F46E5':'#E2E8F0'}`,
                    borderRadius:'8px',cursor:'pointer',textAlign:'center',
                    background:form.role===role?'rgba(79,70,229,0.1)':'#fff',
                    transition:'all 0.15s'}}>
                  <div style={{fontSize:'13px',fontWeight:'700',
                    color:form.role===role?'#4F46E5':'#374151'}}>
                    {role}
                  </div>
                  <div style={{fontSize:'11px',color:'#9CA3AF',marginTop:'2px'}}>
                    {role==='Manager'?'Assigns tickets':
                     role==='Engineer'?'Resolves tickets':'Raises tickets'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Company selector - REQUIRED for all roles */}
          <div className="admin-form-group">
            <label className="admin-form-label">
              Company <span style={{color:'#4F46E5'}}>*</span>
            </label>
            <select value={form.companyId} className="admin-form-select"
              onChange={e => setForm({...form,companyId:e.target.value})}
              disabled={loading}
              required>
              <option value="">-- Select Company --</option>
              {companies.map(c => (
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
            <button type="button" onClick={() => navigate('/admin/users')}
              disabled={loading}
              className="admin-btn admin-btn-ghost">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="admin-btn admin-btn-primary">
              {loading ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
      </div>
    </div>
  );
}
