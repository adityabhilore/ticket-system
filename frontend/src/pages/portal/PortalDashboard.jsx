import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';

const FRIENDLY_STATUS = {
  'Open': 'We received your request',
  'In Progress': 'Our team is working on it',
  'Resolved': 'Solution has been provided',
  'Closed': 'Issue completed'
};

const PRIORITY_COLORS = {
  'Critical': '#EF4444',
  'High': '#F59E0B',
  'Medium': '#EAB308',
  'Low': '#10B981',
};

const getTicketId = (ticket) => ticket?.TicketId || ticket?.TicketID || ticket?.ticketId || null;
const normalizeStatus = (statusName) => String(statusName || '')
  .trim()
  .toLowerCase()
  .replace(/[-_]+/g, ' ')
  .replace(/\s+/g, ' ');

const getStatusBucket = (ticket) => {
  const statusId = Number(ticket?.StatusID);
  if (statusId === 1) return 'open';
  if (statusId === 2) return 'inProgress';
  if (statusId === 3) return 'onHold';
  if (statusId === 4) return 'resolved';
  if (statusId === 5) return 'closed';

  const status = normalizeStatus(ticket?.StatusName);
  if (status === 'open') return 'open';
  if (status === 'in progress') return 'inProgress';
  if (status === 'on hold') return 'onHold';
  if (status === 'resolved') return 'resolved';
  if (status === 'closed') return 'closed';
  return 'open';
};

const timeAgo = (date) => {
  const diff = new Date() - new Date(date);
  const mins = Math.floor(diff / 6e4);
  const hrs  = Math.floor(diff / 36e5);
  const days = Math.floor(diff / 864e5);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24)  return `${hrs}h ago`;
  return `${days}d ago`;
};

const getSLA = (deadline, isOverdue, status) => {
  if (isOverdue && ['Open', 'In Progress'].includes(status)) return { text: 'Overdue', color: '#EF4444', pct: 0 };
  if (!deadline) return null;
  const diff = new Date(deadline) - new Date();
  if (diff <= 0) return { text: 'Overdue', color: '#EF4444', pct: 0 };
  const hrs = Math.round(diff / 36e5);
  if (hrs < 2)  return { text: `${hrs}h left`, color: '#EF4444', pct: 10 };
  if (hrs < 8)  return { text: `${hrs}h left`, color: '#F59E0B', pct: 40 };
  return { text: `${hrs}h left`, color: '#10B981', pct: 80 };
};

