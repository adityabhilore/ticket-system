import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import api from '../services/api';
import { STATUS_STEPS, FRIENDLY_STATUS } from '../constants/statusConfig';
import CSATRating from '../components/CSATRating';
import { checkCanRate } from '../services/csatService';

const PRIORITY_COLORS = {
  'Critical': { bg:'#FEE2E2', color:'#991B1B' },
  'High':     { bg:'#FFEDD5', color:'#9A3412' },
  'Medium':   { bg:'#FEF9C3', color:'#713F12' },
  'Low':      { bg:'#F0FDF4', color:'#166534' },
};

const timeAgo = (date) => {
  const diff = new Date() - new Date(date);
  const m = Math.floor(diff/6e4);
  const h = Math.floor(diff/36e5);
  const d = Math.floor(diff/864e5);
  if (m<1) return 'just now';
  if (m<60) return `${m}m ago`;
  if (h<24) return `${h}h ago`;
  return `${d}d ago`;
};

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isManager  = user?.role === 'Manager';
  const isEngineer = user?.role === 'Engineer';
  const canManualAssign = user?.role === 'Admin';
  const isAdmin = user?.role === 'Admin';

  const [ticket, setTicket]       = useState(null);
  const [comments, setComments]   = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [engineers, setEngineers] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [canRate, setCanRate]     = useState(false);
  const [alreadyRated, setAlreadyRated] = useState(false);

  const [comment, setComment]         = useState('');
  const [isInternal, setIsInternal]   = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentSuccess, setCommentSuccess] = useState(false);

  const [selectedEngineer, setSelectedEngineer] = useState('');
  const [assigning, setAssigning]   = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const currentUserId = Number(user?.userId || user?.UserID || user?.id);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/tickets/${id}`);
      
      // The response structure is: { success: true, data: { ticket: {...}, comments: [...], auditLogs: [...] } }
      const responseData = res.data?.data || res.data;
      const ticketData = responseData?.ticket || responseData;
      const commentsData = responseData?.comments || [];
      const auditLogsData = responseData?.auditLogs || [];
      
      console.log('🎯 ticketData.TicketID =', ticketData?.TicketID);
      console.log('🎯 ticketData object =', ticketData);
      
      // SET TICKET - this must work!
      setTicket(ticketData);
      setComments(commentsData);
      setAuditLogs(auditLogsData);

      // Check rating eligibility
      try {
        const ratingRes = await checkCanRate(id);
        if (ratingRes.data?.data) {
          setCanRate(ratingRes.data.data.canRate === true);
          setAlreadyRated(ratingRes.data.data.alreadyRated === true);
        }
      } catch (ratingErr) {
        setCanRate(false);
      }

      // Load engineers
      if (canManualAssign) {
        try {
          const engRes = await api.get(isAdmin ? '/admin/users/engineers' : '/users/engineers');
          setEngineers(engRes.data.data || []);
        } catch (err) {
          setEngineers([]);
        }
      }

    } catch(e) {
      console.error('Error loading ticket:', e);
      setError('Ticket not found or access denied');
    } finally {
      setLoading(false);
    }
  }, [id, canManualAssign, isAdmin]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function handleAssign(e) {
    e.preventDefault();
    if (!selectedEngineer) return;
    setAssigning(true);
    try {
      await api.put(`/tickets/${id}/assign`,
        { engineerId: parseInt(selectedEngineer) });
      setShowAssign(false);
      setSelectedEngineer('');
      fetchAll();
    } catch(e) {
      alert(e?.response?.data?.message || 'Failed to assign');
    } finally { setAssigning(false); }
  }

  async function handleStatusChange(statusId) {
    if (!statusId) return;
    setUpdatingStatus(true);
    try {
      await api.put(`/tickets/${id}/status`,
        { statusId: parseInt(statusId) });
      fetchAll();
    } catch(e) {
      alert(e?.response?.data?.message || 'Failed to update status');
    } finally { setUpdatingStatus(false); }
  }

  async function handleComment(e) {
    e.preventDefault();
    if (!comment.trim()) return;
    setCommentLoading(true);
    try {
      await api.post(`/tickets/${id}/comment`, {
        content: comment.trim(),
        isInternal,
      });
      setComment('');
      setCommentSuccess(true);
      setTimeout(()=>setCommentSuccess(false), 3000);
      fetchAll();
    } catch(e) {
      alert(e?.response?.data?.message || 'Failed to post comment');
    } finally { setCommentLoading(false); }
  }

  const getSLA = () => {
    if (!ticket?.SLADeadline) return null;
    if (ticket.IsOverdue && ['Open', 'In Progress'].includes(ticket?.StatusName)) return { text:'Overdue', color:'#EF4444', pct:0 };
    const diff = new Date(ticket.SLADeadline) - new Date();
    if (diff<=0) return { text:'Overdue', color:'#EF4444', pct:0 };
    const hrs = Math.round(diff/36e5);
    const color = hrs<4?'#EF4444':hrs<12?'#F59E0B':'#10B981';
    const pct = Math.min(100,
      Math.round((diff/((ticket.SLAHours||24)*36e5))*100));
    return { text:`${hrs}h remaining`, color, pct };
  };

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',
      minHeight:'400px',color:'#9CA3AF',fontSize:'14px',
      fontFamily:'Inter,sans-serif'}}>
      Loading ticket details...
    </div>
  );

  if (error) return (
    <div style={{padding:'36px',textAlign:'center',fontFamily:'Inter,sans-serif'}}>
      <div style={{fontSize:'48px',marginBottom:'12px'}}>❌</div>
      <div style={{fontSize:'16px',fontWeight:'700',color:'#991B1B',
        marginBottom:'16px'}}>{error}</div>
      <button onClick={()=>navigate('/tickets')}
        style={{padding:'10px 20px',background:'#4F46E5',color:'#fff',
          border:'none',borderRadius:'8px',cursor:'pointer',
          fontFamily:'inherit',fontSize:'13px',fontWeight:'600'}}>
        ← Back to Tickets
      </button>
    </div>
  );

  const pc  = PRIORITY_COLORS[ticket?.PriorityName] || PRIORITY_COLORS['Low'];
  const sla = getSLA();
  const currentStepIndex = STATUS_STEPS.indexOf(ticket?.StatusName);
  const isClosed = ticket?.StatusName === 'Closed';

  return (
    <div style={{padding:'32px 36px',fontFamily:'Inter,-apple-system,sans-serif',
      background:'#F8FAFC',minHeight:'100vh'}}>

      {/* Back button */}
      <button onClick={()=>navigate(isAdmin ? '/admin/tickets' : '/tickets')}
        style={{display:'flex',alignItems:'center',gap:'6px',
          background:'none',border:'none',color:'#6B7280',fontSize:'13px',
          fontWeight:'500',cursor:'pointer',padding:'0',marginBottom:'16px',
          fontFamily:'inherit',transition:'color 0.15s'}}
        onMouseEnter={e=>e.currentTarget.style.color='#4F46E5'}
        onMouseLeave={e=>e.currentTarget.style.color='#6B7280'}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        Back to Tickets
      </button>

      {/* Ticket header */}
      <div style={{display:'flex',alignItems:'flex-start',
        justifyContent:'space-between',gap:'16px',marginBottom:'20px'}}>
        <div>
          <div style={{display:'flex',alignItems:'center',
            gap:'10px',marginBottom:'6px'}}>
            <span style={{fontSize:'13px',fontWeight:'700',color:'#4F46E5'}}>
              #{ticket?.TicketID}
            </span>
            <span style={{background:pc.bg,color:pc.color,
              padding:'3px 10px',borderRadius:'999px',
              fontSize:'12px',fontWeight:'700'}}>
              {ticket?.PriorityName}
            </span>
            {ticket?.IsOverdue && ['Open', 'In Progress'].includes(ticket?.StatusName) && (
              <span style={{background:'#FEE2E2',color:'#991B1B',
                padding:'3px 10px',borderRadius:'999px',
                fontSize:'12px',fontWeight:'700'}}>
                ⚠️ OVERDUE
              </span>
            )}
          </div>
          <h1 style={{fontSize:'22px',fontWeight:'700',color:'#1E293B',
            margin:'0 0 6px'}}>
            {ticket?.Title}
          </h1>
          <div style={{fontSize:'13px',color:'#6B7280'}}>
            {ticket?.CompanyName} · Created by {ticket?.CreatedByName} ·{' '}
            {new Date(ticket?.CreatedAt).toLocaleDateString('en-IN',{
              day:'numeric',month:'long',year:'numeric'})}
          </div>

          <button
            onClick={() => navigate(isAdmin ? `/admin/tickets/${ticket?.TicketID}/activity` : `/tickets/${ticket?.TicketID}/activity`)}
            style={{
              marginTop: '10px',
              padding: '8px 14px',
              border: '1px solid #C7D2FE',
              background: '#EEF2FF',
              color: '#4338CA',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Open Activity Log ({auditLogs.length})
          </button>
        </div>

        {/* Assign buttons for Manager */}
        {canManualAssign && !ticket?.AssignedToID && (
          <button onClick={()=>setShowAssign(!showAssign)}
            style={{padding:'10px 18px',background:'#4F46E5',color:'#fff',
              border:'none',borderRadius:'8px',fontSize:'13px',fontWeight:'700',
              cursor:'pointer',fontFamily:'inherit',
              boxShadow:'0 4px 12px rgba(79,70,229,0.3)'}}>
            👤 Assign to Engineer
          </button>
        )}
        {canManualAssign && ticket?.AssignedToID && (
          <button onClick={()=>setShowAssign(!showAssign)}
            style={{padding:'10px 18px',background:'#F3F4F6',color:'#374151',
              border:'1px solid #E5E7EB',borderRadius:'8px',fontSize:'13px',
              fontWeight:'600',cursor:'pointer',fontFamily:'inherit'}}>
            🔄 Reassign Engineer
          </button>
        )}
      </div>

      {/* Assign form */}
      {showAssign && canManualAssign && (
        <div style={{background:'#fff',border:'1px solid #C7D2FE',
          borderRadius:'12px',padding:'20px',marginBottom:'20px',
          boxShadow:'0 4px 16px rgba(79,70,229,0.12)'}}>
          <div style={{fontSize:'15px',fontWeight:'700',color:'#1E293B',
            marginBottom:'14px'}}>
            Assign Ticket to Engineer
          </div>
          <form onSubmit={handleAssign}
            style={{display:'flex',gap:'10px',flexWrap:'wrap'}}>
            <select value={selectedEngineer}
              onChange={e=>setSelectedEngineer(e.target.value)}
              style={{flex:1,minWidth:'220px',padding:'10px 14px',
                border:'1.5px solid #E2E8F0',borderRadius:'8px',
                fontSize:'13px',fontFamily:'inherit',outline:'none',
                background:'#fff',cursor:'pointer'}}
              onFocus={e=>e.target.style.borderColor='#4F46E5'}
              onBlur={e=>e.target.style.borderColor='#E2E8F0'}>
              <option value="">-- Select Engineer --</option>
              {engineers.map(eng=>(
                <option key={eng.UserID} value={eng.UserID}>
                  {eng.Name} ({eng.activeTickets} active)
                </option>
              ))}
            </select>
            <button type="submit"
              disabled={assigning||!selectedEngineer}
              style={{padding:'10px 18px',background:'#4F46E5',color:'#fff',
                border:'none',borderRadius:'8px',fontSize:'13px',fontWeight:'700',
                cursor:'pointer',fontFamily:'inherit',
                opacity:assigning||!selectedEngineer?0.6:1}}>
              {assigning?'Assigning...':'✓ Assign'}
            </button>
            <button type="button" onClick={()=>setShowAssign(false)}
              style={{padding:'10px 14px',background:'#F3F4F6',color:'#374151',
                border:'1px solid #E5E7EB',borderRadius:'8px',fontSize:'13px',
                fontWeight:'600',cursor:'pointer',fontFamily:'inherit'}}>
              Cancel
            </button>
          </form>
        </div>
      )}

      {/* Status tracker */}
      <div style={{background:'#fff',border:'1px solid #E2E8F0',
        borderRadius:'12px',padding:'20px 24px',marginBottom:'20px',
        boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
        <div style={{display:'flex',alignItems:'center',
          justifyContent:'space-between',marginBottom:'16px'}}>
          <div style={{fontSize:'14px',fontWeight:'700',color:'#1E293B'}}>
            Ticket Status
          </div>
          {/* Engineer status update */}
          {isEngineer && !isClosed && (
            <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
              <span style={{fontSize:'12px',color:'#6B7280',fontWeight:'500'}}>
                Update status:
              </span>
              <select onChange={e=>handleStatusChange(e.target.value)}
                defaultValue="" disabled={updatingStatus}
                style={{padding:'7px 28px 7px 10px',
                  border:'1.5px solid #059669',borderRadius:'7px',
                  fontSize:'12px',fontFamily:'inherit',outline:'none',
                  background:'#fff',cursor:'pointer',fontWeight:'700',
                  color:'#059669',WebkitAppearance:'none',appearance:'none'}}>
                <option value="" disabled>Change status...</option>
                <option value="2">→ In Progress</option>
                <option value="3">→ On Hold</option>
                <option value="4">→ Resolved</option>
                <option value="6">🔄 Reopened</option>
                <option value="5">→ Closed</option>
              </select>
              {updatingStatus && (
                <span style={{fontSize:'12px',color:'#9CA3AF'}}>
                  Updating...
                </span>
              )}
            </div>
          )}
          {/* Manager status update */}
          {isManager && !isClosed && (
            <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
              <span style={{fontSize:'12px',color:'#6B7280',fontWeight:'500'}}>
                Update status:
              </span>
              <select onChange={e=>handleStatusChange(e.target.value)}
                defaultValue="" disabled={updatingStatus}
                style={{padding:'7px 28px 7px 10px',
                  border:'1.5px solid #7C3AED',borderRadius:'7px',
                  fontSize:'12px',fontFamily:'inherit',outline:'none',
                  background:'#fff',cursor:'pointer',fontWeight:'700',
                  color:'#7C3AED',WebkitAppearance:'none',appearance:'none'}}>
                <option value="" disabled>Change status...</option>
                <option value="1">Open</option>
                <option value="2">In Progress</option>
                <option value="3">On Hold</option>
                <option value="4">Resolved</option>
                <option value="6">🔄 Reopened</option>
                <option value="5">Closed</option>
              </select>
            </div>
          )}
        </div>

        {/* Visual step tracker */}
        <div style={{display:'flex',alignItems:'center'}}>
          {STATUS_STEPS.map((step,index)=>{
            const isDone    = index <= currentStepIndex;
            const isCurrent = index === currentStepIndex;
            return (
              <React.Fragment key={step}>
                <div style={{display:'flex',flexDirection:'column',
                  alignItems:'center',gap:'6px',flex:1}}>
                  <div style={{width:'32px',height:'32px',borderRadius:'50%',
                    background:isCurrent?'#4F46E5':isDone?'#10B981':'#F1F5F9',
                    border:`3px solid ${isCurrent?'#4F46E5':isDone?'#10B981':'#E2E8F0'}`,
                    display:'flex',alignItems:'center',justifyContent:'center',
                    fontSize:'13px',fontWeight:'700',
                    color:isDone||isCurrent?'#fff':'#9CA3AF',
                    transition:'all 0.3s'}}>
                    {isDone&&!isCurrent?'✓':index+1}
                  </div>
                  <div style={{fontSize:'11px',
                    fontWeight:isCurrent?'700':'500',
                    color:isCurrent?'#4F46E5':isDone?'#10B981':'#9CA3AF',
                    textAlign:'center',whiteSpace:'nowrap'}}>
                    {step}
                  </div>
                </div>
                {index<STATUS_STEPS.length-1&&(
                  <div style={{height:'3px',flex:1,
                    background:index<currentStepIndex?'#10B981':'#E2E8F0',
                    marginBottom:'18px',transition:'background 0.3s'}}/>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* SLA bar */}
        {sla && (
          <div style={{marginTop:'14px',padding:'10px 14px',
            background:'#F8FAFC',borderRadius:'8px'}}>
            <div style={{display:'flex',justifyContent:'space-between',
              fontSize:'12px',marginBottom:'6px'}}>
              <span style={{color:'#6B7280',fontWeight:'600'}}>
                SLA Status
              </span>
              <span style={{fontWeight:'700',color:sla.color}}>
                {sla.text}
              </span>
            </div>
            <div style={{height:'6px',background:'#E2E8F0',
              borderRadius:'999px',overflow:'hidden'}}>
              <div style={{height:'100%',width:`${sla.pct}%`,
                background:sla.color,borderRadius:'999px',
                transition:'width 0.5s'}}/>
            </div>
          </div>
        )}
      </div>

      {/* Two column layout */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 300px',
        gap:'20px',alignItems:'start'}}>

        {/* LEFT — Description + Comments */}
        <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>

          {/* Description */}
          <div style={{background:'#fff',border:'1px solid #E2E8F0',
            borderRadius:'12px',padding:'20px 24px',
            boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
            <div style={{fontSize:'14px',fontWeight:'700',color:'#1E293B',
              marginBottom:'12px'}}>Description</div>
            <div style={{fontSize:'14px',color:'#374151',lineHeight:'1.7',
              whiteSpace:'pre-wrap'}}>
              {ticket?.Description || 'No description provided.'}
            </div>
          </div>

          {/* CSAT Rating Component - Show if user can rate and hasn't rated yet */}
          {canRate && !alreadyRated && (
            <CSATRating
              ticketId={ticket?.TicketID}
              onSuccess={() => {
                setCanRate(false);
                setAlreadyRated(true);
              }}
              onError={(msg) => console.error('Rating error:', msg)}
            />
          )}
          
          {/* Debug: Show if canRate is false to help diagnose */}
          {!canRate && ticket?.TicketID && (
            <div style={{fontSize:'12px',color:'#999',padding:'10px',marginBottom:'10px'}}>
              {/* Rating not available for this ticket */}
            </div>
          )}

          {/* Comments */}
          <div style={{background:'#fff',border:'1px solid #E2E8F0',
            borderRadius:'12px',padding:'20px 24px',
            boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
            <div style={{fontSize:'14px',fontWeight:'700',color:'#1E293B',
              marginBottom:'16px'}}>
              Comments ({comments.length})
            </div>

            {/* Comment list */}
            {comments.length===0 ? (
              <div style={{textAlign:'center',padding:'24px',
                color:'#9CA3AF',fontSize:'13px'}}>
                No comments yet
              </div>
            ) : (
              <div style={{display:'flex',flexDirection:'column',
                gap:'12px',marginBottom:'20px'}}>
                {comments.map((c,i)=>{
                  const commentUserId = Number(c.UserID || c.UserId || c.userId || c.userid);
                  const isMe = Number.isFinite(currentUserId) && Number.isFinite(commentUserId)
                    ? commentUserId === currentUserId
                    : false;
                  return (
                    <div key={i} style={{display:'flex',gap:'10px',
                      flexDirection:isMe?'row-reverse':'row'}}>
                      <div style={{width:'32px',height:'32px',
                        borderRadius:'50%',
                        background:c.IsInternal?'#FEF3C7':
                          isMe?'#EEF2FF':'#F1F5F9',
                        border:`1px solid ${c.IsInternal?'#FCD34D':
                          isMe?'#C7D2FE':'#E2E8F0'}`,
                        display:'flex',alignItems:'center',
                        justifyContent:'center',fontSize:'12px',
                        fontWeight:'700',
                        color:c.IsInternal?'#92400E':
                          isMe?'#4F46E5':'#374151',
                        flexShrink:0}}>
                        {(c.UserName||'U').charAt(0).toUpperCase()}
                      </div>
                      <div style={{maxWidth:'78%'}}>
                        {c.IsInternal&&(
                          <div style={{fontSize:'10px',fontWeight:'700',
                            color:'#92400E',textTransform:'uppercase',
                            letterSpacing:'0.05em',marginBottom:'3px',
                            textAlign:isMe?'right':'left'}}>
                            Internal
                          </div>
                        )}
                        <div style={{padding:'10px 14px',
                          background:c.IsInternal?'#FFFBEB':
                            isMe?'#EEF2FF':'#F8FAFC',
                          border:`1px solid ${c.IsInternal?'#FCD34D':
                            isMe?'#C7D2FE':'#E2E8F0'}`,
                          borderRadius:isMe
                            ?'12px 12px 2px 12px'
                            :'12px 12px 12px 2px',
                          fontSize:'13px',color:'#374151',lineHeight:'1.6'}}>
                          {c.Content || c.CommentText}
                        </div>
                        <div style={{fontSize:'11px',color:'#9CA3AF',
                          marginTop:'4px',
                          textAlign:isMe?'right':'left'}}>
                          {c.UserName} · {timeAgo(c.CreatedAt)}
                          {c.UserRole&&(
                            <span style={{marginLeft:'4px',
                              background:'#F1F5F9',color:'#6B7280',
                              padding:'1px 5px',borderRadius:'4px',
                              fontSize:'10px'}}>
                              {c.UserRole}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add comment form */}
            {!isClosed ? (
              <form onSubmit={handleComment}>
                <div style={{borderTop:'1px solid #F1F5F9',paddingTop:'16px'}}>
                  {/* Internal/Public toggle — only for Manager + Engineer + Admin */}
                  {(isManager||isEngineer||isAdmin)&&(
                    <div style={{display:'flex',gap:'8px',marginBottom:'10px'}}>
                      {[
                        {val:false,label:'Public Comment',
                          desc:'Client will see this'},
                        {val:true, label:'Internal Note',
                          desc:'Team only — client cannot see'},
                      ].map(opt=>(
                        <button key={String(opt.val)} type="button"
                          onClick={()=>setIsInternal(opt.val)}
                          style={{flex:1,padding:'8px 12px',
                            background:isInternal===opt.val
                              ?opt.val?'#FFFBEB':'#EEF2FF'
                              :'#F8FAFC',
                            border:`1.5px solid ${isInternal===opt.val
                              ?opt.val?'#F59E0B':'#4F46E5'
                              :'#E2E8F0'}`,
                            borderRadius:'8px',fontSize:'12px',
                            fontWeight:'700',
                            color:isInternal===opt.val
                              ?opt.val?'#92400E':'#4F46E5'
                              :'#6B7280',
                            cursor:'pointer',fontFamily:'inherit',
                            textAlign:'center',transition:'all 0.15s'}}>
                          <div>{opt.label}</div>
                          <div style={{fontSize:'10px',fontWeight:'400',
                            opacity:0.8,marginTop:'1px'}}>
                            {opt.desc}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {commentSuccess&&(
                    <div style={{background:'#F0FDF4',
                      border:'1px solid #BBF7D0',color:'#065F46',
                      borderRadius:'8px',padding:'8px 12px',
                      fontSize:'12px',marginBottom:'8px'}}>
                      Comment posted successfully!
                    </div>
                  )}
                  <textarea value={comment}
                    onChange={e=>setComment(e.target.value)}
                    placeholder={isInternal
                      ?"Add internal note — only visible to Manager and Engineer..."
                      :"Add a comment — client will see this..."}
                    disabled={commentLoading} rows={3}
                    style={{width:'100%',padding:'10px 13px',
                      border:`1.5px solid ${isInternal?'#FCD34D':'#E2E8F0'}`,
                      borderRadius:'8px',fontSize:'13px',
                      fontFamily:'Inter,sans-serif',resize:'vertical',
                      minHeight:'80px',outline:'none',
                      boxSizing:'border-box',color:'#1E293B',
                      background:isInternal?'#FFFBEB':'#fff',
                      transition:'border-color 0.15s'}}
                    onFocus={e=>e.target.style.borderColor=
                      isInternal?'#F59E0B':'#4F46E5'}
                    onBlur={e=>e.target.style.borderColor=
                      isInternal?'#FCD34D':'#E2E8F0'}/>
                  <div style={{display:'flex',justifyContent:'flex-end',
                    marginTop:'8px'}}>
                    <button type="submit"
                      disabled={commentLoading||!comment.trim()}
                      style={{padding:'9px 18px',
                        background:commentLoading||!comment.trim()
                          ?'#9CA3AF':isInternal?'#F59E0B':'#4F46E5',
                        color:'#fff',border:'none',borderRadius:'8px',
                        fontSize:'13px',fontWeight:'700',
                        cursor:commentLoading||!comment.trim()
                          ?'not-allowed':'pointer',
                        fontFamily:'inherit',transition:'all 0.15s'}}>
                      {commentLoading?'Posting...'
                        :isInternal?'Save Note'
                        :'Post Comment'}
                    </button>
                  </div>
                </div>
              </form>
            ) : (isManager||isEngineer||isAdmin) ? (
              // Closed ticket: Managers/Engineers can still add internal notes
              <form onSubmit={handleComment}>
                <div style={{borderTop:'1px solid #F1F5F9',paddingTop:'16px'}}>
                  <div style={{background:'#FFFBEB',border:'1px solid #FCD34D',
                    borderRadius:'8px',padding:'10px 12px',marginBottom:'12px',
                    fontSize:'12px',color:'#92400E',fontWeight:'600'}}>
                    Ticket is closed. Only internal notes allowed.
                  </div>
                  {/* Internal-only toggle for closed tickets */}
                  <div style={{display:'flex',gap:'8px',marginBottom:'10px'}}>
                    <button type="button"
                      disabled={true}
                      style={{flex:1,padding:'8px 12px',
                        background:'#F8FAFC',
                        border:'1.5px solid #E2E8F0',
                        borderRadius:'8px',fontSize:'12px',
                        fontWeight:'700',
                        color:'#9CA3AF',
                        cursor:'not-allowed',fontFamily:'inherit',
                        textAlign:'center',opacity:0.5}}>
                      <div>Public Comment</div>
                      <div style={{fontSize:'10px',fontWeight:'400',
                        opacity:0.8,marginTop:'1px'}}>
                        Not available
                      </div>
                    </button>
                    <button type="button"
                      onClick={()=>setIsInternal(true)}
                      style={{flex:1,padding:'8px 12px',
                        background:isInternal?'#FFFBEB':'#F8FAFC',
                        border:`1.5px solid ${isInternal?'#F59E0B':'#E2E8F0'}`,
                        borderRadius:'8px',fontSize:'12px',
                        fontWeight:'700',
                        color:isInternal?'#92400E':'#6B7280',
                        cursor:'pointer',fontFamily:'inherit',
                        textAlign:'center',transition:'all 0.15s'}}>
                      <div>Internal Note</div>
                      <div style={{fontSize:'10px',fontWeight:'400',
                        opacity:0.8,marginTop:'1px'}}>
                        Team only
                      </div>
                    </button>
                  </div>
                  {commentSuccess&&(
                    <div style={{background:'#F0FDF4',
                      border:'1px solid #BBF7D0',color:'#065F46',
                      borderRadius:'8px',padding:'8px 12px',
                      fontSize:'12px',marginBottom:'8px'}}>
                      Internal note added!
                    </div>
                  )}
                  <textarea value={comment}
                    onChange={e=>setComment(e.target.value)}
                    placeholder="Add internal note — only visible to team..."
                    disabled={commentLoading} rows={3}
                    style={{width:'100%',padding:'10px 13px',
                      border:'1.5px solid #FCD34D',
                      borderRadius:'8px',fontSize:'13px',
                      fontFamily:'Inter,sans-serif',resize:'vertical',
                      minHeight:'80px',outline:'none',
                      boxSizing:'border-box',color:'#1E293B',
                      background:'#FFFBEB',
                      transition:'border-color 0.15s'}}
                    onFocus={e=>e.target.style.borderColor='#F59E0B'}
                    onBlur={e=>e.target.style.borderColor='#FCD34D'}/>
                  <div style={{display:'flex',justifyContent:'flex-end',
                    marginTop:'8px'}}>
                    <button type="submit"
                      disabled={commentLoading||!comment.trim()}
                      style={{padding:'9px 18px',
                        background:commentLoading||!comment.trim()
                          ?'#9CA3AF':'#F59E0B',
                        color:'#fff',border:'none',borderRadius:'8px',
                        fontSize:'13px',fontWeight:'700',
                        cursor:commentLoading||!comment.trim()
                          ?'not-allowed':'pointer',
                        fontFamily:'inherit',transition:'all 0.15s'}}>
                      {commentLoading?'Posting...':'Save Note'}
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <div style={{borderTop:'1px solid #F1F5F9',paddingTop:'14px',
                textAlign:'center',fontSize:'13px',color:'#9CA3AF'}}>
                This ticket is closed — no further comments allowed
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — Ticket info + Audit log */}
        <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>

          {/* Ticket info */}
          <div style={{background:'#fff',border:'1px solid #E2E8F0',
            borderLeft:'4px solid #4F46E5',
            borderRadius:'12px',padding:'18px',
            boxShadow:'0 4px 12px rgba(79, 70, 229, 0.12)'}}>
            <div style={{fontSize:'14px',fontWeight:'700',color:'#1E293B',
              marginBottom:'14px'}}>Ticket Info</div>
            {[
              {label:'Ticket ID',   value:`#${ticket?.TicketID}`},
              {label:'Status',      value:ticket?.StatusName},
              {label:'Priority',    value:ticket?.PriorityName},
              {label:'Company',     value:ticket?.CompanyName},
              ...(ticket?.ProductName ? [{label:'Product',    value:`${ticket.ProductName} v${ticket.ProductVersion}`}] : []),
              {label:'Created by',  value:ticket?.CreatedByName},
              {label:'Assigned to', value:ticket?.AssignedToName||'Not assigned'},
              {label:'Created',     value:new Date(ticket?.CreatedAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})},
              {label:'SLA Deadline',value:ticket?.SLADeadline?new Date(ticket.SLADeadline).toLocaleDateString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'Not set'},
            ].map(item=>(
              <div key={item.label} style={{display:'flex',
                flexDirection:'column',gap:'2px',
                padding:'8px 0',borderBottom:'1px solid #F8FAFC'}}>
                <span style={{fontSize:'11px',fontWeight:'600',
                  color:'#9CA3AF',textTransform:'uppercase',
                  letterSpacing:'0.05em'}}>
                  {item.label}
                </span>
                <span style={{fontSize:'13px',fontWeight:'600',
                  color:'#1E293B'}}>
                  {item.value}
                </span>
              </div>
            ))}

              <button
                onClick={() => navigate(isAdmin ? `/admin/tickets/${ticket?.TicketID}/activity` : `/tickets/${ticket?.TicketID}/activity`)}
                style={{
                  marginTop: '10px',
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #C7D2FE',
                  background: '#EEF2FF',
                  color: '#4338CA',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                View Full Activity Log
              </button>
          </div>

          {/* Activity log moved to separate page */}
        </div>

      </div>
    </div>
  );
}
