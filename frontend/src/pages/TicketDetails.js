import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import ticketService from '../services/ticketService';
import userService from '../services/userService';
import { formatDate, getSLAState, showError } from '../utils/helpers';
import '../styles/main.css';

const STATUS_STEPS = [
  { id: 1, label: 'Open' },
  { id: 2, label: 'In Progress' },
  { id: 3, label: 'On Hold' },
  { id: 4, label: 'Resolved' },
  { id: 5, label: 'Closed' },
];

const TicketDetails = () => {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [ticket, setTicket] = useState(null);
  const [engineers, setEngineers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedEngineer, setSelectedEngineer] = useState('');
  const [, setCurrentTime] = useState(Date.now());

  const fetchTicketDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await ticketService.getTicketDetails(ticketId);
      setTicket(data);
      setSelectedStatus(String(data.StatusID));
    } catch (err) {
      setError(showError(err));
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  const fetchEngineers = useCallback(async () => {
    try {
      const data = await userService.getEngineers();
      setEngineers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching engineers:', err);
    }
  }, []);

  useEffect(() => {
    fetchTicketDetails();
    if (user?.role !== 'Client') {
      fetchEngineers();
    }
  }, [fetchEngineers, fetchTicketDetails, user?.role]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000);

    return () => window.clearInterval(timer);
  }, []);

  const handleStatusChange = async () => {
    if (!selectedStatus || !ticket || String(selectedStatus) === String(ticket.StatusID)) {
      return;
    }

    try {
      setSubmitting(true);
      await ticketService.updateTicketStatus(ticketId, selectedStatus);
      await fetchTicketDetails();
    } catch (err) {
      setError(showError(err));
      setSelectedStatus(String(ticket.StatusID));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignEngineer = async () => {
    if (!selectedEngineer || !ticket) {
      return;
    }

    try {
      setSubmitting(true);
      await ticketService.assignTicket(ticketId, selectedEngineer);
      await fetchTicketDetails();
      setSelectedEngineer('');
    } catch (err) {
      setError(showError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) {
      setError('Comment cannot be empty');
      return;
    }

    try {
      setSubmitting(true);
      await ticketService.addComment(ticketId, commentText, false);
      setCommentText('');
      await fetchTicketDetails();
    } catch (err) {
      setError(showError(err));
    } finally {
      setSubmitting(false);
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
    return <div className="spinner">Loading ticket details...</div>;
  }

  if (!ticket) {
    return (
      <div>
        <button className="btn btn-secondary" onClick={() => navigate('/tickets')} style={{ marginBottom: '16px' }}>
          Back to Tickets
        </button>
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
          <p style={{ color: 'var(--text-secondary)' }}>Ticket not found</p>
        </div>
      </div>
    );
  }

  const slaState = getSLAState(ticket.SLADeadline);
  const slaToneClass = slaState.tone === 'warning' ? 'warning' : slaState.isOverdue ? 'critical' : 'healthy';

  return (
    <div>
      <button className="btn btn-secondary" onClick={() => navigate('/tickets')} style={{ marginBottom: '24px' }}>
        Back to Tickets
      </button>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="ticket-detail-wrapper">
        <div className="ticket-main">
          <div className="card">
            <div className="card-header">
              <div>
                <h1 className="page-title" style={{ marginBottom: '8px' }}>
                  #{ticket.TicketID} {ticket.Title}
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
                  Created by <strong>{ticket.CreatedByName}</strong> on {formatDate(ticket.CreatedAt)}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span className={`badge ${getStatusBadgeClass(ticket.StatusName)}`}>{ticket.StatusName}</span>
                <span className={`badge ${getPriorityBadgeClass(ticket.PriorityName)}`}>{ticket.PriorityName}</span>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ marginBottom: '12px', marginTop: 0 }}>Description</h3>
              <p style={{ whiteSpace: 'pre-wrap', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: 0 }}>
                {ticket.Description}
              </p>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ marginBottom: '12px', marginTop: 0 }}>Status Tracker</h3>
              <div className="status-tracker">
                {STATUS_STEPS.map((step, index) => {
                  const isComplete = Number(ticket.StatusID) >= step.id;
                  const isCurrent = Number(ticket.StatusID) === step.id;

                  return (
                    <div key={step.id} className="status-step">
                      <div className={`status-dot ${isComplete ? 'complete' : ''} ${isCurrent ? 'current' : ''}`}>
                        {index + 1}
                      </div>
                      <div className="status-step-copy">
                        <div className="status-step-label">{step.label}</div>
                        <div className="status-step-meta">
                          {isCurrent ? 'Current stage' : isComplete ? 'Completed' : 'Pending'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {ticket.attachments && ticket.attachments.length > 0 && (
              <div>
                <h3 style={{ marginBottom: '12px', marginTop: 0 }}>Attachments</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {ticket.attachments.map((attachment) => (
                    <a
                      key={attachment.AttachmentID}
                      href={attachment.FilePath}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        padding: '8px 12px',
                        border: '1px solid var(--border)',
                        borderRadius: '6px',
                        color: 'var(--primary)',
                        textDecoration: 'none',
                        fontSize: '13px',
                        fontWeight: '500',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {attachment.FileName}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Comments & Activity</h2>
            </div>

            <div style={{ marginBottom: '24px', maxHeight: '600px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {ticket.comments && ticket.comments.length > 0 ? (
                ticket.comments.map((comment) => (
                  <div key={comment.CommentID} className="comment-item">
                    <div className="comment-header">
                      <div>
                        <div className="comment-author">{comment.UserName}</div>
                        <div className="comment-timestamp">{formatDate(comment.CreatedAt)}</div>
                      </div>
                      <span className="comment-visibility">Public</span>
                    </div>
                    <p className="comment-text">{comment.CommentText}</p>
                  </div>
                ))
              ) : (
                <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', padding: '24px 0', margin: 0 }}>
                  No comments yet. Be the first to comment!
                </p>
              )}
            </div>

            {(user?.role === 'Client' || user?.role === 'Engineer' || user?.role === 'Manager') && (
              <form onSubmit={handleAddComment} style={{ borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
                <div className="form-group">
                  <label htmlFor="comment" style={{ marginBottom: '8px' }}>Add a public comment</label>
                  <textarea
                    id="comment"
                    className="form-textarea"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Share your thoughts or provide an update..."
                    disabled={submitting}
                    style={{ maxHeight: '120px' }}
                  />
                </div>

                <button type="submit" className="btn btn-primary" disabled={submitting || !commentText.trim()}>
                  {submitting ? 'Adding...' : 'Post Comment'}
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="ticket-sidebar">
          <div className="sidebar-box">
            <label className="sidebar-box-title">SLA Status</label>
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '6px' }}>
                Deadline
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '500' }}>
                {formatDate(ticket.SLADeadline)}
              </div>
            </div>
            <span className={`sla-timer ${slaToneClass}`}>{slaState.label}</span>
          </div>

          <div className="sidebar-box">
            <label className="sidebar-box-title">Ticket Details</label>

            <div className="sidebar-item">
              <span className="sidebar-label">Company</span>
              <span className="sidebar-value">{ticket.CompanyName || 'N/A'}</span>
            </div>

            <div className="sidebar-item">
              <span className="sidebar-label">Status</span>
              <span className={`badge ${getStatusBadgeClass(ticket.StatusName)}`}>{ticket.StatusName}</span>
            </div>

            <div className="sidebar-item">
              <span className="sidebar-label">Priority</span>
              <span className={`badge ${getPriorityBadgeClass(ticket.PriorityName)}`}>{ticket.PriorityName}</span>
            </div>

            <div className="sidebar-item" style={{ borderBottom: 'none' }}>
              <span className="sidebar-label">Assigned</span>
              <span className="sidebar-value">{ticket.AssignedToName || 'Unassigned'}</span>
            </div>
          </div>

          {(user?.role === 'Engineer' || user?.role === 'Manager') && (
            <div className="sidebar-box">
              <label className="sidebar-box-title">Management</label>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '6px', display: 'block' }}>
                  Change Status
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    disabled={submitting}
                    className="form-select"
                    style={{ flex: 1, padding: '6px 8px', fontSize: '13px' }}
                  >
                    <option value="1">Open</option>
                    <option value="2">In Progress</option>
                    <option value="3">On Hold</option>
                    <option value="4">Resolved</option>
                    <option value="5">Closed</option>
                  </select>
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={handleStatusChange}
                    disabled={submitting || String(selectedStatus) === String(ticket.StatusID)}
                    style={{ padding: '6px 12px' }}
                  >
                    Update
                  </button>
                </div>
              </div>

              {user?.role === 'Manager' && (
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '6px', display: 'block' }}>
                    Assign Engineer
                  </label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <select
                      value={selectedEngineer}
                      onChange={(e) => setSelectedEngineer(e.target.value)}
                      disabled={submitting}
                      className="form-select"
                      style={{ flex: 1, padding: '6px 8px', fontSize: '13px' }}
                    >
                      <option value="">Select...</option>
                      {engineers.map((engineer) => (
                        <option key={engineer.UserID} value={engineer.UserID}>
                          {engineer.Name}
                        </option>
                      ))}
                    </select>
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={handleAssignEngineer}
                      disabled={submitting || !selectedEngineer}
                      style={{ padding: '6px 12px' }}
                    >
                      Assign
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TicketDetails;
