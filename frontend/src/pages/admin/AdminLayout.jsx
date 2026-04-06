import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import useUnreadCount from '../../hooks/useUnreadCount';
import '../../styles/admin.css';

const Icons = {
  dashboard: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  companies: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  users: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  tickets: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z"/></svg>,
  messages: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  notifications: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  sla: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  audit: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>,
  reports: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  products: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>,
  logout: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
};

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const unreadCount = useUnreadCount();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    setMobileOpen(false);
    logout();
    navigate('/login');
  };

  return (
    <div className="admin-wrapper">
      <button
        type="button"
        className="admin-mobile-nav-toggle"
        onClick={() => setMobileOpen((prev) => !prev)}
        aria-label="Toggle admin navigation"
      >
        ☰
      </button>

      <div
        className={`admin-sidebar-overlay${mobileOpen ? ' active' : ''}`}
        onClick={() => setMobileOpen(false)}
      />

      {/* ── SIDEBAR ── */}
      <aside className={`admin-sidebar${mobileOpen ? ' mobile-open' : ''}`}>

        {/* Brand */}
        <div className="admin-brand">
          <div className="admin-brand-logo">AD</div>
          <div className="admin-brand-text">
            <div className="admin-brand-name">TicketDesk</div>
            <div className="admin-brand-subtitle">Admin Panel</div>
          </div>
        </div>

        {/* User info */}
        <div className="admin-user">
          <div className="admin-user-avatar">
            {user?.name?.charAt(0)?.toUpperCase() || 'A'}
          </div>
          <div className="admin-user-info">
            <div className="admin-user-name">{user?.name || 'Admin'}</div>
            <span className="admin-user-badge">Super Admin</span>
          </div>
        </div>

        <div className="admin-divider" />

        {/* Nav */}
        <nav className="admin-nav">
          <NavLink to="/admin" end className={({isActive})=>isActive ? 'admin-nav-item active' : 'admin-nav-item'} onClick={() => setMobileOpen(false)}>
            {Icons.dashboard}<span>Dashboard</span>
          </NavLink>
          <NavLink to="/admin/tickets" className={({isActive})=>isActive ? 'admin-nav-item active' : 'admin-nav-item'} onClick={() => setMobileOpen(false)}>
            {Icons.tickets}<span>Tickets</span>
          </NavLink>
          <NavLink to="/admin/companies" className={({isActive})=>isActive ? 'admin-nav-item active' : 'admin-nav-item'} onClick={() => setMobileOpen(false)}>
            {Icons.companies}<span>Companies</span>
          </NavLink>
          <NavLink to="/admin/users" className={({isActive})=>isActive ? 'admin-nav-item active' : 'admin-nav-item'} onClick={() => setMobileOpen(false)}>
            {Icons.users}<span>Users</span>
          </NavLink>
          <NavLink to="/admin/messages" className={({isActive})=>isActive ? 'admin-nav-item active' : 'admin-nav-item'} onClick={() => setMobileOpen(false)}>
            {Icons.messages}<span style={{flex:1}}>Messages</span>
            {unreadCount > 0 && (
              <span style={{background:'#EF4444',color:'#fff',fontSize:'10px',
                fontWeight:'700',padding:'1px 6px',borderRadius:'999px',
                minWidth:'18px',textAlign:'center'}}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </NavLink>
          <NavLink to="/admin/notifications" className={({isActive})=>isActive ? 'admin-nav-item active' : 'admin-nav-item'} onClick={() => setMobileOpen(false)}>
            {Icons.notifications}<span>Notifications</span>
          </NavLink>
          <NavLink to="/admin/sla" className={({isActive})=>isActive ? 'admin-nav-item active' : 'admin-nav-item'} onClick={() => setMobileOpen(false)}>
            {Icons.sla}<span>SLA Settings</span>
          </NavLink>
          <NavLink to="/admin/audit-logs" className={({isActive})=>isActive ? 'admin-nav-item active' : 'admin-nav-item'} onClick={() => setMobileOpen(false)}>
            {Icons.audit}<span>Audit Logs</span>
          </NavLink>
          <NavLink to="/admin/reports" className={({isActive})=>isActive ? 'admin-nav-item active' : 'admin-nav-item'} onClick={() => setMobileOpen(false)}>
            {Icons.reports}<span>Reports</span>
          </NavLink>
          <NavLink to="/admin/products" className={({isActive})=>isActive ? 'admin-nav-item active' : 'admin-nav-item'} onClick={() => setMobileOpen(false)}>
            {Icons.products}<span>Products</span>
          </NavLink>
        </nav>

        {/* Bottom */}
        <div style={{flex:'1'}} />
        <div className="admin-nav-bottom">
          <button className="admin-logout-btn" onClick={handleLogout}>
            {Icons.logout}<span>Logout</span>
          </button>
        </div>

      </aside>

      {/* ── MAIN ── */}
      <div className="admin-main">
        <Outlet />
      </div>

    </div>
  );
}