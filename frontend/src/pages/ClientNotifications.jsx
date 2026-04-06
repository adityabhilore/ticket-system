import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import '../styles/notifications.css';

export default function ClientNotifications() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const PAGE_SIZE = 25;

  // Tab state
  const [activeTab, setActiveTab] = useState('comments');

  // Comments state
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [typeFilter, setTypeFilter] = useState('all');
  const [readFilter, setReadFilter] = useState('all');
  const [searchText, setSearchText] = useState('');

  // Email notifications state
  const [emailNotifications, setEmailNotifications] = useState([]);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailLoadingMore, setEmailLoadingMore] = useState(false);
  const [emailPage, setEmailPage] = useState(1);
  const [emailHasMore, setEmailHasMore] = useState(false);
  const [emailTotalCount, setEmailTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [emailSearchText, setEmailSearchText] = useState('');

  // Fetch comment notifications
  useEffect(() => {
    if (activeTab === 'comments') {
      fetchNotifications(1, false);
    }
  }, [activeTab]);

  // Fetch email notifications
  useEffect(() => {
    if (activeTab === 'emails') {
      fetchEmailNotifications(1, false);
    }
  }, [activeTab]);

  const fetchNotifications = async (targetPage = 1, append = false) => {
    try {
      setLoading(true);
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
        setTotalCount(Number(res.data?.total || allItems.length));
      } else {
        const start = (targetPage - 1) * PAGE_SIZE;
        const pageData = allItems.slice(start, start + PAGE_SIZE);
        setNotifications((prev) => (append ? [...prev, ...pageData] : pageData));
        setHasMore(start + pageData.length < allItems.length);
        setTotalCount(allItems.length);
      }

      setPage(targetPage);
    } catch (err) {
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
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const handleNotificationClick = async (notif) => {
    try {
      if (!notif.IsRead) {
        await handleMarkAsRead(notif.NotificationID);
      }

      if (notif.TicketID) {
        navigate(`/tickets/${notif.TicketID}`);
      }
    } catch (err) {
      console.error('Failed to open notification:', err);
    }
  };

  // ==================== EMAIL NOTIFICATIONS FUNCTIONS ====================

  const fetchEmailNotifications = async (targetPage = 1, append = false) => {
    try {
      setEmailLoading(true);
      const res = await api.get('/auth/email-notifications', {
        params: {
          page: targetPage,
          limit: PAGE_SIZE,
          status: statusFilter !== 'all' ? statusFilter : 'all',
        },
      });

      const rawData = res.data?.data || [];
      const pageInfo = res.data?.pagination || {};

      if (append) {
        setEmailNotifications((prev) => [...prev, ...rawData]);
      } else {
        setEmailNotifications(rawData);
      }

      setEmailHasMore(pageInfo.page < pageInfo.pages);
      setEmailTotalCount(pageInfo.total || 0);
      setEmailPage(targetPage);
    } catch (err) {
      console.error('Failed to fetch email notifications:', err);
    } finally {
      setEmailLoading(false);
      setEmailLoadingMore(false);
    }
  };

  const handleEmailLoadMore = () => {
    if (!emailHasMore || emailLoadingMore) return;
    setEmailLoadingMore(true);
    fetchEmailNotifications(emailPage + 1, true);
  };

  const getStatusBadge = (status) => {
    const styles = {
      SENT: { color: '#10B981', bg: '#DCFCE7', label: '✓ Sent' },
      FAILED: { color: '#DC2626', bg: '#FEE2E2', label: '✗ Failed' },
      PENDING: { color: '#F59E0B', bg: '#FEF3C7', label: '⏳ Pending' },
    };
    return styles[status] || { color: '#6B7280', bg: '#F3F4F6', label: status };
  };

  const handleEmailTicketClick = (ticketId) => {
    navigate(`/tickets/${ticketId}`);
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

  const filteredEmailNotifications = emailNotifications.filter((email) => {
    const matchesStatus = statusFilter === 'all' || email.Status === statusFilter;

    const query = emailSearchText.trim().toLowerCase();
    const haystack = `${email.TicketID || ''} ${email.RecipientEmail || ''} ${email.Subject || ''}`.toLowerCase();
    const matchesSearch = !query || haystack.includes(query);

    return matchesStatus && matchesSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
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
        <button
          onClick={() => {
            setActiveTab('comments');
            setEmailPage(1);
          }}
          style={{
            padding: '14px 20px',
            border: 'none',
            borderBottom: activeTab === 'comments' ? '3px solid #2563EB' : 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: activeTab === 'comments' ? '#2563EB' : '#6B7280',
            fontWeight: activeTab === 'comments' ? '600' : '500',
            fontSize: '14px',
            transition: 'all 0.2s',
          }}
        >
          💬 Comments ({notifications.length})
        </button>

        <button
          onClick={() => {
            setActiveTab('emails');
            setPage(1);
          }}
          style={{
            padding: '14px 20px',
            border: 'none',
            borderBottom: activeTab === 'emails' ? '3px solid #2563EB' : 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: activeTab === 'emails' ? '#2563EB' : '#6B7280',
            fontWeight: activeTab === 'emails' ? '600' : '500',
            fontSize: '14px',
            transition: 'all 0.2s',
          }}
        >
          📧 Emails ({emailTotalCount})
        </button>
      </div>

      {/* TAB CONTENT */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {activeTab === 'comments' && (
          <>
            {/* COMMENTS TAB FILTERS */}
            {notifications.length > 0 && (
              <div style={{
                display: 'flex',
                gap: '12px',
                marginBottom: '16px',
                flexWrap: 'wrap',
                alignItems: 'center',
              }}>
                <input
                  type="text"
                  placeholder="Search notifications..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  style={{
                    padding: '10px 12px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '13px',
                    outline: 'none',
                    flex: '1',
                    minWidth: '200px',
                  }}
                />

                <select
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
                {filteredNotifications.map((notif) => {
                  const typeStyle = getTypeStyle(notif.Type);
                  return (
                    <div
                      key={notif.NotificationID}
                      onClick={() => handleNotificationClick(notif)}
                      style={{
                        padding: '14px',
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px',
                        background: notif.IsRead ? '#fff' : '#F0F9FF',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                        e.currentTarget.style.borderColor = typeStyle.color;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.borderColor = '#E5E7EB';
                      }}
                    >
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        <div
                          style={{
                            padding: '6px 12px',
                            borderRadius: '20px',
                            background: typeStyle.bg,
                            color: typeStyle.color,
                            fontSize: '11px',
                            fontWeight: '600',
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                          }}
                        >
                          {formatType(notif.Type)}
                        </div>

                        <div style={{ flex: 1 }}>
                          <div style={{ marginBottom: '4px' }}>
                            <span style={{ fontWeight: '600', color: '#111' }}>
                              Ticket #{notif.TicketID}
                            </span>
                          </div>
                          <div style={{ fontSize: '13px', color: '#4B5563', marginBottom: '4px' }}>
                            {notif.Title}
                          </div>
                          <div style={{ fontSize: '12px', color: '#6B7280', marginBottom: '4px' }}>
                            {notif.Message}
                          </div>
                          <div
                            style={{
                              fontSize: '11px',
                              color: '#9CA3AF',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <span>
                              {notif.CreatedAt
                                ? new Date(notif.CreatedAt).toLocaleString()
                                : 'Just now'}
                            </span>
                            {!notif.IsRead && (
                              <span style={{ color: '#2563EB', fontWeight: '600' }}>● New</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {hasMore && (
                  <button
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    style={{
                      padding: '10px',
                      marginTop: '12px',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      background: '#fff',
                      cursor: 'pointer',
                      color: '#2563EB',
                      fontSize: '13px',
                      fontWeight: '600',
                    }}
                  >
                    {loadingMore ? 'Loading...' : 'Load More'}
                  </button>
                )}
              </div>
            )}
          </>
        )}

        {activeTab === 'emails' && (
          <>
            {/* EMAIL NOTIFICATIONS FILTERS */}
            {emailNotifications.length > 0 && (
              <div style={{
                display: 'flex',
                gap: '12px',
                marginBottom: '16px',
                flexWrap: 'wrap',
                alignItems: 'center',
              }}>
                <input
                  type="text"
                  placeholder="Search emails by ticket, recipient..."
                  value={emailSearchText}
                  onChange={(e) => setEmailSearchText(e.target.value)}
                  style={{
                    padding: '10px 12px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '13px',
                    outline: 'none',
                    flex: '1',
                    minWidth: '200px',
                  }}
                />

                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setEmailPage(1);
                    fetchEmailNotifications(1, false);
                  }}
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
                  <option value="SENT">Sent</option>
                  <option value="FAILED">Failed</option>
                  <option value="PENDING">Pending</option>
                </select>

                <button
                  type="button"
                  onClick={() => {
                    setStatusFilter('all');
                    setEmailSearchText('');
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

            {emailLoading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
                Loading email notifications...
              </div>
            ) : emailNotifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
                No email notifications yet
              </div>
            ) : filteredEmailNotifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
                No emails match the search filters
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filteredEmailNotifications.map((email) => {
                  const statusStyle = getStatusBadge(email.Status);
                  return (
                    <div
                      key={email.NotificationID}
                      onClick={() => email.TicketID && handleEmailTicketClick(email.TicketID)}
                      style={{
                        padding: '14px',
                        border: '1px solid #E5E7EB',
                        borderRadius: '8px',
                        background: '#fff',
                        cursor: email.TicketID ? 'pointer' : 'default',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <div
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: statusStyle.bg,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: statusStyle.color,
                          fontSize: '12px',
                          fontWeight: '700',
                          flexShrink: 0,
                        }}
                      >
                        {email.Status === 'SENT' ? '✓' : email.Status === 'FAILED' ? '✗' : '⏳'}
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          marginBottom: '8px',
                        }}>
                          <div
                            style={{
                              padding: '4px 10px',
                              borderRadius: '12px',
                              background: statusStyle.bg,
                              color: statusStyle.color,
                              fontSize: '11px',
                              fontWeight: '600',
                              flexShrink: 0,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {statusStyle.label}
                          </div>

                          <div style={{ flex: 1 }}>
                            <div style={{ marginBottom: '4px' }}>
                              <span style={{ fontWeight: '600', color: '#111' }}>
                                Ticket #{email.TicketID}
                              </span>
                              <span style={{ color: '#6B7280', marginLeft: '8px', fontSize: '13px' }}>
                                {email.TicketTitle}
                              </span>
                            </div>
                            <div style={{ fontSize: '12px', color: '#4B5563', marginBottom: '6px' }}>
                              📧 To: <strong>{email.RecipientEmail}</strong> ({email.RecipientRole})
                            </div>
                            <div style={{ fontSize: '12px', color: '#4B5563', marginBottom: '4px' }}>
                              Subject: {email.Subject}
                            </div>
                            {email.ErrorMessage && (
                              <div style={{ fontSize: '12px', color: '#DC2626', marginBottom: '4px' }}>
                                Error: {email.ErrorMessage}
                              </div>
                            )}
                            <div style={{ fontSize: '11px', color: '#9CA3AF' }}>
                              {email.SentAt ? new Date(email.SentAt).toLocaleString() : 'Not sent yet'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {emailHasMore && (
                  <button
                    onClick={handleEmailLoadMore}
                    disabled={emailLoadingMore}
                    style={{
                      padding: '10px',
                      marginTop: '12px',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      background: '#fff',
                      cursor: 'pointer',
                      color: '#2563EB',
                      fontSize: '13px',
                      fontWeight: '600',
                    }}
                  >
                    {emailLoadingMore ? 'Loading...' : 'Load More'}
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
