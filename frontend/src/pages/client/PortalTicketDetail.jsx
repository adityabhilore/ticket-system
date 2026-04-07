import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import { STATUS_STEPS, FRIENDLY_STATUS } from '../../constants/statusConfig';
import CSATRating from '../../components/CSATRating';

// Priority colors
const PRIORITY_COLORS = {
  'Critical': { bg: '#FEE2E2', color: '#991B1B' },
  'High':     { bg: '#FFEDD5', color: '#9A3412' },
  'Medium':   { bg: '#FEF9C3', color: '#713F12' },
  'Low':      { bg: '#F0FDF4', color: '#166534' },
};

export default function PortalTicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [ticket, setTicket]       = useState(null);
  const [comments, setComments]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [comment, setComment]     = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [commentError, setCommentError] = useState('');
  const [commentSuccess, setCommentSuccess] = useState(false);
  const [timeLeft, setTimeLeft]   = useState(null);

  const currentUserId = Number(user?.userId || user?.UserID || user?.id);

  const fetchTicket = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/tickets/${id}`);
      const data = res.data.data || res.data;
      setTicket(data.ticket || data);
      const allComments = data.comments || [];
      setComments(allComments.filter(c => !c.IsInternal && c.isInternal !== true));
    } catch(err) {
      setError('Ticket not found or access denied');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchTicket(); }, [fetchTicket]);

  // Live SLA countdown – updates every minute
  useEffect(() => {
    if (!ticket?.SLADeadline) return;
    const update = () => {
      const diff = new Date(ticket.SLADeadline) - new Date();
      if (diff <= 0) { 
        setTimeLeft({ text: 'Overdue', color: '#EF4444', pct: 0 }); 
        return; 
      }
      const hrs  = Math.floor(diff / 36e5);
      const mins = Math.floor((diff % 36e5) / 6e4);
      const color = hrs < 2 ? '#EF4444' : hrs < 8 ? '#F59E0B' : '#10B981';
      setTimeLeft({ 
        text: `${hrs}h ${mins}m remaining`, 
        color, 
        pct: Math.min(100, Math.round((diff / (ticket.SLAHours * 36e5)) * 100)) 
      });
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [ticket]);

  const handleComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) { 
      setCommentError('Please enter a comment'); 
      return; 
    }
    if (comment.trim().length < 5) { 
      setCommentError('Comment too short'); 
      return; 
    }
    setSubmitting(true);
    setCommentError('');
    try {
      await api.post(`/tickets/${id}/comment`, {
        content: comment.trim(),
        isInternal: false
      });
      setComment('');
      setCommentSuccess(true);
      setTimeout(() => setCommentSuccess(false), 3000);
      fetchTicket(); // Refresh comments
    } catch(err) {
      setCommentError(err?.response?.data?.message || 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',
      minHeight:'300px',color:'#9CA3AF',fontSize:'14px'}}>
      Loading ticket...
    </div>
  );

  if (error) return (
    <div className="portal-page">
      <div style={{background:'#FEF2F2',border:'1px solid #FECACA',borderRadius:'10px',
        padding:'24px',textAlign:'center'}}>
        <div style={{fontSize:'32px',marginBottom:'12px'}}>❌</div>
        <div style={{fontSize:'16px',fontWeight:'700',color:'#991B1B'}}>{error}</div>
        <button className="portal-btn-secondary" style={{marginTop:'16px'}}
          onClick={() => navigate('/client/tickets')}>
          ← Back to My Tickets
        </button>
      </div>
    </div>
  );

  const currentStepIndex = STATUS_STEPS.indexOf(ticket?.StatusName);
  const priorityStyle = PRIORITY_COLORS[ticket?.PriorityName] || PRIORITY_COLORS['Low'];

  return (
    <div className="portal-page">

      {/* Ticket top section */}
      <div style={{background:'linear-gradient(135deg, #1E1B4B 0%, #4C1D95 60%, #4F46E5 100%)',
        padding:'24px 28px',borderRadius:'12px',marginBottom:'24px',
        border:'1px solid rgba(255,255,255,0.2)',
        boxShadow:'0 8px 24px rgba(79,70,229,0.3)'}}>
        <button onClick={() => navigate('/client/tickets')}
          style={{display:'flex',alignItems:'center',gap:'6px',background:'none',
            border:'none',color:'rgba(255,255,255,0.85)',fontSize:'13px',fontWeight:'600',
            cursor:'pointer',padding:'0',marginBottom:'20px',fontFamily:'inherit'}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          ← Back to My Tickets
        </button>

        <div style={{display:'flex',alignItems:'flex-start',
          justifyContent:'space-between',gap:'16px',flexWrap:'wrap'}}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'8px'}}>
              <span style={{fontSize:'13px',fontWeight:'700',color:'rgba(255,255,255,0.95)'}}>
                Ticket #{ticket?.TicketId}
              </span>
              <span style={{background:priorityStyle.bg,color:priorityStyle.color,
                padding:'3px 10px',borderRadius:'999px',fontSize:'12px',fontWeight:'700'}}>
                {ticket?.PriorityName}
              </span>
              {ticket?.IsOverdue && (
                <span style={{background:'#FEE2E2',color:'#991B1B',
                  padding:'3px 10px',borderRadius:'999px',fontSize:'12px',fontWeight:'700'}}>
                  ⚠️ Overdue
                </span>
              )}
            </div>
            <h1 style={{fontSize:'24px',fontWeight:'700',color:'#FFFFFF',
              margin:'0 0 6px'}}>
              {ticket?.Title}
            </h1>
            <div style={{fontSize:'13px',color:'rgba(255,255,255,0.8)'}}>
              Raised on {new Date(ticket?.CreatedAt).toLocaleDateString('en-IN',{
                day:'numeric',month:'long',year:'numeric'})}
              {ticket?.AssignedTo && (
                <span> · Assigned to <strong>{ticket?.AssignedToName || 'Support Engineer'}</strong></span>
              )}
            </div>
          </div>

          {/* SLA countdown */}
          {timeLeft && ticket?.StatusName !== 'Closed' && ticket?.StatusName !== 'Resolved' && (
            <div style={{background:'#fff',border:`2px solid ${timeLeft.color}`,
              borderRadius:'12px',padding:'14px 18px',textAlign:'center',minWidth:'160px'}}>
              <div style={{fontSize:'11px',fontWeight:'700',color:'#9CA3AF',
                textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'6px'}}>
                SLA Deadline
              </div>
              <div style={{fontSize:'15px',fontWeight:'700',color:timeLeft.color}}>
                {timeLeft.text}
              </div>
              <div style={{height:'6px',background:'#F1F5F9',borderRadius:'999px',
                overflow:'hidden',marginTop:'8px'}}>
                <div style={{height:'100%',width:`${timeLeft.pct}%`,
                  background:timeLeft.color,borderRadius:'999px',
                  transition:'width 0.5s'}} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status tracker */}
      <div style={{background:'#fff',border:'1px solid #E2E8F0',borderRadius:'12px',
        padding:'20px 24px',marginBottom:'20px'}}>
        <div style={{fontSize:'13px',fontWeight:'700',color:'#1E293B',marginBottom:'16px'}}>
          Status
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'0'}}>
          {STATUS_STEPS.map((step, index) => {
            const isDone = index <= currentStepIndex;
            const isCurrent = index === currentStepIndex;
            return (
              <React.Fragment key={step}>
                <div style={{display:'flex',flexDirection:'column',
                  alignItems:'center',gap:'6px',flex:1}}>
                  <div style={{
                    width:'32px',height:'32px',borderRadius:'50%',
                    background: isCurrent ? '#4F46E5' : isDone ? '#10B981' : '#F1F5F9',
                    border: isCurrent ? '3px solid #4F46E5' : isDone ? '3px solid #10B981' : '3px solid #E2E8F0',
                    display:'flex',alignItems:'center',justifyContent:'center',
                    fontSize:'14px',fontWeight:'700',
                    color: isDone || isCurrent ? '#fff' : '#9CA3AF',
                    transition:'all 0.3s',
                  }}>
                    {isDone && !isCurrent ? '✓' : index + 1}
                  </div>
                  <div style={{fontSize:'11px',fontWeight: isCurrent ? '700' : '500',
                    color: isCurrent ? '#4F46E5' : isDone ? '#10B981' : '#9CA3AF',
                    textAlign:'center',whiteSpace:'nowrap'}}>
                    {step}
                  </div>
                </div>
                {index < STATUS_STEPS.length - 1 && (
                  <div style={{height:'3px',flex:1,
                    background: index < currentStepIndex ? '#10B981' : '#E2E8F0',
                    marginBottom:'18px',transition:'background 0.3s'}} />
                )}
              </React.Fragment>
            );
          })}
        </div>
        <div style={{marginTop:'12px',padding:'10px 14px',background:'#F8FAFC',
          borderRadius:'8px',fontSize:'13px',color:'#374151',textAlign:'center'}}>
          {FRIENDLY_STATUS[ticket?.StatusName]}
        </div>
      </div>

      {/* Two column layout */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 340px',gap:'20px',
        alignItems:'start'}}>

        {/* LEFT – Description + Comments */}
        <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>

          {/* Description */}
          <div style={{background:'#fff',border:'1px solid #E2E8F0',
            borderRadius:'12px',padding:'20px 24px'}}>
            <div style={{fontSize:'13px',fontWeight:'700',color:'#1E293B',
              marginBottom:'12px'}}>Description</div>
            <div style={{fontSize:'14px',color:'#374151',lineHeight:'1.7',
              whiteSpace:'pre-wrap'}}>
              {ticket?.Description || 'No description provided.'}
            </div>
          </div>

          {/* Comments */}
          <div style={{background:'#fff',border:'1px solid #E2E8F0',
            borderRadius:'12px',padding:'20px 24px'}}>
            <div style={{fontSize:'13px',fontWeight:'700',color:'#1E293B',
              marginBottom:'16px'}}>
              Comments ({comments.length})
            </div>

            {comments.length === 0 ? (
              <div style={{textAlign:'center',padding:'24px',color:'#9CA3AF',
                fontSize:'13px'}}>
                No comments yet. Add one below.
              </div>
            ) : (
              <div style={{display:'flex',flexDirection:'column',gap:'12px',
                marginBottom:'20px'}}>
                {comments.map((c, i) => {
                  const commentUserId = Number(c.UserID || c.UserId || c.userId || c.userid);
                  const isMe = Number.isFinite(currentUserId) && Number.isFinite(commentUserId)
                    ? commentUserId === currentUserId
                    : false;
                  return (
                    <div key={i} style={{
                      display:'flex',gap:'10px',
                      flexDirection: isMe ? 'row-reverse' : 'row',
                    }}>
                      <div style={{
                        width:'32px',height:'32px',borderRadius:'50%',
                        background: isMe ? '#4F46E5' : '#E2E8F0',
                        display:'flex',alignItems:'center',justifyContent:'center',
                        fontSize:'13px',fontWeight:'700',
                        color: isMe ? '#fff' : '#374151',
                        flexShrink:0,
                      }}>
                        {(c.UserName || c.userName || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div style={{maxWidth:'75%'}}>
                        <div style={{
                          padding:'10px 14px',
                          background: isMe ? '#EEF2FF' : '#F8FAFC',
                          border: `1px solid ${isMe ? '#C7D2FE' : '#E2E8F0'}`,
                          borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                          fontSize:'13px',color:'#374151',lineHeight:'1.6',
                        }}>
                          {c.Content || c.content}
                        </div>
                        <div style={{
                          fontSize:'11px',color:'#9CA3AF',marginTop:'4px',
                          textAlign: isMe ? 'right' : 'left',
                        }}>
                          {c.UserName || c.userName || 'User'} · {new Date(c.CreatedAt || c.createdAt).toLocaleDateString('en-IN',{
                            day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add comment – only if not closed */}
            {ticket?.StatusName !== 'Closed' ? (
              <form onSubmit={handleComment}>
                <div style={{borderTop:'1px solid #F1F5F9',paddingTop:'16px'}}>
                  <div style={{background:'#FEF3C7',border:'1px solid #FCD34D',
                    borderRadius:'8px',padding:'10px 12px',marginBottom:'12px',
                    fontSize:'12px',color:'#92400E',fontWeight:'600'}}>
                    Status: {ticket?.StatusName} - You can add comments
                  </div>
                  <div style={{fontSize:'12px',fontWeight:'600',color:'#374151',
                    marginBottom:'8px'}}>Add a comment</div>
                  {commentError && (
                    <div style={{background:'#FEF2F2',border:'1px solid #FECACA',
                      color:'#991B1B',borderRadius:'8px',padding:'8px 12px',
                      fontSize:'12px',marginBottom:'8px'}}>
                      {commentError}
                    </div>
                  )}
                  {commentSuccess && (
                    <div style={{background:'#F0FDF4',border:'1px solid #BBF7D0',
                      color:'#065F46',borderRadius:'8px',padding:'8px 12px',
                      fontSize:'12px',marginBottom:'8px'}}>
                      Comment posted!
                    </div>
                  )}
                  <textarea
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    placeholder="Type your message or question here..."
                    disabled={submitting}
                    style={{width:'100%',padding:'10px 13px',border:'1.5px solid #E2E8F0',
                      borderRadius:'8px',fontSize:'13px',fontFamily:'inherit',
                      resize:'vertical',minHeight:'90px',outline:'none',
                      boxSizing:'border-box',color:'#1E293B',
                      transition:'border-color 0.15s'}}
                    onFocus={e => e.target.style.borderColor='#4F46E5'}
                    onBlur={e => e.target.style.borderColor='#E2E8F0'}
                  />
                  <div style={{display:'flex',justifyContent:'flex-end',marginTop:'8px'}}>
                    <button type="submit" disabled={submitting}
                      style={{padding:'9px 18px',background:'#4F46E5',color:'#fff',
                        border:'none',borderRadius:'8px',fontSize:'13px',
                        fontWeight:'600',cursor:'pointer',fontFamily:'inherit',
                        opacity: submitting ? 0.65 : 1}}>
                      {submitting ? 'Posting...' : 'Post Comment'}
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <div>
                <div style={{borderTop:'1px solid #F1F5F9',paddingTop:'14px'}}>
                  <div style={{background:'#FEF2F2',border:'1px solid #FECACA',
                    borderRadius:'8px',padding:'10px 12px',marginBottom:'12px',
                    fontSize:'12px',color:'#991B1B',fontWeight:'600'}}>
                    Ticket Status: {ticket?.StatusName} - Closed tickets cannot receive comments
                  </div>
                  <div style={{textAlign:'center',fontSize:'13px',color:'#9CA3AF'}}>
                    This ticket is closed. No further comments allowed.
                  </div>
                </div>
                
                {/* CSAT Rating Component - Show only when closed */}
                <CSATRating 
                  ticketId={id} 
                  ticketStatus={ticket?.StatusName}
                  onSuccess={() => {
                    setCommentSuccess(true);
                    setTimeout(() => setCommentSuccess(false), 5000);
                  }}
                />
              </div>
            )}
          </div>

        </div>

        {/* RIGHT – Ticket info sidebar */}
        <div style={{background:'#fff',border:'1px solid #E2E8F0',
          borderLeft:'4px solid #4F46E5',
          borderRadius:'12px',padding:'20px',
          boxShadow:'0 4px 12px rgba(79, 70, 229, 0.12)'}}>
          <div style={{fontSize:'13px',fontWeight:'700',color:'#1E293B',
            marginBottom:'16px'}}>Ticket Info</div>

          {[
            { label: 'Ticket ID', value: `#${ticket?.TicketId}` },
            { label: 'Status', value: ticket?.StatusName },
            { label: 'Priority', value: ticket?.PriorityName },
            { label: 'Company', value: ticket?.CompanyName },
            ...(ticket?.ProductName ? [{ label: 'Product', value: `${ticket.ProductName} v${ticket.ProductVersion}` }] : []),
            { label: 'Assigned To', value: ticket?.AssignedToName || 'Not assigned yet' },
            { label: 'Created', value: new Date(ticket?.CreatedAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}) },
            { label: 'SLA Deadline', value: ticket?.SLADeadline?new Date(ticket.SLADeadline).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'Not set' },
          ].map(item => (
            <div key={item.label} style={{display:'flex',flexDirection:'column',
              gap:'2px',padding:'10px 0',borderBottom:'1px solid #F8FAFC'}}>
              <span style={{fontSize:'11px',fontWeight:'600',color:'#9CA3AF',
                textTransform:'uppercase',letterSpacing:'0.05em'}}>
                {item.label}
              </span>
              <span style={{fontSize:'13px',fontWeight:'600',color:'#1E293B'}}>
                {item.value}
              </span>
            </div>
          ))}

          {/* Need help button */}
          <button
            onClick={() => navigate('/client/tickets/new')}
            style={{width:'100%',marginTop:'16px',padding:'10px',
              background:'#EEF2FF',color:'#4F46E5',border:'1px solid #C7D2FE',
              borderRadius:'8px',fontSize:'13px',fontWeight:'600',
              cursor:'pointer',fontFamily:'inherit'}}>
            + Raise Another Ticket
          </button>
        </div>

      </div>
    </div>
  );
}

