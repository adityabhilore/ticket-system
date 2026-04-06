import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import '../styles/notifications.css';

export default function Notifications() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const PAGE_SIZE = 25;

  // Comments state
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [typeFilter, setTypeFilter] = useState('all');
  const [readFilter, setReadFilter] = useState('all');
  const [searchText, setSearchText] = useState('');

  // Fetch comment notifications on mount
  useEffect(() => {
    fetchNotifications(1, false);
  }, []);

  const fetchNotifications = async (targetPage = 1, append = false) => {
    try {
      const res = await api.get('/auth/notifications', {
        params: { page: targetPage, limit: PAGE_SIZE },
      });

      const rawData = res.data?.data || res.data || [];
      const allItems = Array.isArray(rawData) ? rawData : [];
      const hasServerPagination =
        typeof res.data?.hasMore === 'boolean' || typeof res.data?.total === 'number';

      if (hasServerPagination) {
        setNotifications((prev) => (append ? [...prev, ...allItems] : allItems));
        setHasMore(Boolean(res.data?.hasMore));
      } else {
        // Fallback: older backend may return full notification history without paging metadata.
        const start = (targetPage - 1) * PAGE_SIZE;
        const pageData = allItems.slice(start, start + PAGE_SIZE);
        setNotifications((prev) => (append ? [...prev, ...pageData] : pageData));
        setHasMore(start + pageData.length < allItems.length);
      }

      setPage(targetPage);
    } catch(err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    fetchNotifications(page + 1, true);
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await api.put(`/auth/notifications/${notificationId}/read`);
      setNotifications(prev =>
        prev.map(n => n.NotificationID === notificationId ? { ...n, IsRead: 1 } : n)
      );
    } catch(err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleNotificationClick = async (notif) => {
    try {
      if (!notif.IsRead) {
        await handleMarkAsRead(notif.NotificationID);
      }

      if (notif.TicketID) {
        if (user?.role === 'Admin') {
          navigate(`/admin/tickets/${notif.TicketID}`);
        } else {
          navigate(`/tickets/${notif.TicketID}`);
        }
      }
    } catch (err) {
      console.error('Failed to open notification:', err);
    }
  };

  const filteredNotifications = notifications.filter((notif) => {
    const matchesType = typeFilter === 'all' || String(notif.Type || '').toLowerCase() === typeFilter;

    const isUnread = !notif.IsRead;
    const matchesRead =
      readFilter === 'all' ||
      (readFilter === 'unread' && isUnread) ||
      (readFilter === 'read' && !isUnread);

    const query = searchText.trim().toLowerCase();
    const haystack = `${notif.Title || ''} ${notif.Message || ''} ${notif.TicketID || ''}`.toLowerCase();
    const matchesSearch = !query || haystack.includes(query);

    return matchesType && matchesRead && matchesSearch;
  });

  const getTypeStyle = (type) => {
    const styles = {
      assigned: { color: '#2563EB', bg: '#DBEAFE' },
      created: { color: '#4F46E5', bg: '#EEF2FF' },
      reassigned: { color: '#3B82F6', bg: '#DBEAFE' },
      commented: { color: '#10B981', bg: '#DCFCE7' },
      sla_breach: { color: '#DC2626', bg: '#FEE2E2' },
    };
    return styles[type] || { color: '#6B7280', bg: '#F3F4F6' };
  };

  const formatType = (type) =>
    String(type || '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (ch) => ch.toUpperCase());

  return (
    <div style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-welcome">Stay updated with your ticket notifications</p>
        </div>
      </div>

      {/* TAB NAVIGATION */}
      <div style={{ 
        display: 'flex', 
        gap: '0px',
        borderBottom: '2px solid #E5E7EB',
        background: '#fff',
        padding: '0 20px'
      }}>
      </div>

      <div className="page-content-wrapper">
        {/* ==================== NOTIFICATIONS ==================== */}
        {!loading && notifications.length > 0 && (
              <div className="notifications-filter-grid" style={{ marginBottom: '14px' }}>
                <input
                  className="notifications-filter-input"
                  type="text"
                  placeholder="Search by ticket #, title, or message"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  style={{
                    padding: '10px 12px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />

                <select
                  className="notifications-filter-select"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  style={{
                    padding: '10px 12px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '13px',
                    outline: 'none',
                    background: '#fff',
                  }}
                >
                  <option value="all">All Types</option>
                  <option value="assigned">Assigned</option>
                  <option value="reassigned">Reassigned</option>
                  <option value="commented">Commented</option>
                  <option value="created">Created</option>
                  <option value="sla_breach">SLA Breach</option>
                </select>

                <select
                  className="notifications-filter-select"
                  value={readFilter}
                  onChange={(e) => setReadFilter(e.target.value)}
                  style={{
                    padding: '10px 12px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '13px',
                    outline: 'none',
                    background: '#fff',
                  }}
                >
                  <option value="all">All</option>
                  <option value="unread">Unread</option>
                  <option value="read">Read</option>
                </select>

                <button
                  className="notifications-filter-reset"
                  type="button"
                  onClick={() => {
                    setTypeFilter('all');
                    setReadFilter('all');
                    setSearchText('');
                  }}
                  style={{
                    padding: '10px 12px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    background: '#fff',
                    fontSize: '13px',
                    cursor: 'pointer',
                    color: '#374151',
                  }}
                >
                  Reset
                </button>
              </div>
            )}

            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
                Loading...
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
                No comment notifications yet
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
                No notifications match the selected filters
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filteredNotifications.map((notif, index) => {
                  const typeStyle = getTypeStyle(notif.Type);
                  return (
                    <div
                      key={notif.NotificationID}
                      onClick={() => handleNotificationClick(notif)}
                      style={{
                        padding: '16px',
                        border: `1px solid ${notif.IsRead ? '#E5E7EB' : '#D1D5DB'}`,
                        borderRadius: '8px',
                        background: notif.IsRead ? '#fff' : '#F9FAFB',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                      }}
                    >
                      <div
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: '#EEF2FF',
                          color: '#4F46E5',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: '700',
                          flexShrink: 0,
                          marginTop: '2px',
                        }}
                      >
                        {index + 1}
                      </div>

                      <div
                        style={{
                          padding: '6px 12px',
                          background: typeStyle.bg,
                          color: typeStyle.color,
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          flexShrink: 0,
                          whiteSpace: 'nowrap',
                          minWidth: '80px',
                          textAlign: 'center',
                        }}
                      >
                        {formatType(notif.Type)}
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#1F2937', margin: 0 }}>
                            {notif.Title}
                          </h3>
                          {!notif.IsRead && (
                            <div
                              style={{
                                width: '8px',
                                height: '8px',
                                background: '#3B82F6',
                                borderRadius: '50%',
                              }}
                            />
                          )}
                        </div>
                        <p style={{ fontSize: '13px', color: '#6B7280', margin: '4px 0 0 0' }}>
                          {notif.Message}
                        </p>
                        <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '8px 0 0 0' }}>
                          {new Date(notif.CreatedAt).toLocaleString()}
                        </p>
                      </div>

                      {!notif.IsRead && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(notif.NotificationID);
                          }}
                          style={{
                            padding: '6px 12px',
                            background: '#3B82F6',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '500',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Mark Read
                        </button>
                      )}
                    </div>
                  );
                })}

                {hasMore && (
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '6px' }}>
                    <button
                      type="button"
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      style={{
                        padding: '10px 16px',
                        borderRadius: '8px',
                        border: '1px solid #D1D5DB',
                        background: '#fff',
                        color: '#374151',
                        cursor: loadingMore ? 'not-allowed' : 'pointer',
                        fontSize: '13px',
                        fontWeight: '600',
                      }}
                    >
                      {loadingMore ? 'Loading...' : 'Load More'}
                    </button>
                  </div>
                )}
              </div>
            )}
      </div>
    </div>
  );
}
