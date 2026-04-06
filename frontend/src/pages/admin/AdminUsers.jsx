import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import '../../styles/admin.css';

const ROLE_STYLES = {
  Admin:    { bg:'#FEE2E2', color:'#991B1B' },
  Manager:  { bg:'#F5F3FF', color:'#4C1D95' },
  Engineer: { bg:'#ECFDF5', color:'#065F46' },
  Client:   { bg:'#EFF6FF', color:'#1E40AF' },
};

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [openFilterKey, setOpenFilterKey] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalMode, setModalMode] = useState(null); // 'view', 'edit', 'create'
  const [columnFilters, setColumnFilters] = useState({
    name: '',
    email: '',
    role: '',
    company: '',
  });

  useEffect(() => {
    fetchUsers();
    fetchCompanies();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data.data || res.data || []);
    } catch(err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchCompanies = async () => {
    try {
      const res = await api.get('/admin/companies');
      setCompanies(res.data.data || res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete user "${name}"?`)) return;
    setDeleting(id);
    try {
      await api.delete(`/admin/users/${id}`);
      setUsers(prev => prev.filter(u => u.UserId !== id));
    } catch(err) {
      alert(err?.response?.data?.message || 'Failed to delete');
    } finally { setDeleting(null); }
  };

  const openUserModal = (user, mode) => {
    setSelectedUser(user);
    setModalMode(mode);
  };

  const closeUserModal = () => {
    setSelectedUser(null);
    setModalMode(null);
  };

  const handleSaveUser = async (updatedData) => {
    try {
      if (modalMode === 'create') {
        await api.post('/admin/users/create', {
          name: updatedData.Name,
          email: updatedData.Email,
          password: updatedData.Password,
          role: updatedData.Role,
          companyId: updatedData.CompanyID,
        });
      } else {
        await api.put(`/admin/users/${selectedUser.UserId}`, {
          name: updatedData.Name,
          email: updatedData.Email,
          role: updatedData.Role,
          companyId: updatedData.CompanyID,
        });
      }
      await fetchUsers();
      closeUserModal();
      alert(modalMode === 'create' ? 'User created successfully' : 'User updated successfully');
    } catch(err) {
      alert(err?.response?.data?.message || 'Failed to save user');
    }
  };

  const handleResetFilters = () => {
    setColumnFilters({ name: '', email: '', role: '', company: '' });
    setOpenFilterKey(null);
  };

  const roleOptions = ['Admin', 'Manager', 'Engineer', 'Client'];
  const companyOptions = [...new Set(users.map(u => u.CompanyName).filter(Boolean))];
  const emailOptions = users.map(u => u.Email);

  const filtered = users.filter((u) => {
    const name = (u.Name || '').toLowerCase();
    const email = (u.Email || '').toLowerCase();
    const role = u.Role || '';
    const company = u.CompanyName || '';
    
    return (
      (!columnFilters.name || name.includes(columnFilters.name.toLowerCase())) &&
      (!columnFilters.email || email.includes(columnFilters.email.toLowerCase())) &&
      (!columnFilters.role || role === columnFilters.role) &&
      (!columnFilters.company || company === columnFilters.company)
    );
  });

  const HeaderCell = ({ label, keyName, type = 'text', options = [] }) => {
    const isOpen = openFilterKey === keyName;
    const [searchText, setSearchText] = useState('');

    const filteredOptions = type === 'select' 
      ? options.filter(opt => String(opt).toLowerCase().includes(searchText.toLowerCase()))
      : [];

    useEffect(() => {
      const handleClickOutside = () => {
        if (isOpen) setOpenFilterKey(null);
      };
      if (isOpen) document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }, [isOpen]);

    return (
      <th style={{ position: 'relative' }}>
        <div className="header-filter-wrap" style={{ position: 'relative', display: 'inline-block' }}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpenFilterKey(isOpen ? null : keyName);
              setSearchText('');
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'transparent',
              border: 'none',
              color: 'inherit',
              font: 'inherit',
              fontWeight: 700,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            {label}
            <span style={{ fontSize: 11, opacity: 0.8 }}>▼</span>
          </button>

          {isOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: 0,
                zIndex: 30,
                background: '#fff',
                border: '1px solid #E5E7EB',
                borderRadius: 10,
                minWidth: 240,
                boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
              }}
            >
              {type === 'select' ? (
                <>
                  <input
                    type="text"
                    placeholder={`Search ${label}...`}
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    autoFocus
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: 'none',
                      borderBottom: '1px solid #E5E7EB',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      borderRadius: '10px 10px 0 0',
                    }}
                  />
                  <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {filteredOptions.length === 0 ? (
                      <div style={{ padding: '12px', color: '#9CA3AF', textAlign: 'center', fontSize: '13px' }}>
                        No results
                      </div>
                    ) : (
                      filteredOptions.map(opt => (
                        <div
                          key={opt}
                          onClick={() => {
                            setColumnFilters((p) => ({ ...p, [keyName]: opt }));
                            setOpenFilterKey(null);
                            setSearchText('');
                          }}
                          style={{
                            padding: '10px 12px',
                            cursor: 'pointer',
                            backgroundColor: columnFilters[keyName] === opt ? '#F3F4F6' : '#fff',
                            borderLeft: columnFilters[keyName] === opt ? '4px solid #3B82F6' : '4px solid transparent',
                            color: columnFilters[keyName] === opt ? '#1F2937' : '#6B7280',
                            fontWeight: columnFilters[keyName] === opt ? '600' : '400',
                            fontSize: '14px',
                            transition: 'all 0.15s',
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = '#F9FAFB';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = columnFilters[keyName] === opt ? '#F3F4F6' : '#fff';
                          }}
                        >
                          {opt}
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <input
                  type="text"
                  value={columnFilters[keyName]}
                  onChange={(e) => {
                    setColumnFilters((p) => ({ ...p, [keyName]: e.target.value }));
                  }}
                  placeholder={`Search ${label}...`}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: 'none',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    borderRadius: '10px',
                  }}
                />
              )}
            </div>
          )}
        </div>
      </th>
    );
  };

  const UserEditForm = ({ user, onSave, onCancel, isCreate, companies }) => {
    const [formData, setFormData] = useState(
      user
        ? { ...user, CompanyID: user.CompanyID || user.CompanyId || '' }
        : { Name: '', Email: '', Password: '', Role: 'Engineer', CompanyID: '' }
    );
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!formData.Name.trim() || !formData.Email.trim() || !formData.Role || !formData.CompanyID) {
        alert('Name, Email, Role and Company are required');
        return;
      }
      if (isCreate && !formData.Password?.trim()) {
        alert('Password is required');
        return;
      }
      if (isCreate && formData.Password.trim().length < 6) {
        alert('Password must be at least 6 characters');
        return;
      }
      setSaving(true);
      await onSave(formData);
      setSaving(false);
    };

    return (
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#374151' }}>
            Name
          </label>
          <input
            type="text"
            value={formData.Name}
            onChange={(e) => setFormData({ ...formData, Name: e.target.value })}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #E5E7EB',
              borderRadius: '6px',
              fontSize: '14px',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => e.target.style.borderColor = '#3B82F6'}
            onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#374151' }}>
            Email
          </label>
          <input
            type="email"
            value={formData.Email}
            onChange={(e) => setFormData({ ...formData, Email: e.target.value })}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #E5E7EB',
              borderRadius: '6px',
              fontSize: '14px',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => e.target.style.borderColor = '#3B82F6'}
            onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#374151' }}>
            Role
          </label>
          <select
            value={formData.Role}
            onChange={(e) => setFormData({ ...formData, Role: e.target.value })}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #E5E7EB',
              borderRadius: '6px',
              fontSize: '14px',
              outline: 'none',
              boxSizing: 'border-box',
              cursor: 'pointer',
            }}
          >
            <option value="Admin">Admin</option>
            <option value="Manager">Manager</option>
            <option value="Engineer">Engineer</option>
            <option value="Client">Client</option>
          </select>
        </div>
        {isCreate && (
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#374151' }}>
              Password
            </label>
            <input
              type="password"
              value={formData.Password || ''}
              onChange={(e) => setFormData({ ...formData, Password: e.target.value })}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #E5E7EB',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
              onFocus={(e) => e.target.style.borderColor = '#3B82F6'}
              onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
            />
          </div>
        )}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px', color: '#374151' }}>
            Company
          </label>
          <select
            value={formData.CompanyID || ''}
            onChange={(e) => setFormData({ ...formData, CompanyID: e.target.value })}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #E5E7EB',
              borderRadius: '6px',
              fontSize: '14px',
              outline: 'none',
              boxSizing: 'border-box',
              cursor: 'pointer',
            }}
          >
            <option value="">-- Select Company --</option>
            {(companies || []).map((company) => (
              <option key={company.CompanyID || company.CompanyId} value={company.CompanyID || company.CompanyId}>
                {company.Name || company.CompanyName}
              </option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              flex: 1,
              padding: '10px 16px',
              background: '#3B82F6',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? 'Saving...' : isCreate ? 'Create' : 'Save'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            style={{
              flex: 1,
              padding: '10px 16px',
              background: '#E5E7EB',
              color: '#374151',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              opacity: saving ? 0.6 : 1,
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    );
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Users</h1>
          <p className="admin-page-sub">{users.length} total users</p>
        </div>
        <button 
          style={{
            padding: '10px 16px',
            background: '#3B82F6',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
          }}
          onClick={() => openUserModal(null, 'create')}
        >
          + Create User
        </button>
      </div>

      {/* Filter Reset Button */}
      {Object.values(columnFilters).some(v => v) && (
        <div style={{ marginBottom: '12px' }}>
          <button
            onClick={handleResetFilters}
            style={{
              padding: '6px 12px',
              background: '#F3F4F6',
              border: '1px solid #E5E7EB',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              color: '#6B7280',
            }}
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Table */}
      <div className="admin-table-container admin-desktop-table">
        <table className="admin-table">
          <thead className="admin-table-header">
            <tr>
              <HeaderCell label="User" keyName="name" type="select" options={users.map(u => u.Name)} />
              <HeaderCell label="Email" keyName="email" type="select" options={emailOptions} />
              <HeaderCell label="Role" keyName="role" type="select" options={roleOptions} />
              <HeaderCell label="Company" keyName="company" type="select" options={companyOptions} />
              <th>Created</th>
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody className="admin-table-body">
            {loading ? (
              <tr><td colSpan="6" style={{textAlign:'center',padding:'40px',color:'#9CA3AF'}}>Loading users...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="6" style={{textAlign:'center',padding:'40px',color:'#9CA3AF'}}>No users found</td></tr>
            ) : filtered.map((u) => {
              const rs = ROLE_STYLES[u.Role] || ROLE_STYLES.Client;
              return (
                <tr key={u.UserId}>
                  <td>
                    <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                      <div style={{width:'32px',height:'32px',borderRadius:'50%',
                        background:'#EEF2FF',border:'1px solid #C7D2FE',
                        display:'flex',alignItems:'center',justifyContent:'center',
                        fontSize:'13px',fontWeight:'700',color:'#4F46E5',flexShrink:0}}>
                        {u.Name?.charAt(0)?.toUpperCase()}
                      </div>
                      <span style={{fontWeight:'600'}}>{u.Name}</span>
                    </div>
                  </td>
                  <td style={{color:'#6B7280'}}>{u.Email}</td>
                  <td><span className="admin-badge" style={{background:rs.bg,color:rs.color}}>{u.Role}</span></td>
                  <td style={{color:'#6B7280'}}>{u.CompanyName || '—'}</td>
                  <td style={{color:'#9CA3AF',fontSize:'12px'}}>
                    {new Date(u.CreatedAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button
                        style={{
                          padding: '6px 12px',
                          background: '#F3F4F6',
                          border: '1px solid #E5E7EB',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          color: '#374151',
                          fontWeight: '500',
                        }}
                        onClick={() => openUserModal(u, 'view')}
                      >
                        View
                      </button>
                      <button
                        style={{
                          padding: '6px 12px',
                          background: '#F59E0B',
                          border: 'none',
                          borderRadius: '6px',

                          fontSize: '12px',
                          color: '#fff',
                          fontWeight: '500',
                          opacity: u.Role === 'Admin' ? 0.5 : 1,
                          cursor: u.Role === 'Admin' ? 'not-allowed' : 'pointer',
                        }}
                        disabled={u.Role === 'Admin'}
                        onClick={() => openUserModal(u, 'edit')}
                      >
                        Edit
                      </button>
                      <button
                        style={{
                          padding: '6px 12px',
                          background: u.Role === 'Admin' ? '#F3F4F6' : '#EEF2FF',
                          border: u.Role === 'Admin' ? 'none' : '1px solid #EEF2FF',
                          borderRadius: '6px',
                          cursor: u.Role === 'Admin' ? 'not-allowed' : 'pointer',
                          fontSize: '12px',
                          color: u.Role === 'Admin' ? '#9CA3AF' : '#4338CA',
                          fontWeight: '500',
                          opacity: deleting === u.UserId ? 0.6 : 1,
                        }}
                        onClick={() => handleDelete(u.UserId, u.Name)}
                        disabled={deleting === u.UserId || u.Role === 'Admin'}
                      >
                        {u.Role === 'Admin' ? 'Protected' : deleting === u.UserId ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="admin-mobile-cards">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '24px', color: '#9CA3AF' }}>Loading users...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: '#9CA3AF' }}>No users found</div>
        ) : filtered.map((u) => {
          const rs = ROLE_STYLES[u.Role] || ROLE_STYLES.Client;
          return (
            <div key={`mobile-user-${u.UserId}`} className="admin-mobile-card">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: 10 }}>
                <div style={{width:'34px',height:'34px',borderRadius:'50%',
                  background:'#EEF2FF',border:'1px solid #C7D2FE',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontSize:'13px',fontWeight:'700',color:'#4F46E5',flexShrink:0}}>
                  {u.Name?.charAt(0)?.toUpperCase()}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: '#1F2937', fontSize: 14 }}>{u.Name}</div>
                  <div style={{ color:'#6B7280', fontSize: 12 }}>{u.Email}</div>
                </div>
              </div>

              <div style={{ marginBottom: 6 }}>
                <span className="admin-badge" style={{background:rs.bg,color:rs.color}}>{u.Role}</span>
              </div>
              <div style={{ color:'#6B7280', fontSize: 12, marginBottom: 4 }}>Company: {u.CompanyName || '—'}</div>
              <div style={{ color:'#9CA3AF', fontSize: 12, marginBottom: 12 }}>
                Created: {new Date(u.CreatedAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  style={{
                    padding: '6px 12px',
                    background: '#F3F4F6',
                    border: '1px solid #E5E7EB',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    color: '#374151',
                    fontWeight: '500',
                  }}
                  onClick={() => openUserModal(u, 'view')}
                >
                  View
                </button>
                <button
                  style={{
                    padding: '6px 12px',
                    background: '#F59E0B',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: '#fff',
                    fontWeight: '500',
                    opacity: u.Role === 'Admin' ? 0.5 : 1,
                    cursor: u.Role === 'Admin' ? 'not-allowed' : 'pointer',
                  }}
                  disabled={u.Role === 'Admin'}
                  onClick={() => openUserModal(u, 'edit')}
                >
                  Edit
                </button>
                <button
                  style={{
                    padding: '6px 12px',
                    background: u.Role === 'Admin' ? '#F3F4F6' : '#EEF2FF',
                    border: u.Role === 'Admin' ? 'none' : '1px solid #EEF2FF',
                    borderRadius: '6px',
                    cursor: u.Role === 'Admin' ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    color: u.Role === 'Admin' ? '#9CA3AF' : '#4338CA',
                    fontWeight: '500',
                    opacity: deleting === u.UserId ? 0.6 : 1,
                  }}
                  onClick={() => handleDelete(u.UserId, u.Name)}
                  disabled={deleting === u.UserId || u.Role === 'Admin'}
                >
                  {u.Role === 'Admin' ? 'Protected' : deleting === u.UserId ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {modalMode && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}
        onClick={closeUserModal}
        >
          <div style={{
            background: '#fff',
            borderRadius: '8px',
            padding: '24px',
            width: '90%',
            maxWidth: '500px',
            border: '1px solid #E5E7EB',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '600', margin: 0, color: '#1F2937' }}>
                {modalMode === 'view' ? selectedUser?.Name : modalMode === 'edit' ? 'Edit User' : 'Create User'}
              </h2>
              <button
                onClick={closeUserModal}
                style={{
                  background: '#F3F4F6',
                  border: 'none',
                  borderRadius: '4px',
                  width: '28px',
                  height: '28px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6B7280',
                  fontSize: '18px',
                  fontWeight: '500',
                }}
              >
                ×
              </button>
            </div>

            {modalMode === 'view' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6B7280', marginBottom: '6px' }}>Name</label>
                  <p style={{ margin: 0, fontSize: '14px', color: '#1F2937' }}>{selectedUser?.Name}</p>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6B7280', marginBottom: '6px' }}>Email</label>
                  <p style={{ margin: 0, fontSize: '14px', color: '#1F2937' }}>{selectedUser?.Email}</p>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6B7280', marginBottom: '6px' }}>Role</label>
                  <p style={{ margin: 0, fontSize: '14px', color: '#1F2937' }}>{selectedUser?.Role}</p>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6B7280', marginBottom: '6px' }}>Company</label>
                  <p style={{ margin: 0, fontSize: '14px', color: '#1F2937' }}>{selectedUser?.CompanyName || '—'}</p>
                </div>
                <button
                  onClick={closeUserModal}
                  style={{
                    marginTop: '8px',
                    padding: '10px 16px',
                    background: '#E5E7EB',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                  }}
                >
                  Close
                </button>
              </div>
            ) : (
              <UserEditForm
                user={modalMode === 'create' ? null : selectedUser}
                onSave={handleSaveUser}
                onCancel={closeUserModal}
                isCreate={modalMode === 'create'}
                companies={companies}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
