import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';

const S = {
  'Open':        { bg:'#D1FAE5', color:'#065F46', dot:'#10B981' },
  'In Progress': { bg:'#DBEAFE', color:'#1E40AF', dot:'#4F46E5' },
  'Resolved':    { bg:'#CCFBF1', color:'#134E4A', dot:'#06B6D4' },
  'Closed':      { bg:'#F3F4F6', color:'#374151', dot:'#9CA3AF' },
};
const P = {
  'Critical': { bg:'#FEE2E2', color:'#991B1B', dot:'#EF4444', bdr:'#FECACA' },
  'High':     { bg:'#FFEDD5', color:'#9A3412', dot:'#F59E0B', bdr:'#FED7AA' },
  'Medium':   { bg:'#FEF9C3', color:'#713F12', dot:'#EAB308', bdr:'#FEF08A' },
  'Low':      { bg:'#F0FDF4', color:'#166534', dot:'#10B981', bdr:'#BBF7D0' },
};
const FRIENDLY = {
  'Open':'We received your request',
  'In Progress':'Our team is working on it',
  'Resolved':'Solution has been provided',
  'Closed':'Issue completed',
};

const getTicketId = (ticket) => ticket?.TicketId || ticket?.TicketID || ticket?.ticketId || null;

function getSLA(deadline, isOverdue, status) {
  if (isOverdue && ['Open', 'In Progress'].includes(status)) return { text:'Overdue', color:'#EF4444', bg:'#FEE2E2' };
  if (!deadline) return null;
  const diff = new Date(deadline) - new Date();
  if (diff <= 0) return { text:'Overdue', color:'#EF4444', bg:'#FEE2E2' };
  const hrs = Math.round(diff / 36e5);
  if (hrs < 4)  return { text:`${hrs}h left`, color:'#EF4444', bg:'#FEE2E2' };
  if (hrs < 12) return { text:`${hrs}h left`, color:'#F59E0B', bg:'#FEF3C7' };
  return { text:`${hrs}h left`, color:'#10B981', bg:'#D1FAE5' };
}

