import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import '../../styles/admin.css';

const RoleIcon = ({ role }) => {
  const icons = {
    Admin: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/>
      </svg>
    ),
    Manager: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
      </svg>
    ),
    Engineer: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M9.4 16.6L4.8 12l-1.4 1.4L9.4 19 21 7.4 19.6 6z"/>
      </svg>
    ),
    Client: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 18H4V4h16v16zm-8-2.5h6V13h-6v4.5zm0-6.5h6V6.5h-6V11zm-7-4.5h6V6.5H5V11zm0 6.5h6V13H5v4.5z"/>
      </svg>
    ),
  };
  return icons[role] || icons.Client;
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [allUsers, setAllUsers] = useState([]);
  const [allCompanies, setAllCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & filter states
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('All');
  const [companySearch, setCompanySearch] = useState('');

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    try {
      const [statsRes, usersRes, companiesRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users'),
        api.get('/admin/companies'),
      ]);
      setStats(statsRes.data.data || {});
      setAllUsers(usersRes.data.data || usersRes.data || []);
      setAllCompanies(companiesRes.data.data || companiesRes.data || []);
    } catch(err) {
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter users
  const filteredUsers = allUsers.filter(u => {
    const matchesSearch = u.Name?.toLowerCase().includes(userSearch.toLowerCase()) ||
                          u.Email?.toLowerCase().includes(userSearch.toLowerCase());
    const matchesRole = userRoleFilter === 'All' || u.Role === userRoleFilter;
    return matchesSearch && matchesRole;
  }).slice(0, 5);

  // Filter companies
  const filteredCompanies = allCompanies.filter(c =>
    (c.CompanyName || c.Name)?.toLowerCase().includes(companySearch.toLowerCase())
  ).slice(0, 5);

  if (loading) {
    return (
      <div className="admin-page" style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'300px'}}>
        <div style={{color:'#9CA3AF',fontSize:'14px'}}>Loading admin dashboard...</div>
      </div>
    );
  }

  const ROLE_COLORS = {
    Admin:    { bg:'#FEE2E2', color:'#991B1B' },
    Manager:  { bg:'#F5F3FF', color:'#4C1D95' },
    Engineer: { bg:'#ECFDF5', color:'#065F46' },
    Client:   { bg:'#EFF6FF', color:'#1E40AF' },
  };

  // Stat card colors - fully colored backgrounds like client dashboard
  const statCardColors = {
    companies: { bg: '#F59E0B', textColor: '#FFFFFF' },
    users:     { bg: '#4F46E5', textColor: '#FFFFFF' },
    engineers: { bg: '#10B981', textColor: '#FFFFFF' },
    tickets:   { bg: '#3B82F6', textColor: '#FFFFFF' },
    overdue:   { bg: '#EF4444', textColor: '#FFFFFF' },
  };

  // Enhanced role colors for distribution
  const roleDistributionColors = {
    Admin:    { bg:'#FEE2E2', color:'#DC2626', lightBg:'#FEF2F2', borderColor:'#FCA5A5', gradient:'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)' },
    Manager:  { bg:'#F3E8FF', color:'#9333EA', lightBg:'#FAF5FF', borderColor:'#E9D5FF', gradient:'linear-gradient(135deg, #9333EA 0%, #6B21A8 100%)' },
    Engineer: { bg:'#DCFCE7', color:'#16A34A', lightBg:'#F0FDF4', borderColor:'#86EFAC', gradient:'linear-gradient(135deg, #16A34A 0%, #15803D 100%)' },
    Client:   { bg:'#DBEAFE', color:'#2563EB', lightBg:'#F0F9FF', borderColor:'#93C5FD', gradient:'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)' },
  };

  return (
    <div className="admin-page">
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .stat-card-hover:hover {
          transform: translateY(-4px) !important;
          box-shadow: 0 10px 25px rgba(0,0,0,0.15) !important;
        }
         .role-card-hover:hover {
          transform: translateY(-2px) scale(1.01) !important;
          box-shadow: 0 8px 16px rgba(0,0,0,0.12) !important;
        }
        .search-input:focus {
          outline: none;
          border-color: #4F46E5 !important;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }
      `}</style>

      {/* Hero Banner - Header Only */}
      <div className="admin-hero">
        <div className="admin-hero-content">
          <div className="admin-hero-top">
            <div className="admin-hero-text">
              <div className="admin-hero-label">ADMIN PANEL</div>
              <h1>System Overview</h1>
              <div className="admin-hero-desc">
                Welcome back, <strong>{user?.name}</strong> — Full system control
              </div>
            </div>
            <div className="admin-hero-actions">
              <button className="admin-btn admin-btn-secondary" onClick={() => navigate('/admin/companies/new')}>
                + New Company
              </button>
              <button className="admin-btn admin-btn-primary" onClick={() => navigate('/admin/users/new')}>
                + Create User
              </button>
            </div>
          </div>
        </div>
      </div>

          {/* Stats Grid - Separate Section */}
          <div className="admin-stats-grid">
            {[
              {label:'Companies', value:stats.totalCompanies||0, icon:'companies'},
              {label:'Total Users', value:stats.totalUsers||0, icon:'users'},
              {label:'In Progress', value:stats.inProgressTickets||0, icon:'tickets'},
              {label:'Total Tickets', value:stats.totalTickets||0, icon:'overdue'},
              {label:'Overdue', value:stats.overdueTickets||0, icon:'engineers'},
            ].map(card => {
              const colors = statCardColors[card.icon];
              return (
              <div key={card.label} className="admin-stat-item stat-card-hover" style={{
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                background: colors.bg,
                border: '1px solid rgba(0, 0, 0, 0.2)',
                borderRadius: '12px',
                padding: '20px 24px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
              }}>
                  {/* Label */}
                  <div className="admin-stat-label" style={{
                    color: colors.textColor, 
                    fontSize: '11px', 
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.07em',
                  }}>
                    {card.label}
                  </div>
                  
                  {/* Value */}
                  <div className="admin-stat-value" style={{
                    color: colors.textColor, 
                    fontSize: '32px', 
                    fontWeight: '700',
                    lineHeight: 1,
                  }}>
                    {card.value}
                  </div>
                </div>
              );
            })}
          </div>

      {/* Role Distribution - Compact (no progress bar) */}
      <div className="admin-card">
        <h2 style={{ fontSize:'18px', fontWeight:'700', color:'#1E293B', marginBottom:'14px', margin:0 }}>
          User Role Distribution
        </h2>

        <div
          className="admin-grid-2col"
          style={{ gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))', gap:'10px', marginBottom:0 }}
        >
          {[
            { role:'Admin', count:stats.adminCount || 1 },
            { role:'Manager', count:stats.managerCount || 0 },
            { role:'Engineer', count:stats.engineerCount || 0 },
            { role:'Client', count:stats.clientCount || 0 },
          ].map(item => {
            const colors = roleDistributionColors[item.role];
            return (
              <div
                key={item.role}
                className="role-card-hover"
                style={{
                  background:'#FFFFFF',
                  border:`1px solid ${colors.borderColor}`,
                  borderRadius:'10px',
                  padding:'10px',
                  cursor:'pointer',
                  transition:'all 0.2s ease',
                  boxShadow:'0 1px 4px rgba(0,0,0,0.08)',
                }}
                onClick={() => navigate('/admin/users')}
              >
                <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                  <div
                    style={{
                      width:'28px',
                      height:'28px',
                      background:colors.gradient,
                      borderRadius:'8px',
                      color:'#FFFFFF',
                      display:'flex',
                      alignItems:'center',
                      justifyContent:'center',
                      flexShrink: 0,
                    }}
                  >
                    <RoleIcon role={item.role} />
                  </div>
                  <div style={{ fontSize:'12px', fontWeight:'700', color:colors.color, flex: 1 }}>
                    {item.role}
                  </div>
                  <div style={{ fontSize:'22px', fontWeight:'800', color:'#111827', lineHeight:1.1 }}>
                    {item.count}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>


      {/* Recent Users & Companies - With Search & Filter */}
      <div className="admin-grid-2col">
        {/* Recent Users - Enhanced */}
        <div className="admin-card">
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px'}}>
            <h2 style={{fontSize:'18px', fontWeight:'700', color:'#1E293B', margin:0}}>
              Recent Users
            </h2>
            <button className="admin-link-btn" onClick={() => navigate('/admin/users')}>
              View all →
            </button>
          </div>

          {/* Search & Filter */}
          <div style={{display: 'flex', gap: '10px', marginBottom: '14px'}}>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="search-input"
              style={{
                flex: 1,
                padding: '8px 12px',
                fontSize: '12px',
                border: '1px solid #E5E7EB',
                borderRadius: '6px',
                fontFamily: 'Poppins, sans-serif',
                transition: 'all 0.2s ease',
                boxSizing: 'border-box'
              }}
            />
            <select
              value={userRoleFilter}
              onChange={(e) => setUserRoleFilter(e.target.value)}
              style={{
                flex: 1,
                padding: '8px 10px',
                fontSize: '12px',
                border: '1px solid #E5E7EB',
                borderRadius: '6px',
                fontFamily: 'Poppins, sans-serif',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxSizing: 'border-box'
              }}
            >
              <option value="All">All Roles</option>
              <option value="Admin">Admin</option>
              <option value="Manager">Manager</option>
              <option value="Engineer">Engineer</option>
              <option value="Client">Client</option>
            </select>
          </div>

          {/* User Count */}
          {filteredUsers.length > 0 && (
            <div style={{fontSize: '11px', color: '#9CA3AF', marginBottom: '10px'}}>
              Showing {filteredUsers.length} of {allUsers.length} users
            </div>
          )}

          {/* Users List */}
          {filteredUsers.length === 0 ? (
            <div style={{textAlign:'center', padding:'24px', color:'#9CA3AF', fontSize:'13px'}}>
              No users found
            </div>
          ) : (
            filteredUsers.map((u, i) => {
              const rc = ROLE_COLORS[u.Role] || ROLE_COLORS.Client;
              return (
                <div key={u.UserID || u.UserId} 
                  onClick={() => navigate(`/admin/users/${u.UserID || u.UserId}`)}
                  style={{
                    display:'flex', alignItems:'center', gap:'10px', padding:'12px 0',
                    borderBottom:i<filteredUsers.length-1?'1px solid #F1F5F9':'none',
                    cursor: 'pointer',
                    transition: 'background 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#F9FAFB'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{width:'34px', height:'34px', borderRadius:'50%', background:rc.bg,
                    border:`2px solid ${rc.color}`, display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:'12px', fontWeight:'700', color:rc.color, flexShrink:0}}>
                    {u.Name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{fontSize:'13px', fontWeight:'600', color:'#1E293B',
                      whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>
                      {u.Name}
                    </div>
                    <div style={{fontSize:'11px', color:'#9CA3AF'}}>{u.Email}</div>
                  </div>
                  <span className="admin-badge" style={{background:rc.bg, color:rc.color}}>
                    {u.Role}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Registered Companies - Enhanced */}
        <div className="admin-card">
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px'}}>
            <h2 style={{fontSize:'18px', fontWeight:'700', color:'#1E293B', margin:0}}>
              Registered Companies
            </h2>
            <button className="admin-link-btn" onClick={() => navigate('/admin/companies')}>
              View all →
            </button>
          </div>

          {/* Search Bar */}
          <input
            type="text"
            placeholder="Search companies..."
            value={companySearch}
            onChange={(e) => setCompanySearch(e.target.value)}
            className="search-input"
            style={{
              width: '100%',
              padding: '8px 12px',
              fontSize: '12px',
              border: '1px solid #E5E7EB',
              borderRadius: '6px',
              marginBottom: '14px',
              fontFamily: 'Poppins, sans-serif',
              boxSizing: 'border-box',
              transition: 'all 0.2s ease'
            }}
          />

          {/* Company Count */}
          {filteredCompanies.length > 0 && (
            <div style={{fontSize: '11px', color: '#9CA3AF', marginBottom: '10px'}}>
              Showing {filteredCompanies.length} of {allCompanies.length} companies
            </div>
          )}

          {/* Companies List */}
          {filteredCompanies.length === 0 ? (
            <div style={{textAlign:'center', padding:'24px', color:'#9CA3AF', fontSize:'13px'}}>
              No companies found
            </div>
          ) : (
            filteredCompanies.map((c, i) => (
              <div key={c.CompanyID || c.CompanyId} 
                onClick={() => navigate(`/admin/companies/${c.CompanyID || c.CompanyId}`)}
                style={{
                  display:'flex', alignItems:'center', gap:'10px', padding:'12px 0',
                  borderBottom:i<filteredCompanies.length-1?'1px solid #F1F5F9':'none',
                  cursor: 'pointer',
                  transition: 'background 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#F9FAFB'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{width:'34px', height:'34px', borderRadius:'8px',
                  background:'linear-gradient(135deg,#4F46E5,#0EA5E9)', display:'flex',
                  alignItems:'center', justifyContent:'center', fontSize:'13px',
                  fontWeight:'700', color:'#fff', flexShrink:0}}>
                  {c.CompanyName?.charAt(0)?.toUpperCase() || c.Name?.charAt(0)?.toUpperCase()}
                </div>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontSize:'13px', fontWeight:'600', color:'#1E293B'}}>
                    {c.CompanyName || c.Name}
                  </div>
                  <div style={{fontSize:'11px', color:'#9CA3AF'}}>
                    {c.ContactEmail || c.Email || 'No contact'}
                  </div>
                </div>
                <span className="admin-badge admin-badge-active">Active</span>
              </div>
            ))
          )}
        </div>
      </div>


    </div>
  );
}
