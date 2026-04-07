import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import useAuth from './hooks/useAuth';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import './styles/main.css';
import './styles/portal.css';
import './styles/admin.css';

// Pages
import Login from './pages/Login';

// Manager/Engineer Pages
import Dashboard from './pages/manager/Dashboard';
import TicketList from './pages/manager/TicketList.jsx';
import CreateTicket from './pages/manager/CreateTicket';
import TicketDetail from './pages/manager/TicketDetail.jsx';
import TicketActivityLog from './pages/manager/TicketActivityLog';
import Overdue from './pages/manager/Overdue';
import Reports from './pages/manager/Reports';
import Notifications from './pages/manager/Notifications';
import Messages from './pages/manager/Messages.jsx';
import Settings from './pages/manager/Settings';

// Client Pages
import ClientNotifications from './pages/client/ClientNotifications';
import PortalLayout from './pages/client/PortalLayout';
import PortalDashboard from './pages/client/PortalDashboard';
import PortalTickets from './pages/client/PortalTickets';
import PortalTicketDetail from './pages/client/PortalTicketDetail';
import PortalNewTicket from './pages/client/PortalNewTicket';
import PortalReports from './pages/client/PortalReports';
import PortalProfile from './pages/client/PortalProfile';
import PortalActivity from './pages/client/PortalActivity';

// Admin Pages
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminCompanies from './pages/admin/AdminCompanies';
import AdminUsers from './pages/admin/AdminUsers';
import AdminCreateUser from './pages/admin/AdminCreateUser';
import AdminCreateCompany from './pages/admin/AdminCreateCompany';
import AdminCompanyDetail from './pages/admin/AdminCompanyDetail';
import AdminEditCompany from './pages/admin/AdminEditCompany';
import AdminUserDetail from './pages/admin/AdminUserDetail';
import AdminEditUser from './pages/admin/AdminEditUser';
import AdminTickets from './pages/admin/AdminTickets';
import AdminSLA from './pages/admin/AdminSLA';
import AdminAuditLogs from './pages/admin/AdminAuditLogs';
import AdminReports from './pages/admin/AdminReports';
import AdminProducts from './pages/admin/AdminProducts';
import CSATDashboard from './pages/admin/CSAT';

function RoleHomeRedirect() {
  const { user } = useAuth();

  if (user?.role === 'Admin') return <Navigate to="/admin" replace />;
  if (user?.role === 'Client') return <Navigate to="/client" replace />;
  return <Navigate to="/dashboard" replace />;
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />

          {/* Admin Portal - separate, no main sidebar */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRoles={['Admin']}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="tickets" element={<AdminTickets />} />
            <Route path="tickets/:id" element={<TicketDetail />} />
            <Route path="tickets/:id/activity" element={<TicketActivityLog />} />
            <Route path="companies" element={<AdminCompanies />} />
            <Route path="companies/new" element={<AdminCreateCompany />} />
            <Route path="companies/:id" element={<AdminCompanyDetail />} />
            <Route path="companies/:id/edit" element={<AdminEditCompany />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="users/new" element={<AdminCreateUser />} />
            <Route path="users/:id" element={<AdminUserDetail />} />
            <Route path="users/:id/edit" element={<AdminEditUser />} />
            <Route path="sla" element={<AdminSLA />} />
            <Route path="audit-logs" element={<AdminAuditLogs />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="csat" element={<CSATDashboard />} />
            <Route path="messages" element={<Messages />} />
            <Route path="notifications" element={<Notifications />} />
          </Route>

          {/* Client Portal - separate simple UI with nested routes */}
          <Route
            path="/client"
            element={
              <ProtectedRoute requiredRoles={['Client']}>
                <PortalLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<PortalDashboard />} />
            <Route path="tickets" element={<PortalTickets />} />
            <Route path="tickets/:id" element={<PortalTicketDetail />} />
            <Route path="tickets/new" element={<PortalNewTicket />} />
            <Route path="reports" element={<PortalReports />} />
            <Route path="activity" element={<PortalActivity />} />
            <Route path="profile" element={<PortalProfile />} />
            <Route path="messages" element={<Messages />} />
            <Route path="notifications" element={<ClientNotifications />} />
          </Route>

          {/* Protected Routes - Main app (Manager + Engineer) */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <RoleHomeRedirect />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/tickets"
            element={
              <ProtectedRoute requiredRoles={['Client', 'Engineer', 'Manager']}>
                <Layout>
                  <TicketList />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/tickets/create"
            element={
              <ProtectedRoute requiredRoles={['Client', 'Engineer']}>
                <Layout>
                  <CreateTicket />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/tickets/:id"
            element={
              <ProtectedRoute requiredRoles={['Client', 'Engineer', 'Manager']}>
                <Layout>
                  <TicketDetail />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/tickets/:id/activity"
            element={
              <ProtectedRoute requiredRoles={['Client', 'Engineer', 'Manager']}>
                <Layout>
                  <TicketActivityLog />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/overdue"
            element={
              <ProtectedRoute requiredRoles={['Manager']}>
                <Layout>
                  <Overdue />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/reports"
            element={
              <ProtectedRoute requiredRoles={['Manager']}>
                <Layout>
                  <Reports />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <Layout>
                  <Notifications />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/messages"
            element={
              <ProtectedRoute>
                <Layout>
                  <Messages />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute requiredRoles={['Client', 'Engineer', 'Manager']}>
                <Layout>
                  <Settings />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={<Navigate to="/settings" replace />}
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