export default function PortalTickets() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const PAGE_SIZE = 25;
  const [tickets, setTickets]   = useState([]);
  const [allTicketCache, setAllTicketCache] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch]     = useState('');
  const [tab, setTab]           = useState('');
  const [priority, setPriority] = useState('');
  const [sort, setSort]         = useState('newest');
  const [view, setView]         = useState('list');
  const [loading, setLoading]   = useState(true);

  // Handle status filter from URL params
  useEffect(() => {
    const statusParam = searchParams.get('status');
    if (statusParam === 'open') setTab('Open');
    else if (statusParam === 'inProgress') setTab('In Progress');
    else if (statusParam === 'resolved') setTab('ResolvedOrClosed');
    else if (statusParam === 'all') setTab('');
  }, [searchParams]);

  useEffect(() => { fetchTickets(1, false); }, []);

  useEffect(() => {
    let r = [...tickets];
    if (search) r = r.filter(t =>
      t.Title?.toLowerCase().includes(search.toLowerCase()) ||
      String(getTicketId(t) || '').includes(search));
    if (tab === 'ResolvedOrClosed') {
      r = r.filter(t => ['Resolved', 'Closed'].includes(t.StatusName));
    } else if (tab === 'Reopened') {
      r = r.filter(t => t.StatusName === 'Reopened');
    } else if (tab) {
      r = r.filter(t => t.StatusName === tab);
    }
    if (priority) r = r.filter(t => t.PriorityName === priority);
    const ord = {Critical:0,High:1,Medium:2,Low:3};
    if (sort==='newest')   r.sort((a,b)=>new Date(b.CreatedAt)-new Date(a.CreatedAt));
    if (sort==='oldest')   r.sort((a,b)=>new Date(a.CreatedAt)-new Date(b.CreatedAt));
    if (sort==='priority') r.sort((a,b)=>(ord[a.PriorityName]||4)-(ord[b.PriorityName]||4));
    if (sort==='sla')      r.sort((a,b)=>{
      const at=a.SLADeadline?new Date(a.SLADeadline):new Date(9e15);
      const bt=b.SLADeadline?new Date(b.SLADeadline):new Date(9e15);
      return at-bt;
    });
    setFiltered(r);
  }, [tickets, search, tab, priority, sort]);

  const visibleFiltered = filtered;

  async function fetchTickets(targetPage = 1, append = false) {
    try {
      if (!append) setLoading(true);
      const res = await api.get('/tickets', {
        params: { page: targetPage, limit: PAGE_SIZE },
      });
      const rawData = res.data?.data || [];
      const allItems = Array.isArray(rawData) ? rawData : [];
      const hasServerPagination =
        typeof res.data?.hasMore === 'boolean' || typeof res.data?.total === 'number';

      if (hasServerPagination) {
        setTickets((prev) => (append ? [...prev, ...allItems] : allItems));
        setHasMore(Boolean(res.data?.hasMore));
        setTotalCount(Number(res.data?.total || allItems.length));
      } else {
        // Fallback for older backend responses that return full dataset.
        if (!append) {
          const firstPage = allItems.slice(0, PAGE_SIZE);
          setAllTicketCache(allItems);
          setTickets(firstPage);
          setHasMore(firstPage.length < allItems.length);
          setTotalCount(allItems.length);
        } else {
          const start = (targetPage - 1) * PAGE_SIZE;
          const nextPage = allTicketCache.slice(start, start + PAGE_SIZE);
          setTickets((prev) => [...prev, ...nextPage]);
          setHasMore(start + nextPage.length < allTicketCache.length);
          setTotalCount(allTicketCache.length);
        }
      }

      setPage(targetPage);
    } catch(e) { console.error(e); setTickets([]); }
    finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }

  const counts = {
    all: tickets.length,
    open: tickets.filter(t=>t.StatusName==='Open').length,
    progress: tickets.filter(t=>t.StatusName==='In Progress').length,
    done: tickets.filter(t=>['Resolved','Closed'].includes(t.StatusName)).length,
  };

  const hasFilter = search||tab||priority||sort!=='newest';

  const clear = () => { setSearch(''); setTab(''); setPriority(''); setSort('newest'); };

  const css = `
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
    .tk-row:hover{background:#F8FAFC!important;}
    .tk-card:hover{transform:translateY(-3px)!important;box-shadow:0 8px 24px rgba(0,0,0,0.1)!important;}
    select{-webkit-appearance:none;-moz-appearance:none;appearance:none;}
    input::placeholder{color:#9CA3AF;}
  `;

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',
      minHeight:'400px',flexDirection:'column',gap:'14px',
      fontFamily:'Inter,sans-serif'}}>
      <style>{css}</style>
      <div style={{width:'32px',height:'32px',border:'3px solid #E2E8F0',
        borderTopColor:'#4F46E5',borderRadius:'50%',
        animation:'spin 0.8s linear infinite'}}/>
      <span style={{color:'#9CA3AF',fontSize:'14px'}}>Loading your tickets...</span>
    </div>
  );

  return (
    <div style={{fontFamily:'Inter,-apple-system,sans-serif',
      minHeight:'100vh',background:'#F8FAFC'}}>
      <style>{css}</style>

      {/* â”€â”€ TOP HEADER â”€â”€ */}
      <div style={{background:'linear-gradient(135deg, #1E1B4B 0%, #4C1D95 60%, #4F46E5 100%)',
        padding:'24px 36px',position:'sticky',top:0,zIndex:10,
        borderRadius:'12px',margin:'24px',border:'1px solid rgba(255,255,255,0.2)',
        boxShadow:'0 8px 24px rgba(79,70,229,0.3)'}}>
        <div style={{display:'flex',alignItems:'center',
          justifyContent:'space-between',gap:'16px',marginBottom:'20px'}}>
          <div>
            <h1 style={{fontSize:'24px',fontWeight:'700',color:'#FFFFFF',
              margin:'0 0 4px',fontFamily:'Inter,sans-serif'}}>
              My Tickets
            </h1>
            <p style={{fontSize:'13px',color:'rgba(255,255,255,0.8)',margin:0}}>
              Showing <strong style={{color:'#FFFFFF'}}>{filtered.length}</strong> of{' '}
              <strong style={{color:'#FFFFFF'}}>{totalCount || tickets.length}</strong> tickets
            </p>
          </div>
          <button onClick={()=>navigate('/client/tickets/new')}
            style={{padding:'10px 20px',background:'rgba(255,255,255,0.2)',color:'#fff',
              border:'1px solid rgba(255,255,255,0.3)',borderRadius:'8px',fontSize:'13px',fontWeight:'700',
              cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap',
              boxShadow:'0 4px 12px rgba(0,0,0,0.1)',transition:'all 0.15s'}}
            onMouseEnter={e=>e.currentTarget.style.transform='translateY(-1px)'}
            onMouseLeave={e=>e.currentTarget.style.transform='none'}>
            + Raise New Ticket
          </button>
        </div>

      </div>

      <div style={{padding:'20px 36px'}}>

        {/* â”€â”€ FILTER BAR â”€â”€ */}
        <div style={{background:'#fff',border:'1px solid #E2E8F0',
          borderRadius:'12px',padding:'14px 16px',marginBottom:'12px',
          boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
          <div style={{display:'flex',gap:'10px',alignItems:'center',flexWrap:'wrap'}}>

            {/* Search */}
            <div style={{position:'relative',flex:'1',minWidth:'220px'}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"
                style={{position:'absolute',left:'12px',top:'50%',
                  transform:'translateY(-50%)',pointerEvents:'none'}}>
                <circle cx="11" cy="11" r="8"/>
                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input type="text"
                placeholder="Search by ticket ID or title..."
                value={search} onChange={e=>setSearch(e.target.value)}
                style={{width:'100%',padding:'9px 36px',border:'1.5px solid #E2E8F0',
                  borderRadius:'8px',fontSize:'13px',fontFamily:'Inter,sans-serif',
                  outline:'none',boxSizing:'border-box',color:'#1E293B',
                  transition:'border-color 0.15s',background:'#F8FAFC'}}
                onFocus={e=>{e.target.style.borderColor='#4F46E5';e.target.style.background='#fff'}}
                onBlur={e=>{e.target.style.borderColor='#E2E8F0';e.target.style.background='#F8FAFC'}}/>
              {search&&(
                <button onClick={()=>setSearch('')}
                  style={{position:'absolute',right:'10px',top:'50%',
                    transform:'translateY(-50%)',background:'#E5E7EB',border:'none',
                    color:'#6B7280',cursor:'pointer',padding:'0',
                    width:'18px',height:'18px',borderRadius:'50%',
                    fontSize:'12px',display:'flex',alignItems:'center',
                    justifyContent:'center',lineHeight:'1'}}>Ã—</button>
              )}
            </div>

            {/* Status */}
            <div style={{position:'relative'}}>
              <select value={tab} onChange={e=>setTab(e.target.value)}
                style={{padding:'9px 32px 9px 12px',border:`1.5px solid ${tab?'#4F46E5':'#E2E8F0'}`,
                  borderRadius:'8px',fontSize:'13px',fontFamily:'Inter,sans-serif',
                  outline:'none',background:'#fff',cursor:'pointer',
                  color:tab?'#1E293B':'#6B7280',fontWeight:tab?'600':'400',
                  minWidth:'170px',transition:'all 0.15s'}}>
                <option value="">All Tickets</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="On Hold">On Hold</option>
                <option value="Reopened">Reopened</option>
                <option value="ResolvedOrClosed">Resolved / Closed</option>
              </select>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"
                style={{position:'absolute',right:'10px',top:'50%',
                  transform:'translateY(-50%)',pointerEvents:'none'}}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>

            {/* Priority */}
            <div style={{position:'relative'}}>
              <select value={priority} onChange={e=>setPriority(e.target.value)}
                style={{padding:'9px 32px 9px 12px',border:`1.5px solid ${priority?'#4F46E5':'#E2E8F0'}`,
                  borderRadius:'8px',fontSize:'13px',fontFamily:'Inter,sans-serif',
                  outline:'none',background:'#fff',cursor:'pointer',
                  color:priority?'#1E293B':'#6B7280',fontWeight:priority?'600':'400',
                  minWidth:'155px',transition:'all 0.15s'}}>
                <option value="">All Priorities</option>
                <option value="Critical">ðŸ”´ Critical</option>
                <option value="High">ðŸŸ  High</option>
                <option value="Medium">ðŸŸ¡ Medium</option>
                <option value="Low">ðŸŸ¢ Low</option>
              </select>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"
                style={{position:'absolute',right:'10px',top:'50%',
                  transform:'translateY(-50%)',pointerEvents:'none'}}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>

            {/* Sort */}
            <div style={{position:'relative'}}>
              <select value={sort} onChange={e=>setSort(e.target.value)}
                style={{padding:'9px 32px 9px 12px',border:'1.5px solid #E2E8F0',
                  borderRadius:'8px',fontSize:'13px',fontFamily:'Inter,sans-serif',
                  outline:'none',background:'#fff',cursor:'pointer',
                  color:'#6B7280',minWidth:'165px',transition:'all 0.15s'}}>
                <option value="newest">â†“ Newest First</option>
                <option value="oldest">â†‘ Oldest First</option>
                <option value="priority">âš¡ By Priority</option>
                <option value="sla">â±ï¸ By SLA Deadline</option>
              </select>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"
                style={{position:'absolute',right:'10px',top:'50%',
                  transform:'translateY(-50%)',pointerEvents:'none'}}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>

            {/* View toggle */}
            <div style={{display:'flex',border:'1.5px solid #E2E8F0',
              borderRadius:'8px',overflow:'hidden',flexShrink:0}}>
              {[
                {m:'list',svg:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>},
                {m:'grid',svg:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>},
              ].map(v=>(
                <button key={v.m} onClick={()=>setView(v.m)}
                  title={v.m==='list'?'List view':'Grid view'}
                  style={{padding:'8px 11px',
                    background:view===v.m?'#4F46E5':'transparent',
                    color:view===v.m?'#fff':'#6B7280',border:'none',
                    cursor:'pointer',display:'flex',alignItems:'center',
                    transition:'all 0.15s'}}>
                  {v.svg}
                </button>
              ))}
            </div>

            {/* Clear */}
            {hasFilter&&(
              <button onClick={clear}
                style={{padding:'9px 14px',background:'#FEF2F2',color:'#DC2626',
                  border:'1px solid #FECACA',borderRadius:'8px',fontSize:'12px',
                  fontWeight:'700',cursor:'pointer',fontFamily:'inherit',
                  whiteSpace:'nowrap',flexShrink:0}}>
                âœ• Clear
              </button>
            )}
          </div>

          {/* Active filter pills */}
          {(tab||priority)&&(
            <div style={{display:'flex',gap:'6px',marginTop:'10px',
              paddingTop:'10px',borderTop:'1px solid #F1F5F9',flexWrap:'wrap',
              alignItems:'center'}}>
              <span style={{fontSize:'11px',color:'#9CA3AF',fontWeight:'600',
                textTransform:'uppercase',letterSpacing:'0.05em'}}>
                Active:
              </span>
              {tab&&(
                <span style={{background:'#EEF2FF',color:'#4F46E5',padding:'3px 10px',
                  borderRadius:'999px',fontSize:'12px',fontWeight:'600',
                  display:'flex',alignItems:'center',gap:'5px'}}>
                  {tab === 'ResolvedOrClosed' ? 'Resolved / Closed' : tab}
                  <button onClick={()=>setTab('')}
                    style={{background:'none',border:'none',color:'#4F46E5',
                      cursor:'pointer',padding:'0',fontSize:'14px',
                      lineHeight:'1',fontWeight:'700'}}>Ã—</button>
                </span>
              )}
              {priority&&(
                <span style={{background:'#FEF3C7',color:'#92400E',padding:'3px 10px',
                  borderRadius:'999px',fontSize:'12px',fontWeight:'600',
                  display:'flex',alignItems:'center',gap:'5px'}}>
                  {priority}
                  <button onClick={()=>setPriority('')}
                    style={{background:'none',border:'none',color:'#92400E',
                      cursor:'pointer',padding:'0',fontSize:'14px',
                      lineHeight:'1',fontWeight:'700'}}>Ã—</button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* â”€â”€ EMPTY STATE â”€â”€ */}
        {filtered.length===0&&(
          <div style={{background:'#fff',border:'1px solid #E2E8F0',
            borderRadius:'12px',padding:'64px 24px',textAlign:'center',
            boxShadow:'0 1px 3px rgba(0,0,0,0.04)',animation:'fadeIn 0.3s ease'}}>
            <div style={{fontSize:'52px',marginBottom:'16px'}}>
              {tickets.length===0?'ðŸŽ«':'ðŸ”'}
            </div>
            <div style={{fontSize:'18px',fontWeight:'700',color:'#1E293B',
              marginBottom:'8px',fontFamily:'Inter,sans-serif'}}>
              {tickets.length===0?'No tickets yet':'No tickets match your filters'}
            </div>
            <div style={{fontSize:'14px',color:'#9CA3AF',marginBottom:'20px'}}>
              {tickets.length===0
                ?'Raise your first support ticket to get started'
                :'Try adjusting or clearing your search filters'}
            </div>
            {tickets.length===0?(
              <button onClick={()=>navigate('/client/tickets/new')}
                style={{padding:'11px 22px',background:'#4F46E5',color:'#fff',
                  border:'none',borderRadius:'8px',fontSize:'13px',fontWeight:'700',
                  cursor:'pointer',fontFamily:'inherit',
                  boxShadow:'0 4px 12px rgba(79,70,229,0.3)'}}>
                + Raise New Ticket
              </button>
            ):(
              <button onClick={clear}
                style={{padding:'10px 20px',background:'#F3F4F6',color:'#374151',
                  border:'1px solid #E5E7EB',borderRadius:'8px',fontSize:'13px',
                  fontWeight:'600',cursor:'pointer',fontFamily:'inherit'}}>
                Clear All Filters
              </button>
            )}
          </div>
        )}

        {/* â”€â”€ LIST VIEW â”€â”€ */}
        {view==='list'&&filtered.length>0&&(
          <div style={{background:'#fff',border:'1px solid #E2E8F0',
            borderRadius:'12px',overflow:'hidden',
            boxShadow:'0 1px 3px rgba(0,0,0,0.04)',animation:'fadeIn 0.3s ease'}}>
            {visibleFiltered.map((t,i)=>{
              const sla=getSLA(t.SLADeadline,t.IsOverdue,t.StatusName);
              const sc=S[t.StatusName]||S['Open'];
              const pc=P[t.PriorityName]||P['Low'];
              const ticketId = getTicketId(t);
              return (
                <div key={ticketId || `${t.Title}-${i}`} className="tk-row"
                  onClick={()=>ticketId && navigate(`/portal/tickets/${ticketId}`)}
                  style={{display:'flex',alignItems:'center',gap:'14px',
                    padding:'16px 20px',cursor:ticketId ? 'pointer' : 'default',
                    borderBottom:i<visibleFiltered.length-1?'1px solid #F8FAFC':'none',
                    borderLeft:'3px solid transparent',transition:'all 0.12s'}}
                  onMouseEnter={e=>ticketId && (e.currentTarget.style.borderLeftColor=pc.dot)}
                  onMouseLeave={e=>e.currentTarget.style.borderLeftColor='transparent'}>
                  <div style={{width:'10px',height:'10px',borderRadius:'50%',
                    background:pc.dot,flexShrink:0}}/>
                  <div style={{width:'36px',height:'36px',borderRadius:'8px',
                    background:pc.bg,border:`1px solid ${pc.bdr}`,
                    display:'flex',alignItems:'center',justifyContent:'center',
                    fontSize:'12px',fontWeight:'700',color:pc.color,flexShrink:0}}>
                    #{ticketId || '-'}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:'14px',fontWeight:'600',color:'#1E293B',
                      whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',
                      marginBottom:'3px',fontFamily:'Inter,sans-serif'}}>
                      {t.Title}
                    </div>
                    <div style={{fontSize:'12px',color:'#9CA3AF'}}>
                      {FRIENDLY[t.StatusName]} Â·{' '}
                      {new Date(t.CreatedAt).toLocaleDateString('en-IN',{
                        day:'numeric',month:'short',year:'numeric'})}
                    </div>
                  </div>
                  <div style={{display:'flex',gap:'6px',alignItems:'center',flexShrink:0}}>
                    {sla&&(
                      <span style={{background:sla.bg,color:sla.color,
                        padding:'3px 9px',borderRadius:'999px',
                        fontSize:'11px',fontWeight:'700'}}>
                        â± {sla.text}
                      </span>
                    )}
                    <span style={{background:pc.bg,color:pc.color,
                      padding:'3px 9px',borderRadius:'999px',
                      fontSize:'11px',fontWeight:'700'}}>
                      {t.PriorityName}
                    </span>
                    <span style={{background:sc.bg,color:sc.color,
                      padding:'3px 9px',borderRadius:'999px',
                      fontSize:'11px',fontWeight:'700'}}>
                      {t.StatusName}
                    </span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                      stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* â”€â”€ GRID VIEW â”€â”€ */}
        {view==='grid'&&filtered.length>0&&(
          <div style={{display:'grid',
            gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',
            gap:'14px',animation:'fadeIn 0.3s ease'}}>
            {visibleFiltered.map(t=>{
              const sla=getSLA(t.SLADeadline,t.IsOverdue,t.StatusName);
              const sc=S[t.StatusName]||S['Open'];
              const pc=P[t.PriorityName]||P['Low'];
              const ticketId = getTicketId(t);
              return (
                <div key={ticketId || t.Title} className="tk-card"
                  onClick={()=>ticketId && navigate(`/portal/tickets/${ticketId}`)}
                  style={{background:'#fff',border:`1px solid ${pc.bdr}`,
                    borderTop:`3px solid ${pc.dot}`,borderRadius:'12px',
                    padding:'16px 18px',cursor:ticketId ? 'pointer' : 'default',
                    boxShadow:'0 1px 3px rgba(0,0,0,0.06)',transition:'all 0.2s'}}>
                  <div style={{display:'flex',alignItems:'center',
                    justifyContent:'space-between',marginBottom:'10px'}}>
                    <span style={{background:pc.bg,color:pc.color,
                      padding:'2px 8px',borderRadius:'999px',
                      fontSize:'11px',fontWeight:'700'}}>
                      #{ticketId || '-'}
                    </span>
                    {sla&&(
                      <span style={{background:sla.bg,color:sla.color,
                        padding:'2px 8px',borderRadius:'999px',
                        fontSize:'11px',fontWeight:'700'}}>
                        â± {sla.text}
                      </span>
                    )}
                  </div>
                  <div style={{fontSize:'14px',fontWeight:'700',color:'#1E293B',
                    marginBottom:'6px',lineHeight:'1.4',
                    fontFamily:'Inter,sans-serif',
                    display:'-webkit-box',WebkitLineClamp:2,
                    WebkitBoxOrient:'vertical',overflow:'hidden'}}>
                    {t.Title}
                  </div>
                  <div style={{fontSize:'12px',color:'#9CA3AF',marginBottom:'12px'}}>
                    {new Date(t.CreatedAt).toLocaleDateString('en-IN',{
                      day:'numeric',month:'short',year:'numeric'})}
                  </div>
                  <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
                    <span style={{background:sc.bg,color:sc.color,
                      padding:'3px 9px',borderRadius:'999px',
                      fontSize:'11px',fontWeight:'700'}}>
                      {t.StatusName}
                    </span>
                    <span style={{background:pc.bg,color:pc.color,
                      padding:'3px 9px',borderRadius:'999px',
                      fontSize:'11px',fontWeight:'700'}}>
                      {t.PriorityName}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {hasMore && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '14px' }}>
            <button
              type="button"
              onClick={() => {
                if (loadingMore) return;
                setLoadingMore(true);
                fetchTickets(page + 1, true);
              }}
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
                fontFamily: 'inherit',
              }}
            >
              {loadingMore ? 'Loading...' : 'Load More Tickets'}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

