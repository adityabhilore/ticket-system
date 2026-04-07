import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import useAuth from '../../hooks/useAuth';

const timeAgo = (date) => {
  const diff = new Date() - new Date(date);
  const m = Math.floor(diff / 6e4);
  const h = Math.floor(diff / 36e5);
  const d = Math.floor(diff / 864e5);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
};

export default function TicketActivityLog() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';
  const [ticket, setTicket] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivity();
  }, [id]);

  const fetchActivity = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/tickets/${id}`);
      const data = res.data.data || {};
      setTicket(data.ticket || null);
      setAuditLogs(data.auditLogs || []);
    } catch (err) {
      console.error('Failed to fetch activity log:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '32px 36px', fontFamily: 'Inter,-apple-system,sans-serif', background: '#F8FAFC', minHeight: '100vh' }}>
      <button
        onClick={() => navigate(isAdmin ? `/admin/tickets/${id}` : `/tickets/${id}`)}
        style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: '#6B7280', fontSize: '13px', fontWeight: '500', cursor: 'pointer', padding: '0', marginBottom: '16px', fontFamily: 'inherit' }}
      >
        ← Back to Ticket
      </button>

      <div style={{ marginBottom: '16px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#1E293B', margin: '0 0 6px' }}>
          Activity Log {ticket ? `· #${ticket.TicketID}` : ''}
        </h1>
        <div style={{ fontSize: '13px', color: '#6B7280' }}>
          {ticket?.Title || 'Ticket updates and timeline'}
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        {loading ? (
          <div style={{ padding: '20px', color: '#9CA3AF', textAlign: 'center' }}>Loading activity...</div>
        ) : auditLogs.length === 0 ? (
          <div style={{ padding: '20px', color: '#9CA3AF', textAlign: 'center' }}>No activity found</div>
        ) : (
          <div style={{ padding: '10px 18px' }}>
            {auditLogs.map((log, idx) => (
              <div key={log.LogID || idx} style={{ display: 'flex', gap: '10px', padding: '12px 0', borderBottom: idx < auditLogs.length - 1 ? '1px solid #F1F5F9' : 'none' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#C7D2FE', flexShrink: 0, marginTop: '4px' }} />
                <div>
                  <div style={{ fontSize: '13px', color: '#1E293B' }}>
                    <span style={{ fontWeight: '700' }}>{log.UserName || 'System'}</span>{' '}
                    <span>{log.Action}</span>
                    {log.NewValue ? <span style={{ color: '#6B7280' }}> → {log.NewValue}</span> : null}
                  </div>
                  <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>{timeAgo(log.CreatedAt)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
