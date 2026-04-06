import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import '../../styles/admin.css';

// Professional Dropdown Component - NOT USED
/*
const ProfessionalSelect = ({ options, value, onChange, placeholder, label }) => {
  const [open, setOpen] = useState(false);
  const [searchText, setSearchText] = useState('');

  const filtered = options.filter((opt) =>
    String(opt).toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <div style={{ width: '100%', position: 'relative' }}>
      {label && <label style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', marginBottom: '6px', display: 'block' }}>{label}</label>}
      <div
        onClick={() => setOpen(!open)}
        style={{
          padding: '8px 12px',
          border: '1px solid #E5E7EB',
          borderRadius: '8px',
          background: '#fff',
          cursor: 'pointer',
          fontSize: '14px',
          color: value ? '#1F2937' : '#9CA3AF',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>{value ? value : placeholder}</span>
        <span style={{ fontSize: '12px', opacity: 0.6 }}>▼</span>
      </div>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: '#fff',
            border: '1px solid #E5E7EB',
            borderTop: 'none',
            borderRadius: '0 0 8px 8px',
            marginTop: '-1px',
            zIndex: 10,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
          }}
        >
          <input
            type="text"
            placeholder="Search..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            autoFocus
            style={{
              width: '100%',
              padding: '8px 12px',
              border: 'none',
              borderBottom: '1px solid #E5E7EB',
              fontSize: '13px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '12px', color: '#9CA3AF', textAlign: 'center', fontSize: '13px' }}>
                No results
              </div>
            ) : (
              filtered.map((opt) => (
                <div
                  key={opt}
                  onClick={() => {
                    onChange(opt);
                    setOpen(false);
                    setSearchText('');
                  }}
                  style={{
                    padding: '10px 12px',
                    cursor: 'pointer',
                    backgroundColor: value === opt ? '#F3F4F6' : '#fff',
                    borderLeft: value === opt ? '4px solid #3B82F6' : '4px solid transparent',
                    color: value === opt ? '#1F2937' : '#6B7280',
                    fontWeight: value === opt ? '600' : '400',
                    fontSize: '14px',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#F9FAFB';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = value === opt ? '#F3F4F6' : '#fff';
                  }}
                >
                  {opt}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
*/

// Clickable Header Cell with Filter - NOT USED (filters always visible below)
// Keeping for reference if needed later

