import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import useAuth from '../../hooks/useAuth';
import reportService from '../../services/reportService';
import ticketService from '../../services/ticketService';
import { showError } from '../../utils/helpers';
import '../../styles/main.css';

const STATUS_COLORS = {
  Open: '#EF4444',
  'In Progress': '#F59E0B',
  'On Hold': '#EAB308',
  Resolved: '#10B981',
  Reopened: '#F59E0B',
  Closed: '#6B7280',
};

const PRIORITY_COLORS = {
  Critical: '#DC2626',
  High: '#F59E0B',
  Medium: '#3B82F6',
  Low: '#10B981',
};

const PIE_COLORS = ['#EF4444', '#F59E0B', '#10B981', '#6B7280', '#8B5CF6'];

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [ticketTrend, setTicketTrend] = useState([]);
  const [byStatus, setByStatus] = useState([]);
  const [byPriority, setByPriority] = useState([]);
  const [recentTickets, setRecentTickets] = useState([]);
  const [engineerStats, setEngineerStats] = useState([]);
  const [engineerTickets, setEngineerTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const dashboardData = await reportService.getDashboard();
      setStats(dashboardData);

      if (user?.role === 'Engineer') {
        const ownTickets = await ticketService.getTickets().catch(() => []);
        setEngineerTickets(Array.isArray(ownTickets) ? ownTickets : []);
      }

      // Fetch additional data for Manager view
      if (user?.role === 'Manager') {
        const [trend, status, priority, recent, engineers] = await Promise.all([
          reportService.getTicketTrend().catch(() => []),
          reportService.getByStatus().catch(() => []),
          reportService.getByPriority().catch(() => []),
          reportService.getRecentTickets().catch(() => []),
          reportService.getEngineerStats().catch(() => []),
        ]);
        setTicketTrend(trend || []);
        setByStatus(status || []);
        setByPriority(priority || []);
        setRecentTickets(recent || []);
        setEngineerStats(engineers || []);
      }
    } catch (err) {
      setError(showError(err));
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatDateTime = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Calculate totals for Manager view
  const getTotalOverdue = () => {
    if (!Array.isArray(stats)) return 0;
    return stats.reduce((sum, c) => sum + (parseInt(c.OverdueTickets) || 0), 0);
  };

  const getTotalTickets = () => {
    if (!Array.isArray(stats)) return 0;
    return stats.reduce((sum, c) => sum + (parseInt(c.TotalTickets) || 0), 0);
  };

  const getTotalClosed = () => {
    if (!Array.isArray(stats)) return 0;
    return stats.reduce((sum, c) => sum + (parseInt(c.ClosedTickets) || 0), 0);
  };

  const getTicketDate = (ticket, field) => {
    const value = ticket?.[field];
    return value ? new Date(value) : null;
  };

  const getTicketStatus = (ticket) => ticket?.StatusName || ticket?.status || '';
  const isResolvedTicket = (ticket) => ['Resolved', 'Closed'].includes(getTicketStatus(ticket));
  const isActiveTicket = (ticket) => ['Open', 'In Progress'].includes(getTicketStatus(ticket));

  const engineerResolvedTickets = engineerTickets.filter(isResolvedTicket);
  const engineerActiveTickets = engineerTickets.filter(isActiveTicket);

  const isTicketOverdueFlag = (ticket) => {
    const value = ticket?.IsOverdue;
    const isOverdue = value === true || value === 1 || String(value).toLowerCase() === 'true';
    return isOverdue;
  };

  const engineerCompletedTickets = engineerResolvedTickets.length;
  const engineerCompletedOnTime = engineerResolvedTickets.filter((ticket) => !isTicketOverdueFlag(ticket)).length;
  const engineerSlaPercentage = engineerCompletedTickets > 0
    ? ((engineerCompletedOnTime / engineerCompletedTickets) * 100)
    : 0;

  const displaySlaPercentage = user?.role === 'Engineer'
    ? engineerSlaPercentage
    : (parseFloat(stats?.slaReport?.SLAPercentage) || 0);

  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const resolvedThisWeek = engineerResolvedTickets.filter((ticket) => {
    const updatedAt = getTicketDate(ticket, 'UpdatedAt');
    return updatedAt && updatedAt >= weekAgo;
  }).length;

  const resolvedThisMonth = engineerResolvedTickets.filter((ticket) => {
    const updatedAt = getTicketDate(ticket, 'UpdatedAt');
    return updatedAt && updatedAt >= monthStart;
  }).length;

  const resolutionHours = engineerResolvedTickets
    .map((ticket) => {
      const createdAt = getTicketDate(ticket, 'CreatedAt');
      const updatedAt = getTicketDate(ticket, 'UpdatedAt');
      if (!createdAt || !updatedAt) return null;
      const diff = (updatedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
      return diff > 0 ? diff : null;
    })
    .filter((value) => value !== null);

  const averageResolutionHours = resolutionHours.length
    ? (resolutionHours.reduce((sum, value) => sum + value, 0) / resolutionHours.length)
    : 0;

  const firstActionHoursList = engineerTickets
    .map((ticket) => {
      const createdAt = getTicketDate(ticket, 'CreatedAt');
      const updatedAt = getTicketDate(ticket, 'UpdatedAt');
      if (!createdAt || !updatedAt) return null;
      const diff = (updatedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
      return diff > 0 ? diff : null;
    })
    .filter((value) => value !== null);

  const averageFirstActionHours = firstActionHoursList.length
    ? (firstActionHoursList.reduce((sum, value) => sum + value, 0) / firstActionHoursList.length)
    : 0;

  const priorityOrder = ['Critical', 'High', 'Medium', 'Low'];
  const priorityHeatmapData = priorityOrder.map((priority) => {
    const count = engineerActiveTickets.filter((ticket) => (ticket?.PriorityName || '') === priority).length;
    const total = engineerActiveTickets.length || 1;
    const percentage = Math.round((count / total) * 100);
    return { priority, count, percentage };
  });

  const totalActiveHours = engineerActiveTickets.reduce((sum, ticket) => {
    const createdAt = getTicketDate(ticket, 'CreatedAt');
    if (!createdAt) return sum;
    const diff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    return sum + (diff > 0 ? diff : 0);
  }, 0);

  const slaUsagePercentages = engineerActiveTickets
    .map((ticket) => {
      const createdAt = getTicketDate(ticket, 'CreatedAt');
      const slaDeadline = getTicketDate(ticket, 'SLADeadline');
      if (!createdAt || !slaDeadline) return null;
      const totalWindow = slaDeadline.getTime() - createdAt.getTime();
      if (totalWindow <= 0) return null;
      const used = now.getTime() - createdAt.getTime();
      return Math.max(0, Math.min(200, (used / totalWindow) * 100));
    })
    .filter((value) => value !== null);

  const averageSlaUsage = slaUsagePercentages.length
    ? (slaUsagePercentages.reduce((sum, value) => sum + value, 0) / slaUsagePercentages.length)
    : 0;

  const nearestDeadlineTicket = engineerActiveTickets
    .filter((ticket) => getTicketDate(ticket, 'SLADeadline'))
    .sort((a, b) => getTicketDate(a, 'SLADeadline') - getTicketDate(b, 'SLADeadline'))[0];

  if (loading) {
    return <div className="spinner">Loading...</div>;
  }

  return (
      <div style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
        {/* Page Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-welcome">Welcome back, {user?.name}!</p>
          </div>
        </div>

        <div className="page-content-wrapper">
          {error && (
            <div className="alert alert-danger">
              {error}
            </div>
          )}
      {/* Non-Manager View */}
      {stats && user?.role !== 'Manager' && (
        <>
          <div className="stat-cards-row">
            <div className="stat-card total">
              <div className="stat-card-label">Total Tickets</div>
              <div className="stat-card-value">
                {user?.role === 'Engineer'
                  ? engineerTickets.length
                  : (parseInt(stats?.ticketStats?.TotalTickets) || 0)}
              </div>
              <div className="stat-card-sub">All time</div>
            </div>
            <div className="stat-card open">
              <div className="stat-card-label">Open Tickets</div>
              <div className="stat-card-value">
                {user?.role === 'Engineer'
                  ? engineerTickets.filter((ticket) => ['Open', 'In Progress'].includes(ticket?.StatusName || '')).length
                  : (parseInt(stats?.ticketStats?.OpenTickets) || 0)}
              </div>
              <div className="stat-card-sub">In progress</div>
            </div>
            <div className="stat-card overdue">
              <div className="stat-card-label">Overdue</div>
              <div className="stat-card-value">
                {user?.role === 'Engineer'
                  ? engineerTickets.filter((ticket) => Boolean(ticket?.IsOverdue)).length
                  : (parseInt(stats?.ticketStats?.OverdueTickets) || 0)}
              </div>
              <div className="stat-card-sub">SLA breached</div>
            </div>
            <div className="stat-card closed">
              <div className="stat-card-label">Closed Tickets</div>
              <div className="stat-card-value">
                {user?.role === 'Engineer'
                  ? engineerTickets.filter((ticket) => ['Resolved', 'Closed'].includes(ticket?.StatusName || '')).length
                  : (parseInt(stats?.ticketStats?.ClosedTickets) || 0)}
              </div>
              <div className="stat-card-sub">Completed</div>
            </div>
            <div className="stat-card ontime">
              <div className="stat-card-label">Resolved On Time</div>
              <div className="stat-card-value">
                {user?.role === 'Engineer'
                  ? engineerCompletedOnTime
                  : (parseInt(stats?.slaReport?.CompletedOnTime) || 0)}
              </div>
              <div className="stat-card-sub">SLA met</div>
            </div>
          </div>

          {/* SLA Compliance Card */}
          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">SLA Compliance</h2>
                <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '13px' }}>Overall ticket resolution performance</p>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
              <div style={{ paddingRight: '16px', borderRight: '1px solid var(--border)' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Compliance Rate</div>
                <div style={{ fontSize: '40px', fontWeight: '700', color: 'var(--success)' }}>
                  {displaySlaPercentage.toFixed(1)}%
                </div>
              </div>
              <div style={{ paddingRight: '16px', borderRight: '1px solid var(--border)' }}>
                <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Avg Resolution Time</div>
                <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--text-primary)' }}>
                  {user?.role === 'Engineer' ? averageResolutionHours.toFixed(1) : '—'}h
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  hours to complete
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Avg First Response</div>
                <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--info)' }}>
                  {user?.role === 'Engineer' ? averageFirstActionHours.toFixed(1) : '—'}h
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  time to respond
                </div>
              </div>
            </div>
          </div>

          {user?.role === 'Engineer' && (
            <>
              <div className="dashboard-charts-row">
                <div className="card chart-card">
                  <div className="card-header">
                    <div>
                      <h2 className="card-title">Performance Analytics</h2>
                      <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '13px' }}>Resolution trends over time</p>
                    </div>
                  </div>
                  <div style={{ height: '220px', marginTop: '16px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { name: '7 Days', value: resolvedThisWeek, fill: '#4F46E5' },
                          { name: 'This Month', value: resolvedThisMonth, fill: '#10B981' },
                        ]}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip 
                          contentStyle={{ background: 'transparent', border: 'none' }}
                          cursor={false}
                        />
                        <Bar dataKey="value" fill="#4F46E5" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '16px' }}>
                    <div style={{ padding: '12px', background: 'var(--primary-light)', borderRadius: '8px' }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>7 Days Resolved</div>
                      <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--primary)', marginTop: '4px' }}>{resolvedThisWeek}</div>
                    </div>
                    <div style={{ padding: '12px', background: '#ECFDF5', borderRadius: '8px' }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>This Month</div>
                      <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--success)', marginTop: '4px' }}>{resolvedThisMonth}</div>
                    </div>
                  </div>
                </div>

                <div className="card chart-card">
                  <div className="card-header">
                    <div>
                      <h2 className="card-title">Priority Heatmap</h2>
                      <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '13px' }}>Active tickets by severity</p>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px' }}>
                    {priorityHeatmapData.map((item) => {
                      const heatOpacity = Math.max(0.12, Math.min(0.92, item.percentage / 100));
                      const tileColor = PRIORITY_COLORS[item.priority] || '#4F46E5';
                      return (
                        <div
                          key={item.priority}
                          style={{
                            borderRadius: '10px',
                            border: `1px solid ${tileColor}55`,
                            background: `${tileColor}${Math.round(heatOpacity * 255).toString(16).padStart(2, '0')}`,
                            padding: '12px',
                            minHeight: '86px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div style={{ fontSize: '12px', fontWeight: 700, color: '#111827' }}>{item.priority}</div>
                          <div style={{ fontSize: '24px', fontWeight: 800, lineHeight: 1, color: '#111827' }}>{item.count}</div>
                          <div style={{ fontSize: '11px', color: '#1F2937' }}>Heat: {item.percentage}%</div>
                        </div>
                      );
                    })}
                    <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                      <span>Low intensity</span>
                      <span>High intensity</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <div>
                    <h2 className="card-title">Time Tracking & Effort</h2>
                    <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '13px' }}>Live effort and SLA consumption</p>
                  </div>
                  <button className="quick-action-btn" onClick={() => navigate('/tickets')} style={{ padding: '8px 12px' }}>
                    View My Queue
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '14px' }}>
                  <div style={{ padding: '16px', background: '#ECFDF5', borderRadius: '12px', border: '1px solid #D1FAE5' }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Workload</div>
                    <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--success)', marginTop: '8px' }}>{totalActiveHours.toFixed(1)}h</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>Total age of active tickets</div>
                  </div>
                  <div style={{ padding: '16px', background: averageSlaUsage > 100 ? '#FEE2E2' : '#FEF3C7', borderRadius: '12px', border: averageSlaUsage > 100 ? '1px solid #FECACA' : '1px solid #FDE68A' }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Avg SLA Usage</div>
                    <div style={{ fontSize: '32px', fontWeight: '700', color: averageSlaUsage > 100 ? '#DC2626' : '#D97706', marginTop: '8px' }}>{averageSlaUsage.toFixed(0)}%</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                      {averageSlaUsage > 100 ? '⚠️ Over limit!' : 'On track'}
                    </div>
                  </div>
                  <div style={{ padding: '16px', background: '#EEF2FF', borderRadius: '12px', border: '1px solid #E0E7FF' }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Next Deadline</div>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--primary)', marginTop: '8px' }}>
                      {nearestDeadlineTicket ? `#${nearestDeadlineTicket.TicketID || nearestDeadlineTicket.TicketId}` : '—'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                      {nearestDeadlineTicket ? formatDateTime(nearestDeadlineTicket.SLADeadline) : 'No active SLA'}
                    </div>
                  </div>
                </div>
              </div>

              {/* NEW FEATURE: Top Overdue Tickets */}
              <div className="card">
                <div className="card-header">
                  <div>
                    <h2 className="card-title">Overdue Tickets</h2>
                    <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '13px' }}>Most overdue items</p>
                  </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid var(--border)' }}>
                        <th style={{ textAlign: 'left', padding: '12px', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Ticket</th>
                        <th style={{ textAlign: 'left', padding: '12px', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Priority</th>
                        <th style={{ textAlign: 'left', padding: '12px', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Overdue By</th>
                        <th style={{ textAlign: 'left', padding: '12px', fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {engineerTickets
                        .filter(t => Boolean(t?.IsOverdue) && ['Open', 'In Progress'].includes(t?.StatusName))
                        .sort((a, b) => new Date(b.SLADeadline) - new Date(a.SLADeadline))
                        .slice(0, 5)
                        .map((ticket) => {
                          const overdueHours = ((new Date() - new Date(ticket.SLADeadline)) / (1000 * 60 * 60)).toFixed(1);
                          return (
                            <tr key={ticket.TicketID} style={{ borderBottom: '1px solid var(--border)' }}>
                              <td style={{ padding: '12px', fontSize: '13px', fontWeight: '600', color: 'var(--primary)' }}>#{ticket.TicketID}</td>
                              <td style={{ padding: '12px', fontSize: '12px' }}>
                                <span style={{ 
                                  padding: '4px 8px', 
                                  borderRadius: '4px',
                                  background: ticket.PriorityName === 'Critical' ? '#FEE2E2' : ticket.PriorityName === 'High' ? '#FEF3C7' : '#EEF2FF',
                                  color: ticket.PriorityName === 'Critical' ? '#DC2626' : ticket.PriorityName === 'High' ? '#D97706' : '#3B82F6',
                                  fontWeight: '600',
                                  fontSize: '11px'
                                }}>
                                  {ticket.PriorityName}
                                </span>
                              </td>
                              <td style={{ padding: '12px', fontSize: '13px', fontWeight: '600', color: '#DC2626' }}>{overdueHours}h</td>
                              <td style={{ padding: '12px' }}>
                                <button 
                                  onClick={() => navigate(`/tickets/${ticket.TicketID}`)}
                                  style={{
                                    padding: '6px 12px',
                                    background: 'var(--primary)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    fontWeight: '600'
                                  }}
                                >
                                  Open
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                  {engineerTickets.filter(t => Boolean(t?.IsOverdue) && ['Open', 'In Progress'].includes(t?.StatusName)).length === 0 && (
                    <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      ✅ No overdue tickets! Great work!
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Manager View - Enhanced Dashboard */}
      {stats && user?.role === 'Manager' && (
        <>
          {/* Overdue Alert Banner */}
          {getTotalOverdue() > 0 && (
            <div className="overdue-banner">
              <div className="overdue-banner-icon">⚠️</div>
              <div className="overdue-banner-text">
                <strong>{getTotalOverdue()} ticket{getTotalOverdue() > 1 ? 's have' : ' has'} breached SLA</strong>
                <span>Immediate attention required</span>
              </div>
              <button className="overdue-banner-btn" onClick={() => navigate('/overdue')}>
                View Overdue Tickets →
              </button>
            </div>
          )}

          {/* Stat Cards Row */}
          <div className="stat-cards-row">
            <div className="stat-card total">
              <div className="stat-card-label">Total Companies</div>
              <div className="stat-card-value">{Array.isArray(stats) ? stats.length : 0}</div>
              <div className="stat-card-sub">Active</div>
            </div>
            <div className="stat-card open">
              <div className="stat-card-label">Total Tickets</div>
              <div className="stat-card-value">{getTotalTickets()}</div>
              <div className="stat-card-sub">Across all companies</div>
            </div>
            <div className="stat-card overdue">
              <div className="stat-card-label">Overdue Tickets</div>
              <div className="stat-card-value">{getTotalOverdue()}</div>
              <div className="stat-card-sub">SLA breached</div>
            </div>
            <div className="stat-card closed">
              <div className="stat-card-label">Closed Tickets</div>
              <div className="stat-card-value">{getTotalClosed()}</div>
              <div className="stat-card-sub">Completed</div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="dashboard-charts-row">
            {/* Ticket Trend Chart */}
            <div className="card chart-card">
              <div className="card-header">
                <div>
                  <h2 className="card-title">Ticket Trend</h2>
                  <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '13px' }}>Last 7 days</p>
                </div>
              </div>
              <div className="chart-container">
                {ticketTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={ticketTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={formatDate}
                        tick={{ fontSize: 12, fill: '#6B7280' }}
                        axisLine={{ stroke: '#E5E7EB' }}
                      />
                      <YAxis
                        tick={{ fontSize: 12, fill: '#6B7280' }}
                        axisLine={{ stroke: '#E5E7EB' }}
                      />
                      <Tooltip
                        labelFormatter={formatDate}
                        contentStyle={{
                          background: '#fff',
                          border: '1px solid #E5E7EB',
                          borderRadius: '8px',
                          fontSize: '13px',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="created"
                        stroke="#4F46E5"
                        strokeWidth={2}
                        dot={{ fill: '#4F46E5', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="chart-empty">No trend data available</div>
                )}
              </div>
            </div>

            {/* Status Donut Chart */}
            <div className="card chart-card">
              <div className="card-header">
                <div>
                  <h2 className="card-title">Tickets by Status</h2>
                  <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '13px' }}>Current distribution</p>
                </div>
              </div>
              <div className="chart-container">
                {byStatus.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'space-between' }}>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie
                          data={byStatus}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={75}
                          paddingAngle={2}
                          dataKey="count"
                          nameKey="status"
                        >
                          {byStatus.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={STATUS_COLORS[entry.status] || PIE_COLORS[index % PIE_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            background: '#fff',
                            border: '1px solid #E5E7EB',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                          formatter={(value, name, props) => [
                            value,
                            `${props.payload.status}: ${((value / byStatus.reduce((sum, item) => sum + item.count, 0)) * 100).toFixed(0)}%`
                          ]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    {/* Compact Legend - 2 Columns */}
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gap: '6px',
                      width: '100%',
                      marginTop: '8px'
                    }}>
                      {byStatus.map((entry, index) => {
                        const total = byStatus.reduce((sum, item) => sum + item.count, 0);
                        const percent = total > 0 ? ((entry.count / total) * 100).toFixed(0) : 0;
                        return (
                          <div key={`legend-${index}`} style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '4px',
                            padding: '4px',
                            fontSize: '10px'
                          }}>
                            <div style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '2px',
                              background: STATUS_COLORS[entry.status] || PIE_COLORS[index % PIE_COLORS.length],
                              flexShrink: 0
                            }}/>
                            <div>
                              <span style={{ fontWeight: '600', color: '#1F2937' }}>{entry.status}</span>
                              <span style={{ color: '#6B7280', marginLeft: '2px' }}>({percent}%)</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="chart-empty">No status data available</div>
                )}
              </div>
            </div>
          </div>

          {/* Second Row - Priority Chart & Engineers */}
          <div className="dashboard-charts-row">
            {/* Priority Bar Chart */}
            <div className="card chart-card">
              <div className="card-header">
                <div>
                  <h2 className="card-title">Tickets by Priority</h2>
                  <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '13px' }}>Active tickets only</p>
                </div>
              </div>
              <div className="chart-container">
                {byPriority.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={byPriority} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 12, fill: '#6B7280' }}
                        axisLine={{ stroke: '#E5E7EB' }}
                      />
                      <YAxis
                        type="category"
                        dataKey="priority"
                        tick={{ fontSize: 12, fill: '#6B7280' }}
                        axisLine={{ stroke: '#E5E7EB' }}
                        width={80}
                      />
                      <Tooltip
                        contentStyle={{
                          background: '#fff',
                          border: '1px solid #E5E7EB',
                          borderRadius: '8px',
                          fontSize: '13px',
                        }}
                      />
                      <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                        {byPriority.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={PRIORITY_COLORS[entry.priority] || '#4F46E5'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="chart-empty">No priority data available</div>
                )}
              </div>
            </div>

            {/* Top Engineers Table */}
            <div className="card chart-card">
              <div className="card-header">
                <div>
                  <h2 className="card-title">Top Engineers</h2>
                  <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '13px' }}>By resolved tickets</p>
                </div>
              </div>
              <div className="engineer-table">
                {engineerStats.length > 0 ? (
                  <table>
                    <thead>
                      <tr>
                        <th>Engineer</th>
                        <th>Assigned</th>
                        <th>Resolved</th>
                      </tr>
                    </thead>
                    <tbody>
                      {engineerStats.map((eng, idx) => (
                        <tr key={eng.UserID || idx}>
                          <td className="engineer-name">
                            <span className="engineer-rank">{idx + 1}</span>
                            {eng.Name}
                          </td>
                          <td>{parseInt(eng.assigned) || 0}</td>
                          <td>
                            <span className="badge badge-success">{parseInt(eng.resolved) || 0}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="chart-empty">No engineer data available</div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Row - Recent Tickets & Company SLA */}
          <div className="dashboard-charts-row">
            {/* Recent Tickets Feed */}
            <div className="card chart-card">
              <div className="card-header">
                <div>
                  <h2 className="card-title">Recent Tickets</h2>
                  <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '13px' }}>Last 5 created</p>
                </div>
              </div>
              <div className="recent-tickets-list">
                {recentTickets.length > 0 ? (
                  recentTickets.map((ticket) => (
                    <div
                      key={ticket.TicketID}
                      className="recent-ticket-item"
                      onClick={() => navigate(`/tickets/${ticket.TicketID}`)}
                    >
                      <div className="recent-ticket-header">
                        <span className="recent-ticket-id">#{ticket.TicketID}</span>
                        <span className={`badge badge-${ticket.StatusName?.toLowerCase().replace(' ', '-') || 'neutral'}`}>
                          {ticket.StatusName}
                        </span>
                      </div>
                      <div className="recent-ticket-title">{ticket.Title}</div>
                      <div className="recent-ticket-meta">
                        <span>{ticket.CompanyName}</span>
                        <span>•</span>
                        <span>{formatDateTime(ticket.CreatedAt)}</span>
                        {ticket.IsOverdue && ['Open', 'In Progress'].includes(ticket?.StatusName) ? (
                          <span className="badge badge-danger" style={{ marginLeft: '8px', padding: '2px 6px', fontSize: '10px' }}>OVERDUE</span>
                        ) : null}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="chart-empty">No recent tickets</div>
                )}
              </div>
            </div>

            {/* Company SLA Health */}
            <div className="card chart-card">
              <div className="card-header">
                <div>
                  <h2 className="card-title">Company SLA Health</h2>
                  <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '13px' }}>Overdue tickets per company</p>
                </div>
              </div>
              <div className="sla-health-list">
                {Array.isArray(stats) && stats.length > 0 ? (
                  stats.slice(0, 5).map((company) => {
                    const total = parseInt(company.TotalTickets) || 0;
                    const overdue = parseInt(company.OverdueTickets) || 0;
                    const healthPercent = total > 0 ? Math.round(((total - overdue) / total) * 100) : 100;
                    const healthClass = healthPercent >= 90 ? 'healthy' : healthPercent >= 70 ? 'warning' : 'critical';
                    return (
                      <div key={company.CompanyID} className="sla-health-item">
                        <div className="sla-health-header">
                          <span className="sla-health-company">{company.Name}</span>
                          <span className={`sla-health-percent ${healthClass}`}>{healthPercent}%</span>
                        </div>
                        <div className="sla-health-bar">
                          <div
                            className={`sla-health-fill ${healthClass}`}
                            style={{ width: `${healthPercent}%` }}
                          />
                        </div>
                        <div className="sla-health-stats">
                          <span>{total} total</span>
                          <span>{overdue} overdue</span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="chart-empty">No company data available</div>
                )}
              </div>
            </div>
          </div>

          {/* Company Overview Table */}
          <div className="card">
            <div className="card-header">
              <div>
                <h2 className="card-title">Company Overview</h2>
                <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '13px' }}>Performance metrics for all companies</p>
              </div>
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Total Tickets</th>
                    <th>Open</th>
                    <th>Closed</th>
                    <th>Overdue</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(stats) && stats.map((company) => (
                    <tr key={company.CompanyID}>
                      <td className="company-name">{company.Name}</td>
                      <td>{parseInt(company.TotalTickets) || 0}</td>
                      <td>
                        <span className="badge badge-in-progress">{parseInt(company.OpenTickets) || 0}</span>
                      </td>
                      <td>
                        <span className="badge badge-closed">{parseInt(company.ClosedTickets) || 0}</span>
                      </td>
                      <td>
                        {(parseInt(company.OverdueTickets) || 0) > 0 ? (
                          <span className="badge badge-overdue">{parseInt(company.OverdueTickets)}</span>
                        ) : (
                          <span className="badge badge-closed">0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
        </div>
      </div>
    );
  };

  export default Dashboard;
