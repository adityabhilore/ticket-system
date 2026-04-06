/**
 * Role-Based Access Control Configuration
 * Defines permissions and navigation for each role
 */

const ROLE_CONFIG = {
  Admin: {
    displayName: 'Administrator',
    color: '#8B5CF6',
    permissions: [
      'view_all_tickets',
      'edit_all_tickets',
      'delete_tickets',
      'assign_tickets',
      'view_reports',
      'manage_users',
      'view_audit_logs',
      'manage_companies',
      'manage_products',
      'system_settings',
    ],
    navigation: [
      { label: 'Dashboard', path: '/admin/dashboard', icon: 'dashboard' },
      { label: 'Tickets', path: '/tickets', icon: 'tickets' },
      { label: 'Users', path: '/admin/users', icon: 'users' },
      { label: 'Companies', path: '/admin/companies', icon: 'companies' },
      { label: 'Products', path: '/admin/products', icon: 'products' },
      { label: 'Reports', path: '/reports', icon: 'reports' },
      { label: 'Audit Logs', path: '/admin/audit-logs', icon: 'audit' },
    ],
  },

  Manager: {
    displayName: 'Manager',
    color: '#06B6D4',
    permissions: [
      'view_team_tickets',
      'edit_team_tickets',
      'assign_tickets',
      'view_reports',
      'manage_team',
    ],
    navigation: [
      { label: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
      { label: 'Tickets', path: '/tickets', icon: 'tickets' },
      { label: 'Team', path: '/team', icon: 'team' },
      { label: 'Reports', path: '/reports', icon: 'reports' },
    ],
  },

  Engineer: {
    displayName: 'Support Engineer',
    color: '#3B82F6',
    permissions: [
      'view_assigned_tickets',
      'update_assigned_tickets',
      'add_comments',
      'view_own_stats',
    ],
    navigation: [
      { label: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
      { label: 'My Tickets', path: '/tickets?status=assigned', icon: 'tickets' },
      { label: 'Messages', path: '/messages', icon: 'messages' },
      { label: 'Notifications', path: '/notifications', icon: 'notifications' },
    ],
  },

  Client: {
    displayName: 'Client',
    color: '#10B981',
    permissions: [
      'view_own_tickets',
      'create_tickets',
      'add_comments',
      'rate_ticket',
    ],
    navigation: [
      { label: 'Dashboard', path: '/dashboard', icon: 'dashboard' },
      { label: 'My Tickets', path: '/tickets', icon: 'tickets' },
      { label: 'Messages', path: '/messages', icon: 'messages' },
      { label: 'Create Ticket', path: '/create-ticket', icon: 'create' },
    ],
  },
};

// Check if user has permission
const hasPermission = (role, permission) => {
  const roleConfig = ROLE_CONFIG[role];
  return roleConfig && roleConfig.permissions.includes(permission);
};

// Get role display name
const getRoleDisplayName = (role) => {
  return ROLE_CONFIG[role]?.displayName || role;
};

// Get role color
const getRoleColor = (role) => {
  return ROLE_CONFIG[role]?.color || '#6B7280';
};

// Get role navigation
const getRoleNavigation = (role) => {
  return ROLE_CONFIG[role]?.navigation || [];
};

module.exports = {
  ROLE_CONFIG,
  hasPermission,
  getRoleDisplayName,
  getRoleColor,
  getRoleNavigation,
};