export default function PortalDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [ticketsRes, activityRes] = await Promise.all([
        api.get('/tickets'),
        api.get('/tickets/activity').catch(() => ({ data: { data: [] } })),
      ]);
      setTickets(Array.isArray(ticketsRes.data?.data) ? ticketsRes.data.data : []);
      setActivity(activityRes.data.data || []);
    } catch(err) {
      console.error(err);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  const stats = tickets.reduce((acc, ticket) => {
    const bucket = getStatusBucket(ticket);
    acc.total += 1;
    acc[bucket] += 1;
    return acc;
  }, { total: 0, open: 0, inProgress: 0, onHold: 0, resolved: 0, closed: 0 });

  const openTickets = tickets.filter(t =>
    ['open', 'inProgress'].includes(getStatusBucket(t))
  );

  const completedCount = stats.resolved + stats.closed;
  const recentTickets = [...tickets]
    .sort((a, b) => new Date(b.CreatedAt) - new Date(a.CreatedAt))
    .slice(0, 5);

  const visibleActivity = activity.length > 0
    ? activity
    : recentTickets.map((ticket) => ({
        TicketId: getTicketId(ticket),
        UserName: ticket.CreatedByName || user?.name || 'Client user',
        Action: `created ticket #${getTicketId(ticket) || '-'}`,
        TicketTitle: ticket.Title,
        CreatedAt: ticket.CreatedAt,
      }));
  const activityPreview = visibleActivity.slice(0, 5);

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',
      minHeight:'300px',color:'#9CA3AF',fontSize:'14px'}}>
      Loading dashboard...
    </div>
  );

  return (
    <div className="portal-page">

      {/* Header */}
      <div className="portal-page-header">
        <div>
          <h1 className="portal-page-title">
            Welcome back, {user?.name}! 👋
          </h1>
          <p className="portal-page-sub">
            Support overview for <strong>{user?.companyName || 'your company'}</strong>
          </p>
        </div>
        <button className="portal-btn-primary"
          onClick={() => navigate('/portal/tickets/new')}>
          + Raise New Ticket
        </button>
      </div>

      {/* 5 Stat cards */}
      <div className="portal-stats-row">
        {[
          { label:'Total Tickets', value:stats.total, sub:'All time', color:'#4F46E5', bgFrom:'#4F46E5', bgTo:'#4F46E5', filter:'all' },
          { label:'Open', value:stats.open, sub:'Awaiting resolution', color:'#059669', bgFrom:'#059669', bgTo:'#059669', filter:'open' },
          { label:'In Progress', value:stats.inProgress, sub:'Being worked on', color:'#3B82F6', bgFrom:'#3B82F6', bgTo:'#3B82F6', filter:'inProgress' },
          { label:'On Hold', value:stats.onHold, sub:'Waiting for info', color:'#D97706', bgFrom:'#D97706', bgTo:'#D97706', filter:'onHold' },
          { label:'Resolved / Closed', value:(stats.resolved + stats.closed), sub:'Completed', color:'#6B7280', bgFrom:'#6B7280', bgTo:'#6B7280', filter:'resolved' },
        ].map(card => (
          <div key={card.label} className="portal-stat-card"
            onClick={() => navigate(`/portal/tickets?status=${card.filter}`)}
            style={{
              borderTopColor: card.color,
              background: `linear-gradient(135deg, ${card.bgFrom} 0%, ${card.bgTo} 100%)`,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 12px 28px rgba(0, 0, 0, 0.28)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
            }}>
            <div className="portal-stat-label">{card.label}</div>
            <div className="portal-stat-value">{card.value}</div>
            <div className="portal-stat-sub">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* SLA Countdown for open tickets */}
      {openTickets.length > 0 && (
        <div style={{background:'#fff',border:'1px solid #E2E8F0',
          borderRadius:'12px',padding:'20px 22px',marginBottom:'16px'}}>
          <div style={{display:'flex',alignItems:'center',
            justifyContent:'space-between',marginBottom:'14px'}}>
            <div style={{fontSize:'15px',fontWeight:'700',color:'#1E293B'}}>
              Active Tickets — SLA Status
            </div>
            <button className="portal-link-btn"
              onClick={() => navigate('/portal/tickets')}>
              View all →
            </button>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
            {openTickets.slice(0,4).map(t => {
              const sla = getSLA(t.SLADeadline, t.IsOverdue, t.StatusName);
              const ticketId = getTicketId(t);
              return (
                <div key={ticketId || t.Title}
                  onClick={() => ticketId && navigate(`/portal/tickets/${ticketId}`)}
                  style={{display:'flex',alignItems:'center',gap:'12px',
                    padding:'12px 14px',background:'#F8FAFC',
                    borderRadius:'8px',cursor:ticketId ? 'pointer' : 'default',
                    border:'1px solid #E2E8F0',transition:'all 0.15s'}}
                  onMouseEnter={e => ticketId && (e.currentTarget.style.borderColor='#4F46E5')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor='#E2E8F0')}>

                  {/* Priority dot */}
                  <div style={{width:'10px',height:'10px',borderRadius:'50%',
                    background: PRIORITY_COLORS[t.PriorityName] || '#6B7280',
                    flexShrink:0}} />

                  {/* Title */}
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:'13px',fontWeight:'600',color:'#1E293B',
                      whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                      #{ticketId || '-'} — {t.Title}
                    </div>
                    <div style={{fontSize:'11px',color:'#6B7280',marginTop:'2px'}}>
                      {t.StatusName} · {t.PriorityName}
                    </div>
                  </div>

                  {/* SLA pill */}
                  {sla && (
                    <div style={{flexShrink:0}}>
                      <span style={{
                        background: sla.color + '18',
                        color: sla.color,
                        border: `1px solid ${sla.color}40`,
                        padding:'3px 10px',borderRadius:'999px',
                        fontSize:'12px',fontWeight:'700',
                      }}>
                        {sla.text}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent tickets + Status breakdown */}
      <div className="portal-quick-row">
        {/* Recent tickets list */}
        <div className="portal-quick-card">
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'16px'}}>
            <h3 style={{fontSize:'15px',fontWeight:'700',color:'#1E293B',margin:0}}>
              Recent Tickets
            </h3>
            <button className="portal-link-btn"
              onClick={() => navigate('/portal/tickets')}>
              View all →
            </button>
          </div>

          {tickets.length === 0 ? (
            <div className="portal-empty-state">
              <div className="portal-empty-icon">🎫</div>
              <div style={{fontSize:'14px',fontWeight:'600',color:'#1E293B',marginBottom:'4px'}}>
                No tickets yet
              </div>
              <div style={{fontSize:'12px',color:'#6B7280',marginBottom:'12px'}}>
                Raise your first support ticket
              </div>
              <button className="portal-btn-primary" style={{fontSize:'12px'}}
                onClick={() => navigate('/portal/tickets/new')}>
                Raise Ticket
              </button>
            </div>
          ) : (
            <div className="portal-recent-list" style={{maxHeight:'280px',overflowY:'auto',paddingRight:'2px',display:'flex',flexDirection:'column',gap:'10px'}}>
              {recentTickets.map((t, idx) => {
                const ticketId = getTicketId(t);
                return (
                <div key={ticketId || `${t.Title}-${idx}`} className="portal-recent-item"
                  onClick={() => ticketId && navigate(`/portal/tickets/${ticketId}`)}
                  style={{
                    border: '1px solid #E2E8F0',
                    background: '#F8FAFC',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    cursor: ticketId ? 'pointer' : 'default',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    if (!ticketId) return;
                    e.currentTarget.style.background = '#EEF2FF';
                    e.currentTarget.style.borderColor = '#C7D2FE';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#F8FAFC';
                    e.currentTarget.style.borderColor = '#E2E8F0';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}>
                  <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'4px'}}>
                    <div style={{width:'8px',height:'8px',borderRadius:'50%',
                      background: PRIORITY_COLORS[t.PriorityName] || '#9CA3AF'}} />
                    <span style={{flex:1,fontSize:'13px',fontWeight:'600',color:'#1E293B',
                      whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                      #{ticketId || '-'} — {t.Title}
                    </span>
                  </div>
                  <div style={{fontSize:'11px',color:'#9CA3AF',display:'flex',justifyContent:'space-between',gap:'8px'}}>
                    <span>{FRIENDLY_STATUS[t.StatusName] || t.StatusName || 'Ticket update'}</span>
                    <span>{timeAgo(t.CreatedAt)}</span>
                  </div>
                </div>
              )})}
            </div>
          )}
        </div>

        {/* Status breakdown */}
        <div className="portal-quick-card">
          <h3 style={{fontSize:'15px',fontWeight:'700',color:'#1E293B',margin:'0 0 16px'}}>
            Ticket Breakdown
          </h3>

          {tickets.length === 0 ? (
            <div style={{textAlign:'center',padding:'20px',color:'#9CA3AF',fontSize:'13px'}}>
              No data yet
            </div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:'14px'}}>
              {[
                { label:'Open', count:stats.open, color:'#10B981' },
                { label:'In Progress', count:stats.inProgress, color:'#4F46E5' },
                { label:'Resolved', count:stats.resolved, color:'#06B6D4' },
                { label:'Closed', count:stats.closed, color:'#9CA3AF' },
              ].map(item => {
                const pct = stats.total > 0 ? Math.round((item.count/stats.total)*100) : 0;
                return (
                  <div key={item.label}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:'5px',fontSize:'12px'}}>
                      <span style={{fontWeight:'600',color:'#374151'}}>{item.label}</span>
                      <span style={{fontWeight:'700',color:item.color}}>
                        {item.count} ({pct}%)
                      </span>
                    </div>
                    <div style={{height:'8px',background:'#F1F5F9',borderRadius:'999px',overflow:'hidden'}}>
                      <div style={{height:'100%',width:`${pct}%`,background:item.color,
                        borderRadius:'999px',transition:'width 0.5s ease'}} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Activity feed */}
      <div style={{background:'#fff',border:'1px solid #E2E8F0',borderRadius:'12px',
        marginTop:'8px',
        padding:'20px 22px'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',margin:'0 0 14px'}}>
          <h3 style={{fontSize:'15px',fontWeight:'700',color:'#1E293B',margin:0}}>
            Recent Activity
          </h3>
          <button className="portal-link-btn" onClick={() => navigate('/portal/activity')}>
            View all activity →
          </button>
        </div>

        {activityPreview.length === 0 ? (
          <div style={{textAlign:'center',padding:'20px',color:'#9CA3AF',fontSize:'13px'}}>
            No activity yet — activity will appear here once tickets are updated
          </div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:'0'}}>
            {activityPreview.map((item, idx) => {
              const activityTicketId = item.TicketId || item.TicketID || null;
              return (
              <div key={idx}
                onClick={() => activityTicketId && navigate(`/portal/tickets/${activityTicketId}`)}
                style={{display:'flex',alignItems:'flex-start',gap:'12px',padding:'10px 0',
                  borderBottom: idx < activityPreview.length-1 ? '1px solid #F1F5F9' : 'none',
                  cursor: activityTicketId ? 'pointer' : 'default',transition:'all 0.12s'}}
                onMouseEnter={e => activityTicketId && (e.currentTarget.style.paddingLeft='4px')}
                onMouseLeave={e => (e.currentTarget.style.paddingLeft='0')}>

                <div style={{width:'32px',height:'32px',borderRadius:'50%',background:'#EEF2FF',
                  display:'flex',alignItems:'center',justifyContent:'center',fontSize:'14px',
                  flexShrink:0,marginTop:'1px'}}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>
                  </svg>
                </div>

                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:'13px',color:'#374151',lineHeight:'1.5'}}>
                    <strong>{item.UserName || 'Support team'}</strong>
                    {' '}
                    {item.Action || 'updated ticket'}
                    {' '}
                    {item.TicketTitle && (
                      <span style={{color:'#4F46E5',fontWeight:'600'}}>
                        "{item.TicketTitle}"
                      </span>
                    )}
                  </div>
                  <div style={{fontSize:'11px',color:'#9CA3AF',marginTop:'2px'}}>
                    {timeAgo(item.CreatedAt)}
                  </div>
                </div>
              </div>
            )})}
          </div>
        )}
      </div>

    </div>
  );
}