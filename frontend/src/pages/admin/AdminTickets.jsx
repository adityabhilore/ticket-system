import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import '../../styles/admin.css';

const PRIORITY_COLORS = {
  Critical: '#DC2626',
  High: '#EA580C',
  Medium: '#F59E0B',
  Low: '#10B981',
};

// Professional Custom Dropdown Component
const ProfessionalSelect = ({ value, onChange, options, placeholder }) => {
  const [searchText, setSearchText] = useState('');

  const filtered = options.filter((opt) =>
    opt.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <div style={{ width: '100%' }}>
      <input
        type="text"
        placeholder="Search..."
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        style={{
          width: '100%',
          padding: '10px 12px',
          border: '1px solid #E5E7EB',
          borderRadius: '8px 8px 0 0',
          fontSize: '14px',
          outline: 'none',
          marginBottom: '8px',
        }}
        autoFocus
      />
      <div
        style={{
          maxHeight: '180px',
          overflowY: 'auto',
          border: '1px solid #E5E7EB',
          borderTop: 'none',
          borderRadius: '0 0 8px 8px',
        }}
      >
        {filtered.length === 0 ? (
          <div style={{ padding: '12px', color: '#9CA3AF', textAlign: 'center', fontSize: '13px' }}>
            No options found
          </div>
        ) : (
          filtered.map((opt) => (
            <div
              key={opt}
              onClick={() => onChange(opt)}
              style={{
                padding: '10px 12px',
                cursor: 'pointer',
                backgroundColor: value === opt ? '#F3F4F6' : '#fff',
                borderLeft: value === opt ? '4px solid #3B82F6' : '4px solid transparent',
                color: value === opt ? '#1F2937' : '#6B7280',
                fontWeight: value === opt ? '600' : '400',
                fontSize: '14px',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#F9FAFB';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = value === opt ? '#F3F4F6' : '#fff';
              }}
            >
              {opt}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Engineer Dropdown Component
const EngineerSelect = ({ value, onChange, engineers, placeholder }) => {
  const [searchText, setSearchText] = useState('');

  const filtered = engineers.filter((eng) =>
    eng.Name.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <div style={{ width: '100%' }}>
      <input
        type="text"
        placeholder={placeholder || "Search engineer..."}
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        style={{
          width: '100%',
          padding: '10px 12px',
          border: '1px solid #E5E7EB',
          borderRadius: '8px 8px 0 0',
          fontSize: '14px',
          outline: 'none',
          marginBottom: '8px',
        }}
        autoFocus
      />
      <div
        style={{
          maxHeight: '220px',
          overflowY: 'auto',
          border: '1px solid #E5E7EB',
          borderTop: 'none',
          borderRadius: '0 0 8px 8px',
        }}
      >
        {filtered.length === 0 ? (
          <div style={{ padding: '12px', color: '#9CA3AF', textAlign: 'center', fontSize: '13px' }}>
            No engineers found
          </div>
        ) : (
          filtered.map((eng) => (
            <div
              key={eng.UserID}
              onClick={() => onChange(eng.UserID)}
              style={{
                padding: '12px',
                cursor: 'pointer',
                backgroundColor: value === eng.UserID ? '#F3F4F6' : '#fff',
                borderLeft: value === eng.UserID ? '4px solid #3B82F6' : '4px solid transparent',
                color: value === eng.UserID ? '#1F2937' : '#6B7280',
                fontWeight: value === eng.UserID ? '600' : '400',
                fontSize: '14px',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#F9FAFB';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = value === eng.UserID ? '#F3F4F6' : '#fff';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '500' }}>{eng.Name}</span>
                <span style={{ fontSize: '12px', opacity: 0.7 }}>({eng.activeTickets || 0} active)</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default function AdminTickets() {
  const navigate = useNavigate();
  const PAGE_SIZE = 25;
  const [tickets, setTickets] = useState([]);
  const [allTicketCache, setAllTicketCache] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [deleting, setDeleting] = useState(null);
  const [reassigning, setReassigning] = useState(null);
  const [engineers, setEngineers] = useState([]);
  const [engineersLoading, setEngineersLoading] = useState(false);
  const [selectedEngineer, setSelectedEngineer] = useState('');
  const [openFilterKey, setOpenFilterKey] = useState(null);
  const [columnFilters, setColumnFilters] = useState({
    id: '',
    title: '',
    company: '',
    priority: '',
    status: '',
    created: '',
    assignedTo: '',
  });

  useEffect(() => {
    fetchTickets(1, false);
    fetchEngineers();
  }, []);

  useEffect(() => {
    const onOutsideClick = (e) => {
      if (!e.target.closest('.header-filter-wrap')) setOpenFilterKey(null);
    };
    document.addEventListener('mousedown', onOutsideClick);
    return () => document.removeEventListener('mousedown', onOutsideClick);
  }, []);

  const fetchTickets = async (targetPage = 1, append = false) => {
    try {
      if (!append) setLoading(true);
      const res = await api.get('/admin/tickets', {
        params: { page: targetPage, limit: PAGE_SIZE },
      });
      const rawData = res.data?.data || [];
      const allItems = Array.isArray(rawData) ? rawData : [];
      const hasServerPagination =
        typeof res.data?.hasMore === 'boolean' || typeof res.data?.total === 'number';

      if (hasServerPagination) {
        setTickets((prev) => (append ? [...prev, ...allItems] : allItems));
        setHasMore(Boolean(res.data?.hasMore));
        setTotalCount(Number(res.data?.total || allItems.length));
      } else {
        // Fallback for older backend responses that return full dataset.
        if (!append) {
          const firstPage = allItems.slice(0, PAGE_SIZE);
          setAllTicketCache(allItems);
          setTickets(firstPage);
          setHasMore(firstPage.length < allItems.length);
          setTotalCount(allItems.length);
        } else {
          const start = (targetPage - 1) * PAGE_SIZE;
          const nextPage = allTicketCache.slice(start, start + PAGE_SIZE);
          setTickets((prev) => [...prev, ...nextPage]);
          setHasMore(start + nextPage.length < allTicketCache.length);
          setTotalCount(allTicketCache.length);
        }
      }

      setPage(targetPage);
    } catch (err) {
      console.error('Error fetching tickets:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const fetchEngineers = async () => {
    try {
      setEngineersLoading(true);
      console.log('📥 Fetching engineers from /admin/users/engineers...');
      const res = await api.get('/admin/users/engineers');
      console.log('📦 Full response:', res);
      console.log('📦 res.data:', res.data);
      console.log('📦 res.data.data:', res.data.data);
      const engineersData = res.data.data || [];
      console.log('✅ Setting engineers:', engineersData);
      setEngineers(engineersData);
    } catch (err) {
      console.error('❌ Error fetching engineers:', err);
      console.error('Response status:', err?.response?.status);
      console.error('Response data:', err?.response?.data);
      setEngineers([]);
    } finally {
      setEngineersLoading(false);
    }
  };

  const handleReassign = async (ticketId) => {
    if (!selectedEngineer) {
      alert('Please select an engineer');
      return;
    }

    setReassigning(ticketId);
    try {
      await api.put(`/admin/tickets/${ticketId}/reassign`, {
        engineerId: selectedEngineer,
      });
      fetchTickets();
      setReassigning(null);
      setSelectedEngineer('');
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to reassign ticket');
      setReassigning(null);
    }
  };

  const handleDelete = async (ticketId) => {
    if (!window.confirm('Delete this ticket? This action cannot be undone.')) return;

    setDeleting(ticketId);
    try {
      await api.delete(`/admin/tickets/${ticketId}`);
      setTickets((prev) => prev.filter((t) => t.TicketID !== ticketId));
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to delete ticket');
    } finally {
      setDeleting(null);
    }
  };

  const filtered = tickets.filter((t) => {
    const idText = String(t.TicketID || '').toLowerCase();
    const titleText = (t.Title || '').toLowerCase();
    const companyText = (t.CompanyName || '').toLowerCase();
    const priorityText = (t.PriorityName || '').toLowerCase();
    const statusText = (t.StatusName || '').toLowerCase();
    const createdText = new Date(t.CreatedAt).toLocaleDateString('en-IN').toLowerCase();
    const assignedText = (t.AssignedToName || '').toLowerCase();

    const matchId = !columnFilters.id || idText.includes(columnFilters.id.toLowerCase().replace('#', ''));
    const matchTitle = !columnFilters.title || titleText.includes(columnFilters.title.toLowerCase());
    const matchCompany = !columnFilters.company || companyText === columnFilters.company.toLowerCase();
    const matchPriority = !columnFilters.priority || priorityText === columnFilters.priority.toLowerCase();
    const matchStatus = !columnFilters.status || statusText === columnFilters.status.toLowerCase();
    const matchCreated = !columnFilters.created || createdText.includes(columnFilters.created.toLowerCase());
    const matchAssigned = !columnFilters.assignedTo || assignedText.includes(columnFilters.assignedTo.toLowerCase());

    return matchId && matchTitle && matchCompany && matchPriority && matchStatus && matchCreated && matchAssigned;
  });

  const visibleFiltered = filtered;

  // Get unique companies and priorities from tickets
  const uniqueCompanies = [...new Set(tickets.map(t => t.CompanyName))].sort();
  const uniquePriorities = ['Critical', 'High', 'Medium', 'Low'];
  const uniqueStatuses = [...new Set(tickets.map((t) => t.StatusName).filter(Boolean))].sort();

  const handleResetFilters = () => {
    setColumnFilters({
      id: '',
      title: '',
      company: '',
      priority: '',
      status: '',
      created: '',
      assignedTo: '',
    });
    setOpenFilterKey(null);
  };

  const HeaderCell = ({ label, keyName, type = 'text', options = [] }) => {
    const isOpen = openFilterKey === keyName;

    return (
      <th style={{ position: 'relative' }}>
        <div className="header-filter-wrap" style={{ position: 'relative', display: 'inline-block' }}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpenFilterKey(isOpen ? null : keyName);
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
                <ProfessionalSelect
                  value={columnFilters[keyName]}
                  onChange={(val) => {
                    setColumnFilters((p) => ({ ...p, [keyName]: val }));
                    setOpenFilterKey(null);
                  }}
                  options={options}
                  placeholder={`Select ${label}`}
                />
              ) : (
                <input
                  type="text"
                  value={columnFilters[keyName]}
                  onChange={(e) => {
                    setColumnFilters((p) => ({ ...p, [keyName]: e.target.value }));
                  }}
                  placeholder={`Search ${label}...`}
                  className="admin-form-input"
                  style={{ width: '100%', padding: '10px 12px', minWidth: 240, border: 'none', borderRadius: 10 }}
                  autoFocus
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
      <div className="admin-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="admin-page-title">All Tickets</h1>
          <p className="admin-page-sub">Manage and monitor all tickets in the system ({filtered.length} loaded{totalCount ? ` of ${totalCount}` : ''})</p>
        </div>
        <button onClick={handleResetFilters} className="admin-btn admin-btn-reset" style={{ whiteSpace: 'nowrap' }}>
          ↺ Reset Filters
        </button>
      </div>

      <div className="admin-table-container admin-desktop-table">
        <table className="admin-table">
          <thead className="admin-table-header">
            <tr>
              <HeaderCell label="ID" keyName="id" />
              <HeaderCell label="Title" keyName="title" />
              <HeaderCell label="Company" keyName="company" type="select" options={uniqueCompanies} />
              <HeaderCell label="Priority" keyName="priority" type="select" options={uniquePriorities} />
              <HeaderCell label="Status" keyName="status" type="select" options={uniqueStatuses} />
              <HeaderCell label="Created" keyName="created" />
              <HeaderCell label="Assigned To" keyName="assignedTo" />
              <th style={{ textAlign: 'center', fontWeight: 700 }}>Actions</th>
            </tr>
          </thead>
          <tbody className="admin-table-body">
            {loading ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
                  Loading tickets...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
                  No tickets found
                </td>
              </tr>
            ) : (
              visibleFiltered.map((ticket) => (
                <tr key={ticket.TicketID}>
                  <td style={{ color: '#9CA3AF', fontWeight: '600', fontSize: '12px' }}>
                    #{ticket.TicketID}
                  </td>
                  <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/tickets/${ticket.TicketID}`)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#2563EB',
                        cursor: 'pointer',
                        padding: 0,
                        textAlign: 'left',
                        font: 'inherit',
                        fontWeight: 600,
                      }}
                    >
                      {ticket.Title}
                    </button>
                  </td>
                  <td style={{ color: '#6B7280' }}>{ticket.CompanyName}</td>
                  <td>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        background: PRIORITY_COLORS[ticket.PriorityName] + '20',
                        color: PRIORITY_COLORS[ticket.PriorityName],
                      }}
                    >
                      {ticket.PriorityName}
                    </span>
                  </td>
                  <td>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '600',
                        background: ticket.StatusName === 'Resolved' ? '#ECFDF5' : '#FEF3C7',
                        color: ticket.StatusName === 'Resolved' ? '#065F46' : '#923A00',
                      }}
                    >
                      {ticket.StatusName}
                    </span>
                  </td>
                  <td style={{ color: '#9CA3AF', fontSize: '12px' }}>
                    {new Date(ticket.CreatedAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td style={{ color: '#6B7280' }}>
                    {ticket.AssignedToName ? ticket.AssignedToName : <span style={{ color: '#9CA3AF' }}>—</span>}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
                      <button
                        className="admin-btn"
                        onClick={() => navigate(`/admin/tickets/${ticket.TicketID}`)}
                        style={{ padding: '4px 10px', fontSize: '12px' }}
                      >
                        View
                      </button>
                    <button
                        className="admin-btn admin-btn-reassign"
                        onClick={() => {
                          fetchEngineers();
                          setReassigning(ticket.TicketID);
                        }}
                        disabled={reassigning === ticket.TicketID}
                        style={{ padding: '4px 10px', fontSize: '12px' }}
                      >
                        {reassigning === ticket.TicketID ? 'Reassigning...' : 'Reassign'}
                      </button>
                      <button
                        className="admin-btn admin-btn-danger"
                        onClick={() => handleDelete(ticket.TicketID)}
                        disabled={deleting === ticket.TicketID}
                        style={{ padding: '4px 10px', fontSize: '12px' }}
                      >
                        {deleting === ticket.TicketID ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="admin-mobile-cards">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '24px', color: '#9CA3AF' }}>Loading tickets...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: '#9CA3AF' }}>No tickets found</div>
        ) : (
          visibleFiltered.map((ticket) => (
            <div key={`mobile-${ticket.TicketID}`} className="admin-mobile-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ color: '#9CA3AF', fontWeight: 700, fontSize: 12 }}>#{ticket.TicketID}</span>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    background: PRIORITY_COLORS[ticket.PriorityName] + '20',
                    color: PRIORITY_COLORS[ticket.PriorityName],
                  }}
                >
                  {ticket.PriorityName}
                </span>
              </div>

              <div style={{ fontSize: 14, fontWeight: 700, color: '#1F2937', marginBottom: 8 }}>
                {ticket.Title}
              </div>
              <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>
                Company: {ticket.CompanyName}
              </div>
              <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 4 }}>
                Created: {new Date(ticket.CreatedAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </div>
              <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>
                Assigned: {ticket.AssignedToName || '—'}
              </div>

              <div style={{ marginBottom: 12 }}>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    background: ticket.StatusName === 'Resolved' ? '#ECFDF5' : '#FEF3C7',
                    color: ticket.StatusName === 'Resolved' ? '#065F46' : '#923A00',
                  }}
                >
                  {ticket.StatusName}
                </span>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  className="admin-btn"
                  onClick={() => navigate(`/admin/tickets/${ticket.TicketID}`)}
                  style={{ padding: '6px 10px', fontSize: '12px' }}
                >
                  View
                </button>
                <button
                  className="admin-btn admin-btn-reassign"
                  onClick={() => {
                    fetchEngineers();
                    setReassigning(ticket.TicketID);
                  }}
                  disabled={reassigning === ticket.TicketID}
                  style={{ padding: '6px 10px', fontSize: '12px' }}
                >
                  {reassigning === ticket.TicketID ? 'Reassigning...' : 'Reassign'}
                </button>
                <button
                  className="admin-btn admin-btn-danger"
                  onClick={() => handleDelete(ticket.TicketID)}
                  disabled={deleting === ticket.TicketID}
                  style={{ padding: '6px 10px', fontSize: '12px' }}
                >
                  {deleting === ticket.TicketID ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {hasMore && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '14px' }}>
          <button
            type="button"
            onClick={() => {
              if (loadingMore) return;
              setLoadingMore(true);
              fetchTickets(page + 1, true);
            }}
            disabled={loadingMore}
            className="admin-btn admin-btn-ghost"
            style={{ fontSize: '13px', fontWeight: '600' }}
          >
            {loadingMore ? 'Loading...' : 'Load More Tickets'}
          </button>
        </div>
      )}

      {/* Reassign Modal */}
      {reassigning && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            animation: 'fadeIn 0.2s ease',
            backdropFilter: 'blur(2px)',
          }}
        >
          <div
            className="admin-card"
            style={{
              maxWidth: '550px',
              width: '90%',
              margin: '0 20px',
              padding: '40px',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '16px',
            }}
          >
            <div style={{ marginBottom: '32px' }}>
              <h2 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '12px', color: '#111827' }}>
                Reassign Ticket
              </h2>
              <p style={{ fontSize: '15px', color: '#6B7280', margin: 0, lineHeight: '1.6' }}>
                Select an engineer from the list below to assign this ticket to them
              </p>
            </div>
            <div className="admin-form-group" style={{ marginBottom: '32px' }}>
              <label className="admin-form-label" style={{ fontSize: '15px', fontWeight: '600', marginBottom: '12px', display: 'block' }}>
                Select Engineer
              </label>
              {engineersLoading ? (
                <div style={{ padding: '40px 12px', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '8px', color: '#9CA3AF', textAlign: 'center', fontSize: '14px' }}>
                  <div style={{ marginBottom: '12px' }}>Loading engineers...</div>
                  <div style={{ fontSize: '12px', opacity: 0.7 }}>⏳ Please wait</div>
                </div>
              ) : engineers.length === 0 ? (
                <div style={{ padding: '40px 12px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', color: '#7F1D1D', textAlign: 'center', fontSize: '14px' }}>
                  <div style={{ marginBottom: '8px', fontWeight: '600' }}>⚠️ No engineers available</div>
                  <div style={{ fontSize: '12px' }}>Please contact admin to add engineers</div>
                </div>
              ) : (
                <EngineerSelect
                  value={selectedEngineer}
                  onChange={(val) => setSelectedEngineer(val)}
                  engineers={engineers}
                  placeholder="Search engineer by name..."
                />
              )}
              {engineers.length > 0 && selectedEngineer && (
                <div style={{ marginTop: '12px', fontSize: '13px', color: '#6B7280', background: '#F9FAFB', padding: '10px 12px', borderRadius: '6px' }}>
                  <strong>Selected:</strong> {engineers.find(e => e.UserID === selectedEngineer)?.Name} 
                  ({engineers.find(e => e.UserID === selectedEngineer)?.activeTickets || 0} active tickets)
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '32px' }}>
              <button
                className="admin-btn admin-btn-ghost"
                onClick={() => {
                  setReassigning(null);
                  setSelectedEngineer('');
                }}
                style={{ padding: '12px 28px', fontSize: '14px', fontWeight: '600' }}
              >
                Cancel
              </button>
              <button
                className="admin-btn admin-btn-reassign"
                onClick={() => handleReassign(reassigning)}
                style={{ padding: '12px 28px', fontSize: '14px', fontWeight: '600', background: '#3B82F6', border: '1px solid #3B82F6' }}
              >
                Reassign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
