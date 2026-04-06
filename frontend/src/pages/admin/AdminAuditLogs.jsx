import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import '../../styles/admin.css';

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [allLogs, setAllLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [openFilterKey, setOpenFilterKey] = useState(null);
  const [columnFilters, setColumnFilters] = useState({
    user: '',
    role: '',
    action: '',
    ticket: '',
  });
  const [exportOpen, setExportOpen] = useState(false);
  const [customFromDate, setCustomFromDate] = useState('');
  const [customToDate, setCustomToDate] = useState('');
  const [exportError, setExportError] = useState('');
  const limit = 20;

  // Helper function to apply filters to data
  const filterAndPaginateData = (data, filters, page = 1) => {
    const filtered = data.filter(log => {
      const user = (log.UserName || '').toLowerCase();
      const role = (log.UserRole || '').toLowerCase();
      const action = (log.Action || '').toLowerCase();
      const ticket = (log.TicketTitle || '').toLowerCase();

      return (
        (!filters.user || user.includes(filters.user.toLowerCase())) &&
        (!filters.role || role === filters.role) &&
        (!filters.action || action.includes(filters.action.toLowerCase())) &&
        (!filters.ticket || ticket.includes(filters.ticket.toLowerCase()))
      );
    });

    setTotalLogs(filtered.length);
    const paginated = filtered.slice((page - 1) * limit, page * limit);
    setLogs(paginated);
  };

  // Fetch all audit logs on mount
  useEffect(() => {
    const fetchAllLogs = async () => {
      try {
        setLoading(true);
        const res = await api.get('/admin/audit-logs', {
          params: { limit: 10000 },
        });
        const allData = res.data.data || [];
        setAllLogs(allData);
        filterAndPaginateData(allData, columnFilters, currentPage);
      } catch (err) {
        console.error('Error fetching audit logs:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllLogs();
  }, []);

  // Apply filters when columnFilters change
  useEffect(() => {
    filterAndPaginateData(allLogs, columnFilters, currentPage);
  }, [columnFilters, currentPage, allLogs]);

  const handleResetFilters = () => {
    setColumnFilters({ user: '', role: '', action: '', ticket: '' });
    setOpenFilterKey(null);
  };

  const userOptions = [...new Set(allLogs.map(l => l.UserName).filter(Boolean))];
  const roleOptions = [...new Set(allLogs.map(l => l.UserRole).filter(Boolean))];
  const actionOptions = [...new Set(allLogs.map(l => l.Action).filter(Boolean))];
  const ticketOptions = [...new Set(allLogs.map(l => l.TicketTitle).filter(Boolean))];

  const totalPages = Math.ceil(totalLogs / limit);

  const getActionBadgeColor = (action) => {
    if (action.includes('created') || action.includes('Created')) return { bg: '#ECFDF5', color: '#065F46' };
    if (action.includes('updated') || action.includes('Updated')) return { bg: '#EFF6FF', color: '#1E40AF' };
    if (action.includes('deleted') || action.includes('Deleted')) return { bg: '#FEE2E2', color: '#991B1B' };
    if (action.includes('reassigned') || action.includes('Reassigned')) return { bg: '#FAF5FF', color: '#6B21A8' };
    return { bg: '#F3F4F6', color: '#374151' };
  };

  const downloadCSV = (filteredLogs, fileLabel) => {
    const headers = ['Log ID', 'User', 'Role', 'Action', 'Ticket ID', 'Ticket Title', 'Details', 'Timestamp'];
    const rows = filteredLogs.map(log => [
      log.LogID,
      log.UserName || '-',
      log.UserRole || '-',
      log.Action,
      log.TicketID || '-',
      log.TicketTitle || '-',
      log.NewValue || log.OldValue || '-',
      new Date(log.CreatedAt).toLocaleString('en-IN'),
    ]);

    const csv = [headers, ...rows].map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `audit-logs-${fileLabel}-${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setExportOpen(false);
    setExportError('');
  };

  const exportToCSV = (days, label) => {
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const filtered = allLogs.filter((log) => new Date(log.CreatedAt) >= cutoffDate);
    downloadCSV(filtered, label || `${days}days`);
  };

  const exportByCustomDateRange = () => {
    if (!customFromDate || !customToDate) {
      setExportError('Please select both From and To dates.');
      return;
    }

    const from = new Date(customFromDate);
    const to = new Date(customToDate);
    to.setHours(23, 59, 59, 999);

    if (from > to) {
      setExportError('From date cannot be after To date.');
      return;
    }

    const filtered = allLogs.filter((log) => {
      const createdAt = new Date(log.CreatedAt);
      return createdAt >= from && createdAt <= to;
    });

    downloadCSV(filtered, `custom-${customFromDate}-to-${customToDate}`);
  };

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
                minWidth: 240,
                boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
              }}
            >
              {type === 'select' ? (
                <>
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
                            transition: 'all 0.15s',
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = '#F9FAFB';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = columnFilters[keyName] === opt ? '#F3F4F6' : '#fff';
                          }}
                        >
                          {opt}
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <input
                  type="text"
                  value={columnFilters[keyName]}
                  onChange={(e) => {
                    setColumnFilters((p) => ({ ...p, [keyName]: e.target.value }));
                  }}
                  placeholder={`Search ${label}...`}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: 'none',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                    borderRadius: '10px',
                  }}
                />
              )}
            </div>
          )}
        </div>
      </th>
    );
  };

  return (
    <div className="admin-page">
      <div className="admin-page-header" style={{ overflow: 'visible' }}>
        <div>
          <h1 className="admin-page-title">Audit Logs</h1>
          <p className="admin-page-sub">Track all system activities and changes</p>
        </div>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setExportOpen(!exportOpen)}
            style={{
              padding: '10px 16px',
              background: '#3B82F6',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
            }}
          >
            Export to CSV
          </button>
          {exportOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                background: '#fff',
                border: '1px solid #E5E7EB',
                borderRadius: '12px',
                boxShadow: '0 18px 40px rgba(15, 23, 42, 0.18)',
                zIndex: 20,
                marginTop: '10px',
                minWidth: '320px',
                overflow: 'hidden',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{
                padding: '12px 14px',
                borderBottom: '1px solid #E5E7EB',
                background: '#F8FAFC',
                fontSize: '13px',
                fontWeight: 700,
                color: '#0F172A',
              }}>
                Export Audit Logs
              </div>

              <div style={{ padding: '14px', borderBottom: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#111827', marginBottom: '10px' }}>
                  Custom Date Range
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '4px', fontWeight: 600 }}>From</div>
                    <input
                      type="date"
                      value={customFromDate}
                      onChange={(e) => {
                        setCustomFromDate(e.target.value);
                        setExportError('');
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        border: '1px solid #CBD5E1',
                        borderRadius: '8px',
                        fontSize: '12px',
                        boxSizing: 'border-box',
                        outline: 'none',
                      }}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: '#64748B', marginBottom: '4px', fontWeight: 600 }}>To</div>
                    <input
                      type="date"
                      value={customToDate}
                      onChange={(e) => {
                        setCustomToDate(e.target.value);
                        setExportError('');
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        border: '1px solid #CBD5E1',
                        borderRadius: '8px',
                        fontSize: '12px',
                        boxSizing: 'border-box',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>
                <div style={{ marginTop: '10px' }}>
                  <button
                    onClick={exportByCustomDateRange}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      background: '#1D4ED8',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: '600',
                    }}
                  >
                    Export Custom Range
                  </button>
                  {exportError && (
                    <div style={{ fontSize: '11px', color: '#DC2626', marginTop: '8px' }}>
                      {exportError}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ padding: '10px 14px 8px', fontSize: '11px', fontWeight: 700, color: '#64748B' }}>
                QUICK EXPORT
              </div>
              <button
                onClick={() => exportToCSV(7, '7days')}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '10px 14px',
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: '#0F172A',
                  borderBottom: '1px solid #E5E7EB',
                }}
                onMouseEnter={(e) => e.target.style.background = '#F9FAFB'}
                onMouseLeave={(e) => e.target.style.background = 'none'}
              >
                Last 7 Days
              </button>
              <button
                onClick={() => exportToCSV(30, '30days')}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '10px 14px',
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: '#0F172A',
                  borderBottom: '1px solid #E5E7EB',
                }}
                onMouseEnter={(e) => e.target.style.background = '#F9FAFB'}
                onMouseLeave={(e) => e.target.style.background = 'none'}
              >
                Last 30 Days
              </button>
              <button
                onClick={() => exportToCSV(90, '3months')}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '10px 14px',
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: '#0F172A',
                  borderBottom: '1px solid #E5E7EB',
                }}
                onMouseEnter={(e) => e.target.style.background = '#F9FAFB'}
                onMouseLeave={(e) => e.target.style.background = 'none'}
              >
                Last 3 Months
              </button>
              <button
                onClick={() => exportToCSV(365, '1year')}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '10px 14px 12px',
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: '#0F172A',
                }}
                onMouseEnter={(e) => e.target.style.background = '#F9FAFB'}
                onMouseLeave={(e) => e.target.style.background = 'none'}
              >
                Last 1 Year
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="admin-table-container admin-desktop-table">
        <table className="admin-table">
          <thead className="admin-table-header">
            <tr>
              <th>Log ID</th>
              <HeaderCell label="User" keyName="user" type="select" options={userOptions} />
              <HeaderCell label="Role" keyName="role" type="select" options={roleOptions} />
              <HeaderCell label="Action" keyName="action" type="select" options={actionOptions} />
              <HeaderCell label="Ticket" keyName="ticket" type="select" options={ticketOptions} />
              <th>Details</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody className="admin-table-body">
            {loading ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
                  Loading audit logs...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
                  No logs found
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const actionColor = getActionBadgeColor(log.Action);
                return (
                  <tr 
                    key={log.LogID}
                  >
                    <td style={{ color: '#9CA3AF', fontWeight: '600', fontSize: '12px' }}>
                      #{log.LogID}
                    </td>
                    <td style={{ color: '#111827', fontWeight: '500' }}>
                      {log.UserName || '—'}
                    </td>
                    <td style={{ color: '#6B7280', fontSize: '12px' }}>
                      {log.UserRole || '—'}
                    </td>
                    <td>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '600',
                          background: actionColor.bg,
                          color: actionColor.color,
                        }}
                      >
                        {log.Action}
                      </span>
                    </td>
                    <td style={{ color: '#6B7280' }}>
                      {log.TicketTitle ? (
                        <span>
                          #{log.TicketID} - {log.TicketTitle.substring(0, 20)}...
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td style={{ color: '#6B7280', fontSize: '12px', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {log.NewValue || log.OldValue || '—'}
                    </td>
                    <td style={{ color: '#9CA3AF', fontSize: '12px', whiteSpace: 'nowrap' }}>
                      {new Date(log.CreatedAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}{' '}
                      {new Date(log.CreatedAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="admin-mobile-cards">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '24px', color: '#9CA3AF' }}>Loading audit logs...</div>
        ) : logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: '#9CA3AF' }}>No logs found</div>
        ) : (
          logs.map((log) => {
            const actionColor = getActionBadgeColor(log.Action);
            return (
              <div key={`mobile-log-${log.LogID}`} className="admin-mobile-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ color: '#9CA3AF', fontWeight: 700, fontSize: 12 }}>#{log.LogID}</span>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: '600',
                      background: actionColor.bg,
                      color: actionColor.color,
                    }}
                  >
                    {log.Action}
                  </span>
                </div>

                <div style={{ fontSize: 13, color: '#111827', fontWeight: 600, marginBottom: 4 }}>
                  {log.UserName || '—'}
                </div>
                <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>Role: {log.UserRole || '—'}</div>
                <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>
                  Ticket: {log.TicketTitle ? `#${log.TicketID} - ${log.TicketTitle}` : '—'}
                </div>
                <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 6 }}>
                  Details: {log.NewValue || log.OldValue || '—'}
                </div>
                <div style={{ fontSize: 12, color: '#9CA3AF' }}>
                  {new Date(log.CreatedAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}{' '}
                  {new Date(log.CreatedAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '24px' }}>
          <button
            className="admin-btn admin-btn-ghost"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            ← Previous
          </button>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: currentPage === page ? 'none' : '1px solid #E5E7EB',
                  background: currentPage === page ? '#4F46E5' : '#fff',
                  color: currentPage === page ? '#fff' : '#374151',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '500',
                }}
              >
                {page}
              </button>
            ))}
          </div>
          <button
            className="admin-btn admin-btn-ghost"
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
