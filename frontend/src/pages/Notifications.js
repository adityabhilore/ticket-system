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
  
  // Email state
  const [activeTab, setActiveTab] = useState('comments'); // 'comments' or 'emails'
  const [emails, setEmails] = useState([]);
  const [emailsLoading, setEmailsLoading] = useState(false);
  const [emailPage, setEmailPage] = useState(1);
  const [emailHasMore, setEmailHasMore] = useState(false);
  const [emailSearchText, setEmailSearchText] = useState('');
  const [emailLoadingMore, setEmailLoadingMore] = useState(false);

  // Fetch notifications on mount
  useEffect(() => {
    if (activeTab === 'comments') {
      fetchNotifications(1, false);
    } else if (activeTab === 'emails') {
      fetchEmails(1, false);
    }
  }, [activeTab]);

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

  const fetchEmails = async (targetPage = 1, append = false) => {
    try {
      setEmailsLoading(true);
      const res = await api.get('/auth/inbound-emails', {
        params: { page: targetPage, limit: PAGE_SIZE },
      });

      const rawData = res.data?.data || res.data || [];
      const allItems = Array.isArray(rawData) ? rawData : [];
      const hasServerPagination =
        typeof res.data?.hasMore === 'boolean' || typeof res.data?.total === 'number';

      if (hasServerPagination) {
        setEmails((prev) => (append ? [...prev, ...allItems] : allItems));
        setEmailHasMore(Boolean(res.data?.hasMore));
      } else {
        const start = (targetPage - 1) * PAGE_SIZE;
        const pageData = allItems.slice(start, start + PAGE_SIZE);
        setEmails((prev) => (append ? [...prev, ...pageData] : pageData));
        setEmailHasMore(start + pageData.length < allItems.length);
      }

      setEmailPage(targetPage);
    } catch(err) {
      console.error('Failed to fetch emails:', err);
    } finally {
      setEmailsLoading(false);
      setEmailLoadingMore(false);
    }
  };

  const handleEmailLoadMore = () => {
    if (!emailHasMore || emailLoadingMore) return;
    setEmailLoadingMore(true);
    fetchEmails(emailPage + 1, true);
  };

  const handleEmailClick = (email) => {
    if (email.ticketId) {
      if (user?.role === 'Admin') {
        navigate(`/admin/tickets/${email.ticketId}`);
      } else {
        navigate(`/tickets/${email.ticketId}`);
      }
    }
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

  const getEmailTypeStyle = (templateType) => {
    const styles = {
      ticket_reopened: { color: '#EA580C', bg: '#FEF3C7' },
      ticket_assigned: { color: '#2563EB', bg: '#DBEAFE' },
      ticket_created: { color: '#4F46E5', bg: '#EEF2FF' },
      ticket_resolved: { color: '#10B981', bg: '#DCFCE7' },
    };
    return styles[templateType] || { color: '#6B7280', bg: '#F3F4F6' };
  };

  return (
    <div style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
      <style>{`
        @keyframes pulse {
          0%, 100% { 
            opacity: 1;
            box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);
          }
          50% { 
            opacity: 0.8;
            box-shadow: 0 4px 12px rgba(220, 38, 38, 0.5);
          }
        }
      `}</style>
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
          onClick={() => setActiveTab('comments')}
          style={{
            flex: 1,
            padding: '12px 16px',
            border: 'none',
            background: 'transparent',
            borderBottom: activeTab === 'comments' ? '3px solid #3B82F6' : '3px solid transparent',
            color: activeTab === 'comments' ? '#3B82F6' : '#6B7280',
            fontSize: '14px',
            fontWeight: activeTab === 'comments' ? '600' : '500',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          💬 Comments
        </button>
        <button
          onClick={() => setActiveTab('emails')}
          style={{
            flex: 1,
            padding: '12px 16px',
            border: 'none',
            background: 'transparent',
            borderBottom: activeTab === 'emails' ? '3px solid #3B82F6' : '3px solid transparent',
            color: activeTab === 'emails' ? '#3B82F6' : '#6B7280',
            fontSize: '14px',
            fontWeight: activeTab === 'emails' ? '600' : '500',
            cursor: 'pointer',
            transition: 'all 0.2s',
            position: 'relative',
          }}
        >
          📧 Mail
          {emails.length > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '2px',
                right: '4px',
                background: '#DC2626',
                color: '#fff',
                borderRadius: '50%',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: '700',
              }}
              title={`Email notifications: ${emails.length}`}
            >
              {emails.length > 99 ? '99+' : emails.length}
            </span>
          )}
        </button>
      </div>

      <div className="page-content-wrapper">
        {/* ==================== COMMENTS TAB ==================== */}
        {activeTab === 'comments' && (
          <>
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
                        background: '#3B82F6',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: loadingMore ? 'not-allowed' : 'pointer',
                        fontSize: '13px',
                        fontWeight: '500',
                        opacity: loadingMore ? 0.6 : 1,
                      }}
                    >
                      {loadingMore ? 'Loading...' : 'Load More'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ==================== EMAILS TAB ==================== */}
        {activeTab === 'emails' && (
          <>
            {!emailsLoading && emails.length > 0 && (
              <div className="notifications-filter-grid" style={{ marginBottom: '14px' }}>
                <input
                  className="notifications-filter-input"
                  type="text"
                  placeholder="Search by ticket #, subject, etc."
                  value={emailSearchText}
                  onChange={(e) => setEmailSearchText(e.target.value)}
                  style={{
                    padding: '10px 12px',
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    fontSize: '13px',
                    outline: 'none',
                  }}
                />
                <button
                  className="notifications-filter-reset"
                  type="button"
                  onClick={() => setEmailSearchText('')}
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

            {emailsLoading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
                Loading emails...
              </div>
            ) : emails.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
                No email notifications yet
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {emails
                  .filter((email) => {
                    const query = emailSearchText.trim().toLowerCase();
                    const haystack = `${email.subject || ''} ${email.ticketTitle || ''} ${email.message || ''}`.toLowerCase();
                    return !query || haystack.includes(query);
                  })
                  .map((email, index) => {
                    const isReopen = email.processType === 'reopen';
                    
                    return (
                      <div
                        key={email.id}
                        onClick={() => handleEmailClick(email)}
                        style={{
                          padding: '16px',
                          border: isReopen ? '3px solid #DC2626' : '1px solid #E5E7EB',
                          borderRadius: '8px',
                          background: isReopen ? '#FEF2F2' : '#F9FAFB',
                          cursor: 'pointer',
                          transition: 'all 0.3s',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '16px',
                        }}
                      >
                        {/* Email Icon */}
                        <div
                          style={{
                            width: '48px',
                            height: '48px',
                            minWidth: '48px',
                            borderRadius: '50%',
                            background: isReopen ? '#FEE2E2' : '#EFF6FF',
                            border: isReopen ? '2px solid #DC2626' : '2px solid #BFDBFE',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '24px',
                            flexShrink: 0,
                          }}
                        >
                          ✉️
                        </div>

                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {/* Badge */}
                          <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                            {isReopen && (
                              <span
                                style={{
                                  padding: '4px 12px',
                                  background: '#DC2626',
                                  color: '#fff',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  fontWeight: '700',
                                  whiteSpace: 'nowrap',
                                  textTransform: 'uppercase',
                                }}
                              >
                                🔄 Reopened via Email
                              </span>
                            )}
                            {email.processType === 'new_ticket' && (
                              <span
                                style={{
                                  padding: '4px 12px',
                                  background: '#4F46E5',
                                  color: '#fff',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  fontWeight: '700',
                                  whiteSpace: 'nowrap',
                                  textTransform: 'uppercase',
                                }}
                              >
                                ✉️ New Email Ticket
                              </span>
                            )}
                          </div>

                          {/* Ticket ID & Title */}
                          {email.ticketId && (
                            <div style={{ marginBottom: '6px' }}>
                              <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#2563EB', margin: 0 }}>
                                Ticket #{email.ticketId}
                              </h4>
                              {email.ticketTitle && (
                                <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#1F2937', margin: '2px 0 0 0' }}>
                                  {email.ticketTitle}
                                </h3>
                              )}
                            </div>
                          )}

                          {/* From & Subject */}
                          <p style={{ fontSize: '13px', color: '#6B7280', margin: '4px 0' }}>
                            <strong>From:</strong> {email.actorName} ({email.actorEmail})
                          </p>
                          {email.subject && (
                            <p style={{ fontSize: '13px', color: '#6B7280', margin: '4px 0', wordBreak: 'break-word' }}>
                              <strong>Subject:</strong> {email.subject}
                            </p>
                          )}

                          {/* Message */}
                          <p style={{ fontSize: '13px', color: '#6B7280', margin: '6px 0 2px 0', fontStyle: 'italic' }}>
                            {email.message}
                          </p>

                          {/* Timestamp */}
                          <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '8px 0 0 0' }}>
                            {new Date(email.time).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    );
                })}

                {emailHasMore && (
                  <div style={{ display: 'flex', justifyContent: 'center', marginTop: '6px' }}>
                    <button
                      type="button"
                      onClick={handleEmailLoadMore}
                      disabled={emailLoadingMore}
                      style={{
                        padding: '10px 16px',
                        background: '#3B82F6',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: emailLoadingMore ? 'not-allowed' : 'pointer',
                        fontSize: '13px',
                        fontWeight: '500',
                        opacity: emailLoadingMore ? 0.6 : 1,
                      }}
                    >
                      {emailLoadingMore ? 'Loading...' : 'Load More'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