export default function AdminCompanies() {
  const [companies, setCompanies] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [openFilterKey, setOpenFilterKey] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [modalMode, setModalMode] = useState(null); // 'view', 'edit', or 'create'
  const [columnFilters, setColumnFilters] = useState({
    id: '',
    name: '',
    createdDate: '',
    status: '',
  });

  useEffect(() => { 
    fetchCompanies();
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const res = await api.get('/admin/tickets');
      setTickets(res.data.data || []);
    } catch(err) { 
      console.error('Error fetching tickets:', err);
    }
  };

  useEffect(() => {
    const onOutsideClick = (e) => {
      if (!e.target.closest('.header-filter-wrap')) setOpenFilterKey(null);
    };
    document.addEventListener('mousedown', onOutsideClick);
    return () => document.removeEventListener('mousedown', onOutsideClick);
  }, []);

  const fetchCompanies = async () => {
    try {
      const res = await api.get('/admin/companies');
      setCompanies(res.data.data || res.data || []);
    } catch(err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete company "${name}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      await api.delete(`/admin/companies/${id}`);
      setCompanies(prev => prev.filter(c => c.CompanyId !== id));
    } catch(err) {
      alert(err?.response?.data?.message || 'Failed to delete company');
    } finally { setDeleting(null); }
  };

  const openCompanyModal = (company, mode) => {
    setSelectedCompany(company);
    setModalMode(mode);
  };

  const closeCompanyModal = () => {
    setSelectedCompany(null);
    setModalMode(null);
  };

  const handleSaveCompany = async (updatedData) => {
    try {
      if (modalMode === 'create') {
        // Create new company
        const res = await api.post('/admin/companies', updatedData);
        setCompanies([...companies, res.data.data]);
        alert('Company created successfully');
      } else {
        // Edit existing company
        await api.put(`/admin/companies/${selectedCompany.CompanyId}`, updatedData);
        setCompanies(prev => prev.map(c => c.CompanyId === selectedCompany.CompanyId ? { ...c, ...updatedData } : c));
        alert('Company updated successfully');
      }
      closeCompanyModal();
    } catch(err) {
      alert(err?.response?.data?.message || (modalMode === 'create' ? 'Failed to create company' : 'Failed to update company'));
    }
  };

  const statusOptions = ['ACTIVE', 'INACTIVE'];
  const dateOptions = [...new Set(companies.map(c => 
    new Date(c.CreatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  ))];
  const companyNameOptions = companies.map(c => c.CompanyName);
  const idOptions = companies.map(c => `#${c.CompanyId}`);

  const handleResetFilters = () => {
    setColumnFilters({ id: '', name: '', createdDate: '', status: '' });
    setOpenFilterKey(null);
  };

  const filtered = companies.filter((c) => {
    const companyName = (c.CompanyName || '').toLowerCase();
    const companyId = `#${c.CompanyId}`;
    const createdDate = new Date(c.CreatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    
    return (
      (!columnFilters.name || companyName.includes(columnFilters.name.toLowerCase())) &&
      (!columnFilters.id || companyId.includes(columnFilters.id)) &&
      (!columnFilters.createdDate || createdDate === columnFilters.createdDate) &&
      (!columnFilters.status || 'ACTIVE' === columnFilters.status)
    );
  });

  // Calculate stats
  const totalCompanies = companies.length;
  const totalClients = new Set(tickets.map(t => t.CompanyID)).size;
  
  const companyTicketCounts = companies.map(c => ({
    ...c,
    ticketCount: tickets.filter(t => t.CompanyID === c.CompanyId).length
  }));
  const mostActiveCompany = companyTicketCounts.length > 0 
    ? companyTicketCounts.reduce((max, c) => c.ticketCount > max.ticketCount ? c : max)
    : null;

  const HeaderCell = ({ label, keyName, type = 'text', options = [] }) => {
    const isOpen = openFilterKey === keyName;
    const [searchText, setSearchText] = useState('');

    const filteredOptions = type === 'select' 
      ? options.filter(opt => String(opt).toLowerCase().includes(searchText.toLowerCase()))
      : [];

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
                  className="admin-form-input"
                  style={{ width: '100%', padding: '10px 12px', minWidth: 240, border: 'none', borderRadius: 10 }}
                  autoFocus
                />
              )}
            </div>
          )}
        </div>
      </th>
    );
  };

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="admin-page-title">Companies</h1>
          <p className="admin-page-sub">{companies.length} registered companies</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {Object.values(columnFilters).some(v => v) && (
            <button
              onClick={handleResetFilters}
              style={{
                padding: '8px 16px',
                background: '#6B7280',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '600',
                whiteSpace: 'nowrap',
              }}
            >
              ↺ Clear Filters
            </button>
          )}
          <button 
            className="admin-btn" 
            onClick={() => {
              setSelectedCompany(null);
              setModalMode('create');
            }}
            style={{ padding: '10px 20px', fontSize: '14px', fontWeight: '600', background: '#3B82F6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            + Register Company
          </button> 
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '12px',
        marginBottom: '20px',
      }}>
        {/* Total Companies Card */}
        <div style={{
          background: '#3B82F6',
          borderRadius: '8px',
          padding: '12px',
          color: '#fff',
          boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)',
          transition: 'all 0.3s ease',
          cursor: 'pointer',
          border: 'none',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.12)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.08)';
        }}
        >
          <div style={{ fontSize: '13px', fontWeight: '600', opacity: 0.9, marginBottom: '8px', color: '#fff' }}>Total Companies</div>
          <div style={{ fontSize: '32px', fontWeight: '700', marginBottom: '6px', color: '#fff' }}>{totalCompanies}</div>
          <div style={{ fontSize: '11px', opacity: 0.8, color: '#fff' }}>Registered</div>
        </div>

        {/* Total Clients Card */}
        <div style={{
          background: '#EF4444',
          borderRadius: '8px',
          padding: '12px',
          color: '#fff',
          boxShadow: '0 4px 12px rgba(239, 68, 68, 0.25)',
          transition: 'all 0.3s ease',
          cursor: 'pointer',
          border: 'none',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.12)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.08)';
        }}
        >
          <div style={{ fontSize: '13px', fontWeight: '600', opacity: 0.9, marginBottom: '8px', color: '#fff' }}>Total Clients</div>
          <div style={{ fontSize: '32px', fontWeight: '700', marginBottom: '6px', color: '#fff' }}>{totalClients}</div>
          <div style={{ fontSize: '11px', opacity: 0.8, color: '#fff' }}>Unique</div>
        </div>

        {/* Most Active Company Card */}
        <div style={{
          background: '#8B5CF6',
          borderRadius: '8px',
          padding: '12px',
          color: '#fff',
          boxShadow: '0 4px 12px rgba(139, 92, 246, 0.25)',
          transition: 'all 0.3s ease',
          cursor: 'pointer',
          border: 'none',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.12)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.08)';
        }}
        >
          <div style={{ fontSize: '13px', fontWeight: '600', opacity: 0.9, marginBottom: '8px', color: '#fff' }}>Most Active</div>
          <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#fff' }}>
            {mostActiveCompany ? mostActiveCompany.CompanyName : 'N/A'}
          </div>
          <div style={{ fontSize: '11px', opacity: 0.8, color: '#fff' }}>
            {mostActiveCompany ? `${mostActiveCompany.ticketCount} tickets` : '-'}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="admin-table-container admin-desktop-table">
        <table className="admin-table">
          <thead className="admin-table-header">
            <tr>
              <HeaderCell label="ID" keyName="id" type="select" options={idOptions} />
              <HeaderCell label="Company Name" keyName="name" type="select" options={companyNameOptions} />
              <HeaderCell label="Created Date" keyName="createdDate" type="select" options={dateOptions} />
              <HeaderCell label="Status" keyName="status" type="select" options={statusOptions} />
              <th style={{ textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody className="admin-table-body">
            {loading ? (
              <tr><td colSpan="5" style={{textAlign:'center',padding:'40px',color:'#9CA3AF'}}>Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan="5" style={{textAlign:'center',padding:'40px',color:'#9CA3AF'}}>No companies found</td></tr>
            ) : filtered.map((c, i) => (
              <tr key={c.CompanyId}>
                <td style={{color:'#9CA3AF',fontWeight:'600',fontSize:'12px'}}>#{c.CompanyId}</td>
                <td>
                  <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                    <div style={{width:'32px',height:'32px',borderRadius:'8px',
                      background:'linear-gradient(135deg,#4F46E5,#0EA5E9)',
                      display:'flex',alignItems:'center',justifyContent:'center',
                      color:'#fff',fontSize:'13px',fontWeight:'700',flexShrink:0}}>
                      {c.CompanyName?.charAt(0)?.toUpperCase()}
                    </div>
                    <span style={{fontWeight:'600'}}>{c.CompanyName}</span>
                  </div>
                </td>
                <td style={{color:'#6B7280'}}>
                  {new Date(c.CreatedAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
                </td>
                <td><span className="admin-badge admin-badge-active">Active</span></td>
                <td style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                    <button
                      className="admin-btn admin-btn-ghost"
                      onClick={() => openCompanyModal(c, 'view')}
                      style={{ padding: '5px 10px', fontSize: '12px' }}
                    >
                      View
                    </button>
                    <button
                      className="admin-btn"
                      onClick={() => openCompanyModal(c, 'edit')}
                      style={{ padding: '5px 10px', fontSize: '12px', background: '#F59E0B', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}
                    >
                      Edit
                    </button>
                    <button
                      className="admin-btn admin-btn-danger"
                      onClick={() => handleDelete(c.CompanyId, c.CompanyName)}
                      disabled={deleting === c.CompanyId}
                      style={{ padding: '5px 10px', fontSize: '12px', opacity: deleting === c.CompanyId ? 0.6 : 1 }}
                    >
                      {deleting === c.CompanyId ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="admin-mobile-cards">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '24px', color: '#9CA3AF' }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: '#9CA3AF' }}>No companies found</div>
        ) : filtered.map((c) => (
          <div key={`mobile-company-${c.CompanyId}`} className="admin-mobile-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
              <div style={{width:'34px',height:'34px',borderRadius:'8px',
                background:'linear-gradient(135deg,#4F46E5,#0EA5E9)',
                display:'flex',alignItems:'center',justifyContent:'center',
                color:'#fff',fontSize:'13px',fontWeight:'700',flexShrink:0}}>
                {c.CompanyName?.charAt(0)?.toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: '#1F2937', fontSize: 14 }}>{c.CompanyName}</div>
                <div style={{ color:'#9CA3AF',fontWeight:'600',fontSize:'12px' }}>#{c.CompanyId}</div>
              </div>
            </div>

            <div style={{ color:'#6B7280', fontSize: 12, marginBottom: 6 }}>
              Created: {new Date(c.CreatedAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
            </div>
            <div style={{ marginBottom: 12 }}>
              <span className="admin-badge admin-badge-active">Active</span>
            </div>

            <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
              <button
                className="admin-btn admin-btn-ghost"
                onClick={() => openCompanyModal(c, 'view')}
                style={{ padding: '6px 10px', fontSize: '12px' }}
              >
                View
              </button>
              <button
                className="admin-btn"
                onClick={() => openCompanyModal(c, 'edit')}
                style={{ padding: '6px 10px', fontSize: '12px', background: '#F59E0B', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}
              >
                Edit
              </button>
              <button
                className="admin-btn admin-btn-danger"
                onClick={() => handleDelete(c.CompanyId, c.CompanyName)}
                disabled={deleting === c.CompanyId}
                style={{ padding: '6px 10px', fontSize: '12px', opacity: deleting === c.CompanyId ? 0.6 : 1 }}
              >
                {deleting === c.CompanyId ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Company Modal */}
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
        onClick={closeCompanyModal}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '8px',
              padding: '24px',
              maxWidth: '450px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
              border: '1px solid #E5E7EB',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#1F2937' }}>
                {modalMode === 'view' ? 'Company Details' : modalMode === 'edit' ? 'Edit Company' : 'Register New Company'}
              </h2>
              <button
                onClick={closeCompanyModal}
                style={{
                  background: '#F3F4F6',
                  color: '#6B7280',
                  border: 'none',
                  borderRadius: '4px',
                  width: '28px',
                  height: '28px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ×
              </button>
            </div>

            {modalMode === 'view' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', display: 'block', marginBottom: '6px' }}>Company ID</label>
                  <p style={{ margin: 0, fontSize: '14px', color: '#1F2937', fontWeight: '500' }}>#{selectedCompany.CompanyId}</p>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', display: 'block', marginBottom: '6px' }}>Company Name</label>
                  <p style={{ margin: 0, fontSize: '14px', color: '#1F2937', fontWeight: '500' }}>{selectedCompany.CompanyName}</p>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', display: 'block', marginBottom: '6px' }}>Created Date</label>
                  <p style={{ margin: 0, fontSize: '14px', color: '#1F2937', fontWeight: '500' }}>
                    {new Date(selectedCompany.CreatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', display: 'block', marginBottom: '6px' }}>Status</label>
                  <span style={{ display: 'inline-block', padding: '4px 12px', background: '#D1FAE5', color: '#065F46', borderRadius: '6px', fontSize: '12px', fontWeight: '600' }}>Active</span>
                </div>
              </div>
            ) : (
              <CompanyEditForm 
                company={selectedCompany} 
                onSave={handleSaveCompany} 
                onCancel={closeCompanyModal}
                isCreate={modalMode === 'create'}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Company Edit/Create Form Component
function CompanyEditForm({ company, onSave, onCancel, isCreate }) {
  const [formData, setFormData] = useState({
    CompanyName: company?.CompanyName || '',
  });
  const [saving, setSaving] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.CompanyName.trim()) {
      alert('Company name is required');
      return;
    }
    setSaving(true);
    try {
      await onSave(formData);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <label style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', display: 'block', marginBottom: '6px' }}>Company Name *</label>
        <input
          type="text"
          name="CompanyName"
          value={formData.CompanyName}
          onChange={handleInputChange}
          placeholder="Enter company name"
          style={{
            width: '100%',
            padding: '10px 12px',
            border: '1px solid #E5E7EB',
            borderRadius: '8px',
            fontSize: '14px',
            boxSizing: 'border-box',
            outline: 'none',
          }}
          onFocus={(e) => e.target.style.borderColor = '#3B82F6'}
          onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
        />
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
}
