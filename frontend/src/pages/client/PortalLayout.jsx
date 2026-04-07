import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import useUnreadCount from '../../hooks/useUnreadCount';
import '../../styles/portal.css';
import '../../styles/admin.css';

const Icons = {
  dashboard: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  tickets: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z"/></svg>,
  raise: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>,
  messages: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  notifications: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  reports: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  profile: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  logout: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
};

export default function PortalLayout() {
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
        aria-label="Toggle client navigation"
      >
        ☰
      </button>

      <div
        className={`admin-sidebar-overlay${mobileOpen ? ' active' : ''}`}
        onClick={() => setMobileOpen(false)}
      />

      <aside className={`admin-sidebar${mobileOpen ? ' mobile-open' : ''}`}>
        <div className="admin-brand">
          <div className="admin-brand-logo">TD</div>
          <div className="admin-brand-text">
            <div className="admin-brand-name">TicketDesk</div>
            <div className="admin-brand-subtitle">Client Panel</div>
          </div>
        </div>

        <div className="admin-user">
          <div className="admin-user-avatar">
            {user?.name?.charAt(0)?.toUpperCase() || 'C'}
          </div>
          <div className="admin-user-info">
            <div className="admin-user-name">{user?.name || 'Client'}</div>
            <span className="admin-user-badge">Client</span>
          </div>
        </div>

        <div className="admin-divider" />

        <nav className="admin-nav">
          <NavLink to="/client" end className={({ isActive }) => isActive ? 'admin-nav-item active' : 'admin-nav-item'} onClick={() => setMobileOpen(false)}>
            {Icons.dashboard}<span>Dashboard</span>
          </NavLink>
          <NavLink to="/client/tickets" className={({ isActive }) => isActive ? 'admin-nav-item active' : 'admin-nav-item'} onClick={() => setMobileOpen(false)}>
            {Icons.tickets}<span>My Tickets</span>
          </NavLink>
          <NavLink to="/client/tickets/new" className={({ isActive }) => isActive ? 'admin-nav-item active' : 'admin-nav-item'} onClick={() => setMobileOpen(false)}>
            {Icons.raise}<span>Raise Ticket</span>
          </NavLink>
          <NavLink to="/client/reports" className={({ isActive }) => isActive ? 'admin-nav-item active' : 'admin-nav-item'} onClick={() => setMobileOpen(false)}>
            {Icons.reports}<span>Reports</span>
          </NavLink>
          <NavLink to="/client/messages" className={({ isActive }) => isActive ? 'admin-nav-item active' : 'admin-nav-item'} onClick={() => setMobileOpen(false)}>
            {Icons.messages}<span style={{flex:1}}>Messages</span>
            {unreadCount > 0 && (
              <span style={{background:'#EF4444',color:'#fff',fontSize:'10px',
                fontWeight:'700',padding:'1px 6px',borderRadius:'999px',
                minWidth:'18px',textAlign:'center'}}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </NavLink>
          <NavLink to="/client/notifications" className={({ isActive }) => isActive ? 'admin-nav-item active' : 'admin-nav-item'} onClick={() => setMobileOpen(false)}>
            {Icons.notifications}<span>Notifications</span>
          </NavLink>
          <NavLink to="/client/profile" className={({ isActive }) => isActive ? 'admin-nav-item active' : 'admin-nav-item'} onClick={() => setMobileOpen(false)}>
            {Icons.profile}<span>My Profile</span>
          </NavLink>
        </nav>

        <div style={{ flex: '1' }} />
        <div className="admin-nav-bottom">
          <button className="admin-logout-btn" onClick={handleLogout}>
            {Icons.logout}<span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
}
