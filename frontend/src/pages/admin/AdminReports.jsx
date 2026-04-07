import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import '../../styles/admin.css';

export default function AdminReports() {
  const [reports, setReports] = useState(null);
  const [filteredReports, setFilteredReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateRange] = useState(30);
  const [openFilterKey, setOpenFilterKey] = useState(null);
  const [columnFilters, setColumnFilters] = useState({
    engineer: '',
    company: '',
  });

  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  useEffect(() => {
    if (reports) {
      applyFilters();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnFilters, reports]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/reports', {
        params: { days: dateRange },
      });
      setReports(res.data.data);
      setError('');
    } catch (err) {
      console.error('Error fetching reports:', err);
      setError('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    if (!reports) return;
    
    const filtered = {
      ...reports,
      engineerPerf: (reports.engineerPerf || []).filter(eng => {
        const name = (eng.Name || '').toLowerCase();
        return !columnFilters.engineer || name.includes(columnFilters.engineer.toLowerCase());
      }),
    };
    
    setFilteredReports(filtered);
  };

  const handleResetFilters = () => {
    setColumnFilters({ engineer: '', company: '' });
    setOpenFilterKey(null);
  };

  const engineerOptions = reports?.engineerPerf?.map(e => e.Name) || [];

  if (loading) {
    return (
      <div className="admin-page">
        <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
          Loading reports...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-page">
        <div className="admin-alert admin-alert-error">{error}</div>
      </div>
    );
  }

  const displayReports = filteredReports || reports;

  const HeaderCell = ({ label, keyName, type = 'text', options = [] }) => {
    const isOpen = openFilterKey === keyName;
    const [searchText, setSearchText] = useState('');

    const filteredOptions = type === 'select' 
      ? options.filter(opt => String(opt).toLowerCase().includes(searchText.toLowerCase()))
      : [];

    useEffect(() => {
      const handleClickOutside = () => {
        if (isOpen) setOpenFilterKey(null);
      };
      if (isOpen) document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }, [isOpen]);

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
                minWidth: 220,
                boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
              }}
            >
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
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#F9FAFB'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = columnFilters[keyName] === opt ? '#F3F4F6' : '#fff'}
                    >
                      {opt}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </th>
    );
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Reports & Analytics</h1>
          <p className="admin-page-sub">System-wide performance metrics and insights</p>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px',
      }}> 
        {[
          { 
            title: 'Total Tickets', 
            value: displayReports?.engineerPerf?.reduce((sum, e) => sum + (parseInt(e.totalAssigned) || 0), 0) || 0, 
            color: '#3B82F6', 
            bgColor: '#3B82F6'
          },
          { 
            title: 'Resolved', 
            value: displayReports?.engineerPerf?.reduce((sum, e) => sum + (parseInt(e.resolved) || 0), 0) || 0, 
            color: '#10B981', 
            bgColor: '#10B981'
          },
          { 
            title: 'Overdue Resolved', 
            value: displayReports?.overdueResolved || 0, 
            color: '#DC2626', 
            bgColor: '#DC2626'
          },
          { 
            title: 'Overdue Pending', 
            value: displayReports?.overduePending || 0, 
            color: '#EA580C', 
            bgColor: '#EA580C'
          },
          { 
            title: 'Avg Resolution', 
            value: `${displayReports?.avgResolutionTime || 0}h`, 
            color: '#F59E0B', 
            bgColor: '#F59E0B'
          },
          { 
            title: 'SLA Compliance Rate', 
            value: `${displayReports?.slaRate || 0}%`, 
            color: '#3B82F6', 
            bgColor: '#3B82F6'
          },
        ].map((stat, idx) => (
          <div
            key={idx}
            style={{
              background: stat.bgColor,
              borderRadius: '8px',
              padding: '20px',
              border: 'none',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
              color: '#fff',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-8px)';
              e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
            }}
          >
            <div style={{ fontSize: '14px', fontWeight: '600', opacity: 0.9, marginBottom: '12px', color: '#fff' }}>
              {stat.title}
            </div>
            <div style={{ fontSize: '40px', fontWeight: '700', color: '#fff' }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Ticket Trend Chart */}
      <div style={{
        background: '#fff',
        borderRadius: '8px',
        padding: '20px',
        border: '1px solid #E5E7EB',
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      }}>
        <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', color: '#1F2937' }}>
          Ticket Activity (Last 7 Days)
        </div>
        {displayReports?.dailyTicketTrend && displayReports.dailyTicketTrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={displayReports.dailyTicketTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="day" stroke="#6B7280" style={{ fontSize: 12 }} />
              <YAxis stroke="#6B7280" style={{ fontSize: 12 }} />
              <Tooltip cursor={false} contentStyle={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '6px' }} />
              <Legend />
              <Bar dataKey="created" fill="#3B82F6" name="Created" radius={[4, 4, 0, 0]} />
              <Bar dataKey="resolved" fill="#10B981" name="Resolved" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
            No ticket activity data available
          </div>
        )}
      </div>

      {/* SLA Compliance Trend Chart */}
      <div style={{
        background: '#fff',
        borderRadius: '8px',
        padding: '20px',
        border: '1px solid #E5E7EB',
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      }}>
        <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', color: '#1F2937' }}>
          SLA Compliance Trend (Last 7 Days)
        </div>
        {displayReports?.dailySLATrend && displayReports.dailySLATrend.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={displayReports.dailySLATrend} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="day" stroke="#6B7280" style={{ fontSize: 12 }} />
              <YAxis stroke="#6B7280" style={{ fontSize: 12 }} domain={[0, 100]} />
              <Tooltip 
                cursor={false}
                contentStyle={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '6px' }}
                formatter={(value) => `${value}%`}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="slaRate" 
                stroke="#3B82F6" 
                name="SLA Compliance %" 
                strokeWidth={2}
                dot={{ fill: '#3B82F6', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
            No SLA compliance data available
          </div>
        )}
      </div>

      {/* Distribution Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        
        {/* Tickets by Status Pie Chart */}
        <div style={{
          background: '#fff',
          borderRadius: '8px',
          padding: '20px',
          border: '1px solid #E5E7EB',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}>
          <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', color: '#1F2937' }}>
            Tickets by Status
          </div>
          {displayReports?.byStatus && displayReports.byStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={380}>
              <PieChart>
                <Pie
                  data={displayReports.byStatus.map((item) => ({
                    name: item.StatusName,
                    value: item.count,
                  }))}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {['#3B82F6', '#10B981', '#F59E0B', '#DC2626', '#8B5CF6'].map((color, idx) => (
                    <Cell key={`cell-${idx}`} fill={color} />
                  ))}
                </Pie>
                <Tooltip cursor={false} formatter={(value) => `${value}`} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>No status data</div>
          )}
        </div>

        {/* Tickets by Priority Pie Chart */}
        <div style={{
          background: '#fff',
          borderRadius: '8px',
          padding: '20px',
          border: '1px solid #E5E7EB',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}>
          <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', color: '#1F2937' }}>
            Tickets by Priority
          </div>
          {displayReports?.byPriority && displayReports.byPriority.length > 0 ? (
            <ResponsiveContainer width="100%" height={380}>
              <PieChart>
                <Pie
                  data={displayReports.byPriority.map((item) => ({
                    name: item.PriorityName,
                    value: item.count,
                  }))}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {['#DC2626', '#F59E0B', '#10B981'].map((color, idx) => (
                    <Cell key={`cell-${idx}`} fill={color} />
                  ))}
                </Pie>
                <Tooltip cursor={false} formatter={(value) => `${value}`} />
                <Legend verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>No priority data</div>
          )}
        </div>
      </div>

      {/* Tickets by Company Table */}
      <div style={{
        background: '#fff',
        borderRadius: '8px',
        padding: '20px',
        border: '1px solid #E5E7EB',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        marginBottom: '24px',
      }}>
        <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px', color: '#1F2937' }}>
          Top Five Company Tickets
        </div>
        {displayReports?.byCompany && displayReports.byCompany.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '14px',
              tableLayout: 'fixed',
            }}>
              <thead>
                <tr style={{ background: '#F3F4F6', borderBottom: '2px solid #E5E7EB' }}>
                  <th style={{
                    padding: '12px 12px',
                    textAlign: 'center',
                    fontWeight: '600',
                    color: '#1F2937',
                    width: '60px',
                  }}>Sr. No</th>
                  <th style={{
                    padding: '12px 20px',
                    textAlign: 'left',
                    fontWeight: '600',
                    color: '#1F2937',
                    width: '40%',
                  }}>Company Name</th>
                  <th style={{
                    padding: '12px 8px',
                    textAlign: 'center',
                    fontWeight: '600',
                    color: '#1F2937',
                    width: '20%',
                  }}>Total Tickets</th>
                  <th style={{
                    padding: '12px 8px',
                    textAlign: 'center',
                    fontWeight: '600',
                    color: '#1F2937',
                    width: '20%',
                  }}>Solved Tickets</th>
                  <th style={{
                    padding: '12px 8px',
                    textAlign: 'center',
                    fontWeight: '600',
                    color: '#1F2937',
                    width: '20%',
                  }}>Remaining Tickets</th>
                </tr>
              </thead>
              <tbody>
                {[...displayReports.byCompany].sort((a, b) => b.count - a.count).slice(0, 5).map((company, idx) => {
                  const totalTickets = company.count || 0;
                  const solvedTickets = company.solvedCount || 0;
                  const remainingTickets = totalTickets - solvedTickets;
                  
                  return (
                    <tr key={idx} style={{
                      borderBottom: '1px solid #E5E7EB',
                      background: idx % 2 === 0 ? '#fff' : '#F9FAFB',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#F3F4F6'}
                    onMouseLeave={(e) => e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#F9FAFB'}>
                      <td style={{
                        padding: '12px 12px',
                        textAlign: 'center',
                        color: '#6B7280',
                        fontWeight: '500',
                      }}>{idx + 1}</td>
                      <td style={{
                        padding: '12px 20px',
                        color: '#1F2937',
                        fontWeight: '500',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>{company.CompanyName}</td>
                      <td style={{
                        padding: '12px 8px',
                        textAlign: 'center',
                        color: '#4F46E5',
                        fontWeight: '700',
                      }}>{totalTickets}</td>
                      <td style={{
                        padding: '12px 8px',
                        textAlign: 'center',
                        color: '#10B981',
                        fontWeight: '700',
                      }}>{solvedTickets}</td>
                      <td style={{
                        padding: '12px 8px',
                        textAlign: 'center',
                        color: '#EF4444',
                        fontWeight: '700',
                      }}>{remainingTickets}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>No company data</div>
        )}
      </div>

      {/* Engineer Performance */}
      <div style={{
        background: '#fff',
        borderRadius: '8px',
        border: '1px solid #E5E7EB',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        marginBottom: '24px',
        padding: '16px',
      }}>
        <div style={{ fontSize: '18px', fontWeight: '700', marginBottom: '12px', color: '#1F2937' }}>
          Engineer Performance
        </div>

        {/* Filter Reset Button */}
        {Object.values(columnFilters).some(v => v) && (
          <div style={{ marginBottom: '12px' }}>
            <button
              onClick={handleResetFilters}
              style={{
                padding: '6px 12px',
                background: '#F3F4F6',
                border: '1px solid #E5E7EB',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                color: '#6B7280',
              }}
            >
              Clear Filters
            </button>
          </div>
        )}

        <div className="admin-table-container admin-desktop-table">
          <table className="admin-table">
            <thead className="admin-table-header">
              <tr>
                <HeaderCell label="Engineer" keyName="engineer" type="select" options={engineerOptions} />
                <th>Total Assigned</th>
                <th>Resolved</th>
                <th>Overdue</th>
                <th>Resolution Rate</th>
              </tr>
            </thead>
            <tbody className="admin-table-body">
              {displayReports?.engineerPerf && displayReports.engineerPerf.length > 0 ? (
                displayReports.engineerPerf.map((eng, i) => {
                  const resolutionRate = eng.totalAssigned > 0 
                    ? Math.round((eng.resolved / eng.totalAssigned) * 100)
                    : 0;
                  
                  return (
                    <tr key={i}>
                      <td style={{ fontWeight: '600', color: '#111827' }}>
                        {eng.Name}
                      </td>
                      <td style={{ color: '#6B7280' }}>
                        {eng.totalAssigned}
                      </td>
                      <td>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                            background: '#DCFCE7',
                            color: '#065F46',
                          }}
                        >
                          {eng.resolved}
                        </span>
                      </td>
                      <td>
                        {eng.overdue > 0 ? (
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '4px 10px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '600',
                              background: '#FECACA',
                              color: '#991B1B',
                            }}
                          >
                            {eng.overdue}
                          </span>
                        ) : (
                          <span style={{ color: '#9CA3AF' }}>—</span>
                        )}
                      </td>
                      <td style={{ color: '#111827', fontWeight: '600' }}>
                        {resolutionRate}%
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '20px', color: '#9CA3AF' }}>
                    No engineer data
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="admin-mobile-cards">
          {displayReports?.engineerPerf && displayReports.engineerPerf.length > 0 ? (
            displayReports.engineerPerf.map((eng, i) => {
              const totalAssigned = parseInt(eng.totalAssigned) || 0;
              const resolved = parseInt(eng.resolved) || 0;
              const overdue = parseInt(eng.overdue) || 0;
              const resolutionRate = totalAssigned > 0
                ? Math.round((resolved / totalAssigned) * 100)
                : 0;

              return (
                <div key={`eng-mobile-${i}`} className="admin-mobile-card">
                  <div style={{ fontWeight: 700, color: '#111827', marginBottom: 10 }}>{eng.Name}</div>
                  <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 6 }}>Total Assigned: {totalAssigned}</div>
                  <div style={{ marginBottom: 6 }}>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        background: '#DCFCE7',
                        color: '#065F46',
                      }}
                    >
                      Resolved: {resolved}
                    </span>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    {overdue > 0 ? (
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '600',
                          background: '#FECACA',
                          color: '#991B1B',
                        }}
                      >
                        Overdue: {overdue}
                      </span>
                    ) : (
                      <span style={{ color: '#9CA3AF', fontSize: 12 }}>Overdue: —</span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>
                    Resolution Rate: {resolutionRate}%
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ textAlign: 'center', padding: '20px', color: '#9CA3AF' }}>No engineer data</div>
          )}
        </div>
      </div>


    </div>
  );
}
