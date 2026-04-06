import React, { useEffect, useMemo, useState } from 'react';
import reportService from '../services/reportService';
import { showError } from '../utils/helpers';
import '../styles/main.css';

const Icon = {
  performance: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  team: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  tickets: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2z"/>
    </svg>
  ),
  engineers: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9"/>
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
    </svg>
  ),
  recent: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
};

const num = (value) => Number(value || 0);

const Reports = () => {
  const [performanceData, setPerformanceData] = useState([]);
  const [engineerStats, setEngineerStats] = useState([]);
  const [recentTickets, setRecentTickets] = useState([]);
  const [slaReport, setSlaReport] = useState(null);
  const [dashboardStats, setDashboardStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      setError('');

      const [perfReport, engineers, recent, sla, dashboard] = await Promise.all([
        reportService.getPerformanceReport().catch(() => []),
        reportService.getEngineerStats().catch(() => []),
        reportService.getRecentTickets().catch(() => []),
        reportService.getSLAReport().catch(() => null),
        reportService.getDashboard().catch(() => []),
      ]);

      setPerformanceData(Array.isArray(perfReport) ? perfReport : []);
      setEngineerStats(Array.isArray(engineers) ? engineers : []);
      setRecentTickets(Array.isArray(recent) ? recent : []);
      setSlaReport(sla);
      setDashboardStats(Array.isArray(dashboard) ? dashboard : []);
    } catch (err) {
      setError(showError(err));
    } finally {
      setLoading(false);
    }
  };

  const metrics = useMemo(() => {
    const perfAssigned = performanceData.reduce((sum, row) => sum + num(row.TotalAssigned), 0);
    const perfResolved = performanceData.reduce((sum, row) => sum + num(row.Closed), 0);
    const perfOverdue = performanceData.reduce((sum, row) => sum + num(row.Overdue), 0);

    const resolutionRate = perfAssigned > 0 ? Math.round((perfResolved / perfAssigned) * 100) : 0;
    const overdueRate = perfAssigned > 0 ? Math.round((perfOverdue / perfAssigned) * 100) : 0;

    const activeEngineers = engineerStats.filter((eng) => num(eng.assigned) > 0).length;
    const totalEngineerLoad = engineerStats.reduce((sum, eng) => sum + num(eng.assigned), 0);
    const avgEngineerLoad = activeEngineers > 0 ? (totalEngineerLoad / activeEngineers).toFixed(1) : '0.0';

    const topEngineer = [...engineerStats].sort((a, b) => num(b.resolved) - num(a.resolved))[0];

    const totalTickets = dashboardStats.reduce((sum, row) => sum + num(row.TotalTickets), 0);
    const breachedTickets = dashboardStats.reduce((sum, row) => sum + num(row.OverdueTickets), 0);
    const completedTickets = dashboardStats.reduce((sum, row) => sum + num(row.ClosedTickets), 0);

    return {
      resolutionRate,
      overdueRate,
      slaCompliance: num(slaReport?.SLAPercentage),
      activeEngineers,
      avgEngineerLoad,
      topEngineerName: topEngineer?.Name || '—',
      topEngineerResolved: num(topEngineer?.resolved),
      totalTickets,
      breachedTickets,
      completedTickets,
    };
  }, [performanceData, engineerStats, slaReport, dashboardStats]);

  if (loading) {
    return <div className="spinner">Loading reports...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports & Analytics</h1>
          <p className="page-welcome">Manager insights for performance, team, and ticket health</p>
        </div>
      </div>

      <div className="page-content-wrapper">
        {error && <div className="alert alert-danger">{error}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: '20px', marginBottom: '28px' }}>
          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1E293B', margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#4F46E5' }}>{Icon.performance}</span>
              Performance
            </h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #F1F5F9' }}>
              <span style={{ fontSize: '12px', color: '#6B7280' }}>Resolution Rate</span>
              <span style={{ fontSize: '18px', fontWeight: '700', color: '#4F46E5' }}>{metrics.resolutionRate}%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #F1F5F9' }}>
              <span style={{ fontSize: '12px', color: '#6B7280' }}>SLA Compliance</span>
              <span style={{ fontSize: '18px', fontWeight: '700', color: '#10B981' }}>{metrics.slaCompliance}%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: '#6B7280' }}>Overdue Rate</span>
              <span style={{ fontSize: '18px', fontWeight: '700', color: '#EF4444' }}>{metrics.overdueRate}%</span>
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1E293B', margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#06B6D4' }}>{Icon.team}</span>
              Team
            </h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #F1F5F9' }}>
              <span style={{ fontSize: '12px', color: '#6B7280' }}>Active Engineers</span>
              <span style={{ fontSize: '18px', fontWeight: '700', color: '#06B6D4' }}>{metrics.activeEngineers}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #F1F5F9' }}>
              <span style={{ fontSize: '12px', color: '#6B7280' }}>Avg Engineer Load</span>
              <span style={{ fontSize: '18px', fontWeight: '700', color: '#06B6D4' }}>{metrics.avgEngineerLoad}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: '#6B7280' }}>Top Performer</span>
              <span style={{ fontSize: '15px', fontWeight: '700', color: '#10B981' }}>{metrics.topEngineerName} ({metrics.topEngineerResolved})</span>
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1E293B', margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#374151' }}>{Icon.tickets}</span>
              Tickets
            </h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #F1F5F9' }}>
              <span style={{ fontSize: '12px', color: '#6B7280' }}>Total Tickets</span>
              <span style={{ fontSize: '18px', fontWeight: '700', color: '#374151' }}>{metrics.totalTickets}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #F1F5F9' }}>
              <span style={{ fontSize: '12px', color: '#6B7280' }}>Breached</span>
              <span style={{ fontSize: '18px', fontWeight: '700', color: '#EF4444' }}>{metrics.breachedTickets}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: '#6B7280' }}>Completed</span>
              <span style={{ fontSize: '18px', fontWeight: '700', color: '#10B981' }}>{metrics.completedTickets}</span>
            </div>
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', marginBottom: '28px' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#4F46E5' }}>{Icon.engineers}</span>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1E293B', margin: 0 }}>Top Engineers</h3>
          </div>

          {engineerStats.length > 0 ? (
            <>
              <div className="manager-desktop-table">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>Engineer</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>Assigned</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>Resolved</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {engineerStats.map((eng, idx) => {
                      const assigned = num(eng.assigned);
                      const resolved = num(eng.resolved);
                      const rate = assigned > 0 ? ((resolved / assigned) * 100).toFixed(0) : 0;
                      return (
                        <tr key={eng.UserID || idx} style={{ borderBottom: idx < engineerStats.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                          <td style={{ padding: '14px 16px', color: '#1E293B', fontWeight: '600' }}>
                            <span style={{ background: '#EEF2FF', color: '#4F46E5', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '700', marginRight: '10px' }}>#{idx + 1}</span>
                            {eng.Name}
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'center', color: '#374151', fontWeight: '600' }}>{assigned}</td>
                          <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                            <span style={{ background: '#D1FAE5', color: '#065F46', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '700' }}>{resolved}</span>
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'center', color: '#10B981', fontWeight: '700' }}>{rate}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="manager-mobile-cards">
                {engineerStats.map((eng, idx) => {
                  const assigned = num(eng.assigned);
                  const resolved = num(eng.resolved);
                  const rate = assigned > 0 ? ((resolved / assigned) * 100).toFixed(0) : 0;
                  return (
                    <div key={`eng-mobile-${eng.UserID || idx}`} className="manager-mobile-card">
                      <div style={{ fontWeight: 700, color: '#1E293B', marginBottom: 8 }}>#{idx + 1} {eng.Name}</div>
                      <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>Assigned: {assigned}</div>
                      <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>Resolved: {resolved}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#10B981' }}>Rate: {rate}%</div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div style={{ padding: '40px 24px', textAlign: 'center', color: '#9CA3AF', fontSize: '14px' }}>No engineer data available</div>
          )}
        </div>

        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#4F46E5' }}>{Icon.recent}</span>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#1E293B', margin: 0 }}>Recent 5 Tickets</h3>
          </div>

          {recentTickets.length > 0 ? (
            <>
              <div className="manager-desktop-table">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>#ID</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>Title</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>Priority</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>Status</th>
                      <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTickets.map((ticket, idx) => (
                      <tr key={ticket.TicketID || idx} style={{ borderBottom: idx < recentTickets.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                        <td style={{ padding: '12px 16px', color: '#4F46E5', fontWeight: '700' }}>#{ticket.TicketID}</td>
                        <td style={{ padding: '12px 16px', color: '#374151', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ticket.Title}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span style={{ background: '#F8FAFC', color: '#374151', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>{ticket.PriorityName}</span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span style={{ background: '#F8FAFC', color: '#374151', padding: '3px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: '700' }}>{ticket.StatusName}</span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', color: '#6B7280', fontSize: '12px' }}>
                          {new Date(ticket.CreatedAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="manager-mobile-cards">
                {recentTickets.map((ticket, idx) => (
                  <div key={`recent-mobile-${ticket.TicketID || idx}`} className="manager-mobile-card">
                    <div style={{ color: '#4F46E5', fontWeight: 700, marginBottom: 6 }}>#{ticket.TicketID}</div>
                    <div style={{ color: '#1E293B', fontWeight: 700, marginBottom: 6 }}>{ticket.Title}</div>
                    <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>Priority: {ticket.PriorityName}</div>
                    <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>Status: {ticket.StatusName}</div>
                    <div style={{ fontSize: 12, color: '#9CA3AF' }}>{new Date(ticket.CreatedAt).toLocaleDateString()}</div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ padding: '40px 24px', textAlign: 'center', color: '#9CA3AF', fontSize: '14px' }}>No recent tickets available</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;
