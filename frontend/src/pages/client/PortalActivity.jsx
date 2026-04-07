import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const getTicketId = (item) => item?.TicketId || item?.TicketID || null;

const timeAgo = (date) => {
  const diff = new Date() - new Date(date);
  const mins = Math.floor(diff / 6e4);
  const hrs = Math.floor(diff / 36e5);
  const days = Math.floor(diff / 864e5);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  return `${days}d ago`;
};

export default function PortalActivity() {
  const navigate = useNavigate();
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchActivity = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/tickets/activity?all=true');
      setActivity(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      console.error('Failed to fetch activity', err);
      setActivity([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  return (
    <div className="portal-page">
      <div className="portal-page-header">
        <div>
          <h1 className="portal-page-title">All Recent Activity</h1>
          <p className="portal-page-sub">Showing complete activity history for your company tickets</p>
        </div>
        <button className="portal-btn-primary" onClick={() => navigate('/client')}>
          â† Back to Dashboard
        </button>
      </div>

      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '20px 22px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '24px', color: '#9CA3AF', fontSize: '14px' }}>
            Loading activity...
          </div>
        ) : activity.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: '#9CA3AF', fontSize: '14px' }}>
            No activity found.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {activity.map((item, idx) => {
              const ticketId = getTicketId(item);
              return (
                <div
                  key={`${item.LogID || idx}-${item.CreatedAt || ''}`}
                  onClick={() => ticketId && navigate(`/client/tickets/${ticketId}`)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '12px 0',
                    borderBottom: idx < activity.length - 1 ? '1px solid #F1F5F9' : 'none',
                    cursor: ticketId ? 'pointer' : 'default',
                    transition: 'all 0.12s',
                  }}
                  onMouseEnter={(e) => ticketId && (e.currentTarget.style.paddingLeft = '4px')}
                  onMouseLeave={(e) => (e.currentTarget.style.paddingLeft = '0')}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: '#EEF2FF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '1px',
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
                    </svg>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', color: '#374151', lineHeight: '1.5' }}>
                      <strong>{item.UserName || 'Support team'}</strong> {item.Action || 'updated ticket'}{' '}
                      {item.TicketTitle && (
                        <span style={{ color: '#4F46E5', fontWeight: '600' }}>
                          "{item.TicketTitle}"
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px', display: 'flex', gap: '10px' }}>
                      <span>{timeAgo(item.CreatedAt)}</span>
                      {ticketId && <span>Ticket #{ticketId}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

