import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import api from '../services/api';
import useUnreadCount from '../hooks/useUnreadCount';
import './Sidebar.css';

// SVG Icons as inline components
const Icons = {
  dashboard: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 13h2v8H3v-8zm4-8h2v16H7V5zm4-2h2v18h-2V3zm4 4h2v14h-2V7zm4-2h2v16h-2V5z" />
    </svg>
  ),
  tickets: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-5.04-6.71l-2.75 3.54-2.08-2.01-1.41 1.41L10.5 19l4.96-6.35z" />
    </svg>
  ),
  overdue: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M13 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V9h-7V2zm3 13h-2v2h-2v-2h-2v-2h2v-2h2v2h2v2z"/>
    </svg>
  ),
  reports: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M5 9h14V5H5v4zm0 5h9v-4H5v4zm9 7H5v-4h9v4zm4-4v-4h4v4h-4zm-4-9V5h4v4h-4z"/>
    </svg>
  ),
  csat: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>
    </svg>
  ),
  messages: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
    </svg>
  ),
  notifications: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
    </svg>
  ),
  settings: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.62l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.48.1.62l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.62l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.48-.1-.62l-2.03-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
    </svg>
  ),
  logout: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
    </svg>
  ),
};

export default function Sidebar({ user, onLogout, mobileOpen = false, setMobileOpen }) {
  const navigate = useNavigate();
  const role = user?.role || '';
  const [unreadCount, setUnreadCount] = useState(0);
  const unreadMessagesCount = useUnreadCount();

  const closeMobileMenu = () => {
    if (setMobileOpen) {
      setMobileOpen(false);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const res = await api.get('/auth/notifications/unread');
      setUnreadCount(res.data.unreadCount || 0);
    } catch(err) {
      console.error('Failed to fetch unread count:', err);
    }
  };

  const handleLogout = () => {
    closeMobileMenu();
    onLogout();
    navigate('/login');
  };

  return (
    <>
    <div
      className={`sidebar-overlay${mobileOpen ? ' active' : ''}`}
      onClick={closeMobileMenu}
    />
    <div className={`sidebar${mobileOpen ? ' open' : ''}`}>
      {/* ── APP LOGO / NAME ── */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-logo">TD</div>
        <div className="sidebar-brand-text-group">
          <div className="sidebar-brand-name">TicketDesk</div>
          <div className="sidebar-brand-subtitle">{role.toUpperCase()} PANEL</div>
        </div>
      </div>

      {/* ── USER INFO ── */}
      <div className="sidebar-user">
        <div className="sidebar-avatar">
          {user?.name?.charAt(0)?.toUpperCase() || 'U'}
        </div>
        <div className="sidebar-user-info">
          <div className="sidebar-user-name">{user?.name || 'User'}</div>
          <span className={`sidebar-role-badge ${role.toLowerCase()}`}>
            {role}
          </span>
        </div>
      </div>

      <div className="sidebar-divider"></div>

      {/* ── NAVIGATION — all items, no gaps ── */}
      <nav className="sidebar-nav">
        <NavLink
          to="/dashboard"
          className={({ isActive }) => `sidebar-nav-item${isActive ? ' active' : ''}`}
          onClick={closeMobileMenu}
        >
          {Icons.dashboard}
          <span>Dashboard</span>
        </NavLink>

        <NavLink
          to="/tickets"
          end
          className={({ isActive }) => `sidebar-nav-item${isActive ? ' active' : ''}`}
          onClick={closeMobileMenu}
        >
          {Icons.tickets}
          <span>Tickets</span>
        </NavLink>

        {role === 'Manager' ? (
          <NavLink
            to="/overdue"
            className={({ isActive }) => `sidebar-nav-item${isActive ? ' active' : ''}`}
            onClick={closeMobileMenu}
          >
            {Icons.overdue}
            <span>Overdue</span>
          </NavLink>
        ) : null}

        {role === 'Manager' ? (
          <NavLink
            to="/reports"
            className={({ isActive }) => `sidebar-nav-item${isActive ? ' active' : ''}`}
            onClick={closeMobileMenu}
          >
            {Icons.reports}
            <span>Reports</span>
          </NavLink>
        ) : null}

        {(role === 'Manager' || role === 'Admin') ? (
          <NavLink
            to="/admin/csat"
            className={({ isActive }) => `sidebar-nav-item${isActive ? ' active' : ''}`}
            onClick={closeMobileMenu}
          >
            {Icons.csat}
            <span>CSAT</span>
          </NavLink>
        ) : null}

        <NavLink
          to="/messages"
          className={({ isActive }) => `sidebar-nav-item${isActive ? ' active' : ''}`}
          onClick={closeMobileMenu}
          style={{ position: 'relative' }}
        >
          {Icons.messages}
          <span>Messages</span>
          {unreadMessagesCount > 0 && (
            <span
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: '#EF4444',
                color: '#fff',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: '700',
              }}
            >
              {unreadMessagesCount > 99 ? '99+' : unreadMessagesCount}
            </span>
          )}
        </NavLink>

        <NavLink
          to="/notifications"
          className={({ isActive }) => `sidebar-nav-item${isActive ? ' active' : ''}`}
          onClick={closeMobileMenu}
          style={{ position: 'relative' }}
        >
          {Icons.notifications}
          <span>Notifications</span>
          {unreadCount > 0 && (
            <span
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: '#EF4444',
                color: '#fff',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: '700',
              }}
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </NavLink>

        <NavLink
          to="/settings"
          className={({ isActive }) => `sidebar-nav-item${isActive ? ' active' : ''}`}
          onClick={closeMobileMenu}
        >
          {Icons.settings}
          <span>Settings</span>
        </NavLink>
      </nav>

      {/* ── SPACER to push logout to bottom ── */}
      <div style={{flex: '1'}} />

      {/* ── LOGOUT pinned to bottom ── */}
      <div className="sidebar-bottom">
        <button className="sidebar-logout-btn" onClick={handleLogout}>
          {Icons.logout}
          <span>Logout</span>
        </button>
      </div>
    </div>
    </>
  );
}
