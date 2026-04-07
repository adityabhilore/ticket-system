import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';

export default function PortalProfile() {
  const { user } = useAuth();
  const [companyName, setCompanyName] = useState(user?.companyName || user?.CompanyName || '');
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setCompanyName(user?.companyName || user?.CompanyName || '');
  }, [user]);

  useEffect(() => {
    let active = true;
    const fetchMe = async () => {
      try {
        const res = await api.get('/auth/me');
        const me = res.data?.data || {};
        const resolvedCompany = me.CompanyName || me.companyName || '';
        if (active && resolvedCompany) {
          setCompanyName(resolvedCompany);
        }
      } catch (err) {
      }
    };
    fetchMe();
    return () => { active = false; };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      setError('All fields are required');
      return;
    }
    if (form.newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await api.put(`/users/${user?.userId}/password`, {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword
      });
      setSuccess('Password changed successfully!');
      setForm({currentPassword: '', newPassword: '', confirmPassword: ''});
      setTimeout(() => setSuccess(''), 3000);
    } catch(err) {
      setError(err?.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="portal-page">
      <div className="portal-page-header">
        <div>
          <h1 className="portal-page-title">My Profile</h1>
          <p className="portal-page-sub">Manage your account settings and security</p>
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:'300px 1fr',gap:'20px',marginTop:'24px'}}>

        {/* Account Info Card */}
        <div className="portal-card">
          <h3 className="portal-card-title">Account Information</h3>
          <div style={{display:'flex',flexDirection:'column',gap:'16px',marginTop:'12px'}}>
            <div>
              <div style={{fontSize:'11px',fontWeight:'700',color:'#9CA3AF',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'4px'}}>Full Name</div>
              <div style={{fontSize:'14px',color:'#1E293B',fontWeight:'500'}}>{user?.name || '–'}</div>
            </div>
            <div>
              <div style={{fontSize:'11px',fontWeight:'700',color:'#9CA3AF',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'4px'}}>Email Address</div>
              <div style={{fontSize:'14px',color:'#1E293B',fontWeight:'500'}}>{user?.email || '–'}</div>
            </div>
            <div>
              <div style={{fontSize:'11px',fontWeight:'700',color:'#9CA3AF',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'4px'}}>Company</div>
              <div style={{fontSize:'14px',color:'#1E293B',fontWeight:'500'}}>{companyName || '–'}</div>
            </div>
            <div>
              <div style={{fontSize:'11px',fontWeight:'700',color:'#9CA3AF',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:'4px'}}>Account Type</div>
              <div style={{display:'flex',alignItems:'center',gap:'6px',marginTop:'4px'}}>
                <span style={{display:'inline-block',width:'8px',height:'8px',borderRadius:'50%',background:'#4F46E5'}}></span>
                <span style={{fontSize:'14px',color:'#1E293B',fontWeight:'500'}}>Client</span>
              </div>
            </div>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="portal-card">
          <h3 className="portal-card-title">Change Password</h3>
          {error && <div className="portal-error">{error}</div>}
          {success && <div className="portal-success">{success}</div>}
          <form onSubmit={handleSubmit} style={{marginTop:'12px',display:'flex',flexDirection:'column',gap:'12px'}}>
            <div className="portal-form-group">
              <label className="portal-label">Current Password *</label>
              <input type="password" className="portal-input"
                placeholder="Enter your current password"
                value={form.currentPassword}
                onChange={e => setForm({...form, currentPassword: e.target.value})}
                disabled={loading} />
            </div>

            <div className="portal-divider" style={{margin:'4px 0'}}></div>

            <div className="portal-form-group">
              <label className="portal-label">New Password *</label>
              <input type="password" className="portal-input"
                placeholder="Enter a new password (min 6 characters)"
                value={form.newPassword}
                onChange={e => setForm({...form, newPassword: e.target.value})}
                disabled={loading} />
            </div>

            <div className="portal-form-group">
              <label className="portal-label">Confirm Password *</label>
              <input type="password" className="portal-input"
                placeholder="Re-enter your new password"
                value={form.confirmPassword}
                onChange={e => setForm({...form, confirmPassword: e.target.value})}
                disabled={loading} />
            </div>

            <div className="portal-form-actions" style={{marginTop:'8px'}}>
              <button type="button" className="portal-btn-secondary"
                onClick={() => setForm({currentPassword: '', newPassword: '', confirmPassword: ''})}
                disabled={loading}>
                Clear
              </button>
              <button type="submit" className="portal-btn-primary"
                disabled={loading}>
                {loading ? 'Updating...' : ' Update Password'}
              </button>
            </div>
          </form>

          <div style={{marginTop:'16px',padding:'12px',background:'#F0F9FF',borderRadius:'6px',border:'1px solid #E0F2FE'}}>
            <div style={{fontSize:'12px',color:'#0369A1',fontWeight:'700',marginBottom:'4px'}}>Security Tips:</div>
            <ul style={{fontSize:'11px',color:'#0369A1',margin:'0',paddingLeft:'16px'}}>
              <li>Use a strong password with uppercase, lowercase, numbers, and symbols</li>
              <li>Never share your password with anyone</li>
              <li>Don't use the same password as other accounts</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

