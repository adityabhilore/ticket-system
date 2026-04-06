import React, { useState, useEffect } from 'react';
import ticketService from '../services/ticketService';
import { showError } from '../utils/helpers';
import '../styles/main.css';

const Overdue = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchOverdueTickets();
  }, []);

  const fetchOverdueTickets = async () => {
    try {
      setLoading(true);
      setError('');
      // Get all tickets and filter for overdue ones
      const response = await ticketService.getTickets();
      const now = new Date();
      const overdueTickets = (response || []).filter((ticket) => {
        const status = String(ticket?.StatusName || '').toLowerCase();
        const isClosedLike = status === 'resolved' || status === 'closed';

        const isFlaggedOverdue =
          ticket?.IsOverdue === true ||
          ticket?.IsOverdue === 1 ||
          String(ticket?.IsOverdue).toLowerCase() === 'true';

        const missedDeadline = ticket?.SLADeadline
          ? new Date(ticket.SLADeadline) < now
          : false;

        return !isClosedLike && (isFlaggedOverdue || missedDeadline);
      });
      setTickets(overdueTickets);
    } catch (err) {
      setError(showError(err));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="spinner">Loading overdue tickets...</div>;
  }

  return (
    <div style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Overdue Tickets</h1>
          <p className="page-welcome">Tickets that have exceeded SLA deadline</p>
        </div>
      </div>

      <div className="page-content-wrapper">
        {error && (
          <div className="alert alert-danger">
            {error}
          </div>
        )}

      {/* Overdue Tickets Table */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">SLA Breached Tickets</h2>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '13px' }}>
            {tickets.length} ticket{tickets.length !== 1 ? 's' : ''} need immediate attention
          </p>
        </div>

        {tickets.length > 0 ? (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Ticket ID</th>
                  <th>Title</th>
                  <th>Priority</th>
                  <th>Company</th>
                  <th>Days Overdue</th>
                  <th>Assigned To</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => {
                  const daysOverdue = Math.floor(
                    (new Date() - new Date(ticket.SLADeadline)) / (1000 * 60 * 60 * 24)
                  );

                  return (
                    <tr key={ticket.TicketID} style={{ cursor: 'pointer' }}>
                      <td>#{ticket.TicketID}</td>
                      <td>{ticket.Title}</td>
                      <td>
                        <span className={`badge badge-${ticket.PriorityName?.toLowerCase()}`}>
                          {ticket.PriorityName}
                        </span>
                      </td>
                      <td>{ticket.CompanyName}</td>
                      <td style={{ color: '#EF4444', fontWeight: '600' }}>
                        {daysOverdue} day{daysOverdue !== 1 ? 's' : ''}
                      </td>
                      <td>{ticket.AssignedToName || 'Unassigned'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>✅ No overdue tickets!</p>
            <p>All tickets are within their SLA deadlines.</p>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default Overdue;
