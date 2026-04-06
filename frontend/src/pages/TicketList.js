import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import ticketService from '../services/ticketService';
import { formatDate, getSLAState, showError } from '../utils/helpers';
import '../styles/main.css';

const TicketList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
  });
  const [, setCurrentTime] = useState(Date.now());

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await ticketService.getTickets(filters);
      setTickets(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(showError(err));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000);

    return () => window.clearInterval(timer);
  }, []);

  const handleCreateNew = () => {
    if (user?.role === 'Client' || user?.role === 'Engineer') {
      navigate('/tickets/create');
    }
  };

  const getStatusBadgeClass = (status) => {
    const statusMap = {
      Open: 'badge-open',
      'In Progress': 'badge-in-progress',
      Resolved: 'badge-pending',
      Closed: 'badge-closed',
    };
    return statusMap[status] || 'badge-closed';
  };

  const getPriorityBadgeClass = (priority) => {
    const priorityMap = {
      Critical: 'badge-critical',
      High: 'badge-high',
      Medium: 'badge-medium',
      Low: 'badge-low',
    };
    return priorityMap[priority] || 'badge-low';
  };

  if (loading) {
    return <div className="spinner">Loading tickets...</div>;
  }

  return (
    <div style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Tickets</h1>
          <p className="page-welcome">Manage and track your tickets</p>
        </div>
        {(user?.role === 'Client' || user?.role === 'Engineer') && (
          <button className="btn btn-primary" onClick={handleCreateNew} style={{ height: 'fit-content', marginTop: '8px' }}>
            + New Ticket
          </button>
        )}
      </div>

      <div className="page-content-wrapper">
        {error && <div className="alert alert-danger">{error}</div>}

      <div className="card">
        <div className="filter-grid">
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="status-filter">Status</label>
            <select
              id="status-filter"
              className="form-select"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">All Statuses</option>
              <option value="1">Open</option>
              <option value="2">In Progress</option>
              <option value="3">Resolved</option>
              <option value="4">Closed</option>
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="priority-filter">Priority</label>
            <select
              id="priority-filter"
              className="form-select"
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
            >
              <option value="">All Priorities</option>
              <option value="1">Critical</option>
              <option value="2">High</option>
              <option value="3">Medium</option>
              <option value="4">Low</option>
            </select>
          </div>
        </div>
      </div>

      {tickets.length > 0 ? (
        <div className="card">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '8%' }}>ID</th>
                  <th style={{ width: '30%' }}>Title</th>
                  <th style={{ width: '12%' }}>Status</th>
                  <th style={{ width: '12%' }}>Priority</th>
                  <th style={{ width: '18%' }}>Created</th>
                  <th style={{ width: '12%' }}>SLA</th>
                  <th style={{ width: '8%' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => {
                  const slaState = getSLAState(ticket.SLADeadline);
                  const slaColor = slaState.isOverdue
                    ? 'var(--danger)'
                    : slaState.tone === 'warning'
                      ? 'var(--warning)'
                      : 'var(--success)';

                  return (
                    <tr
                      key={ticket.TicketID}
                      onClick={() => navigate(`/tickets/${ticket.TicketID}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td style={{ fontWeight: '700', color: 'var(--primary)' }}>#{ticket.TicketID}</td>
                      <td className="ticket-title">{ticket.Title}</td>
                      <td>
                        <span className={`badge ${getStatusBadgeClass(ticket.StatusName)}`}>
                          {ticket.StatusName}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${getPriorityBadgeClass(ticket.PriorityName)}`}>
                          {ticket.PriorityName}
                        </span>
                      </td>
                      <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{formatDate(ticket.CreatedAt)}</td>
                      <td style={{ fontWeight: '600', color: slaColor }}>{slaState.label}</td>
                      <td>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/tickets/${ticket.TicketID}`);
                          }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>#</div>
          <p style={{ color: 'var(--text-muted)', fontSize: '16px', margin: 0 }}>No tickets found</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '8px' }}>
            Try adjusting your filters or create a new ticket
          </p>
        </div>
      )}
      </div>
    </div>
  );
};

export default TicketList;
