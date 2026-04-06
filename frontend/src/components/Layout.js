import React, { useState } from 'react';
import useAuth from '../hooks/useAuth';
import Sidebar from './Sidebar';
import '../styles/main.css';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="main-layout">
      <button
        type="button"
        className="mobile-nav-toggle"
        onClick={() => setMobileOpen((prev) => !prev)}
        aria-label="Toggle navigation"
      >
        ☰
      </button>

      <Sidebar
        user={user}
        onLogout={logout}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Main Content */}
      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

export default Layout;
