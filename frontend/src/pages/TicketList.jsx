import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import api from '../services/api';

const STATUS_COLORS = {
  'Open':        { bg:'#D1FAE5', color:'#065F46', dot:'#10B981' },
  'In Progress': { bg:'#DBEAFE', color:'#1E40AF', dot:'#4F46E5' },
  'On Hold':     { bg:'#FEF3C7', color:'#92400E', dot:'#EAB308' },
  'Resolved':    { bg:'#CCFBF1', color:'#134E4A', dot:'#06B6D4' },
  'Closed':      { bg:'#F3F4F6', color:'#374151', dot:'#9CA3AF' },
};
const PRIORITY_COLORS = {
  'Critical': { bg:'#FEE2E2', color:'#991B1B', dot:'#EF4444' },
  'High':     { bg:'#FFEDD5', color:'#9A3412', dot:'#F59E0B' },
  'Medium':   { bg:'#FEF9C3', color:'#713F12', dot:'#EAB308' },
  'Low':      { bg:'#F0FDF4', color:'#166534', dot:'#10B981' },
};

const ProfessionalSelect = ({ value, onChange, options, placeholder }) => {
  const [searchText, setSearchText] = useState('');

  const filtered = options.filter((opt) =>
    opt.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <div style={{ width: '100%' }}>
      <input
        type="text"
        placeholder="Search..."
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        style={{
          width: '100%',
          padding: '10px 12px',
          border: '1px solid #E5E7EB',
          borderRadius: '8px 8px 0 0',
          fontSize: '14px',
          outline: 'none',
          marginBottom: '8px',
        }}
        autoFocus
      />
      <div
        style={{
          maxHeight: '180px',
          overflowY: 'auto',
          border: '1px solid #E5E7EB',
          borderTop: 'none',
          borderRadius: '0 0 8px 8px',
        }}
      >
        <div
          onClick={() => onChange('')}
          style={{
            padding: '10px 12px',
            cursor: 'pointer',
            backgroundColor: value === '' ? '#EEF2FF' : '#fff',
            borderLeft: value === '' ? '4px solid #3B82F6' : '4px solid transparent',
            color: '#374151',
            fontWeight: value === '' ? '600' : '500',
            fontSize: '14px',
            transition: 'all 0.15s',
          }}
        >
          {placeholder || 'All'}
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: '12px', color: '#9CA3AF', textAlign: 'center', fontSize: '13px' }}>
            No options found
          </div>
        ) : (
          filtered.map((opt) => (
            <div
              key={opt}
              onClick={() => onChange(opt)}
              style={{
                padding: '10px 12px',
                cursor: 'pointer',
                backgroundColor: value === opt ? '#F3F4F6' : '#fff',
                borderLeft: value === opt ? '4px solid #3B82F6' : '4px solid transparent',
                color: value === opt ? '#1F2937' : '#6B7280',
                fontWeight: value === opt ? '600' : '400',
                fontSize: '14px',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F9FAFB';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = value === opt ? '#F3F4F6' : '#fff';
              }}
            >
              {opt}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default function TicketList() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const isManager  = user?.role === 'Manager';
  const PAGE_SIZE = 25;

  const [tickets, setTickets]       = useState([]);
  const [allTicketCache, setAllTicketCache] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [openFilterKey, setOpenFilterKey] = useState(null);
  const [columnFilters, setColumnFilters] = useState({
    id: '',
    title: '',
    company: '',
    priority: '',
    status: '',
    assignedTo: '',
  });

  useEffect(() => { fetchTickets(1, false); }, []);

  useEffect(() => {
    const onOutsideClick = (e) => {
      if (!e.target.closest('.header-filter-wrap')) setOpenFilterKey(null);
    };
    document.addEventListener('mousedown', onOutsideClick);
    return () => document.removeEventListener('mousedown', onOutsideClick);
  }, []);

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

  const finalFiltered = tickets.filter((t) => {
    const idText = String(t.TicketID || '').toLowerCase();
    const titleText = (t.Title || '').toLowerCase();
    const companyText = (t.CompanyName || '').toLowerCase();
    const priorityText = (t.PriorityName || '').toLowerCase();
    const statusText = (t.StatusName || '').toLowerCase();
    const assignedText = (t.AssignedToName || '').toLowerCase();

    const matchId = !columnFilters.id || idText.includes(columnFilters.id.toLowerCase().replace('#', ''));
    const matchTitle = !columnFilters.title || titleText.includes(columnFilters.title.toLowerCase());
    const matchCompany = !columnFilters.company || companyText === columnFilters.company.toLowerCase();
    const matchPriority = !columnFilters.priority || priorityText === columnFilters.priority.toLowerCase();
    const matchStatus = !columnFilters.status || statusText === columnFilters.status.toLowerCase();
    const matchAssigned = !columnFilters.assignedTo || assignedText.includes(columnFilters.assignedTo.toLowerCase());

    return matchId && matchTitle && matchCompany && matchPriority && matchStatus && matchAssigned;
  });

  const visibleFiltered = finalFiltered;

  const uniqueCompanies = [...new Set(tickets.map((t) => t.CompanyName).filter(Boolean))].sort();
  const uniquePriorities = [...new Set(tickets.map((t) => t.PriorityName).filter(Boolean))].sort();
  const uniqueStatuses = [...new Set(tickets.map((t) => t.StatusName).filter(Boolean))].sort();

  const HeaderCell = ({ label, keyName, type = 'text', options = [] }) => {
    const isOpen = openFilterKey === keyName;

    return (
      <th style={{ position: 'relative', padding: '11px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        <div className="header-filter-wrap" style={{ position: 'relative', display: 'inline-block' }}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpenFilterKey(isOpen ? null : keyName);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'transparent',
              border: 'none',
              color: 'inherit',
              font: 'inherit',
              fontWeight: 700,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            {label}
            <span style={{ fontSize: 11, opacity: 0.8 }}>▼</span>
          </button>

          {isOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: 0,
                zIndex: 30,
                background: '#fff',
                border: '1px solid #E5E7EB',
                borderRadius: 10,
                minWidth: 220,
                boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
                padding: '10px',
              }}
            >
              {type === 'select' ? (
                <ProfessionalSelect
                  value={columnFilters[keyName]}
                  onChange={(val) => {
                    setColumnFilters((p) => ({ ...p, [keyName]: val }));
                    setOpenFilterKey(null);
                  }}
                  options={options}
                  placeholder={`All ${label}`}
                />
              ) : (
                <input
                  type="text"
                  value={columnFilters[keyName]}
                  onChange={(e) => {
                    setColumnFilters((p) => ({ ...p, [keyName]: e.target.value }));
                  }}
                  placeholder={`Search ${label}...`}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #E2E8F0', borderRadius: '8px', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }}
                  autoFocus
                />
              )}
            </div>
          )}
        </div>
      </th>
    );
  };

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',fontFamily:'Inter,-apple-system,sans-serif'}}>

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {isManager ? 'All Tickets' : 'My Assigned Tickets'}
          </h1>
          <p className="page-welcome">
            {finalFiltered.length} ticket{finalFiltered.length!==1?'s':''} loaded{totalCount ? ` of ${totalCount}` : ''}
          </p>
        </div>
      </div>

      <div className="page-content-wrapper" style={{fontFamily:'Inter,-apple-system,sans-serif'}}>

      {/* Table */}
      {loading ? (
        <div style={{textAlign:'center',padding:'48px',
          color:'#9CA3AF',fontSize:'14px'}}>Loading...</div>
      ) : (
        <>
        <div className="manager-desktop-table" style={{background:'#fff',border:'1px solid #E2E8F0',
          borderRadius:'12px',overflow:'hidden',
          boxShadow:'0 1px 3px rgba(0,0,0,0.04)'}}>
          <table style={{width:'100%',borderCollapse:'collapse',
            fontSize:'14px',fontFamily:'Inter,-apple-system,sans-serif'}}>
            <thead>
              <tr style={{background:'#F8FAFC',borderBottom:'2px solid #E2E8F0'}}>
                <HeaderCell label="#" keyName="id" />
                <HeaderCell label="Title" keyName="title" />
                <HeaderCell label="Company" keyName="company" type="select" options={uniqueCompanies} />
                <HeaderCell label="Priority" keyName="priority" type="select" options={uniquePriorities} />
                <HeaderCell label="Status" keyName="status" type="select" options={uniqueStatuses} />
                <HeaderCell label="Assigned To" keyName="assignedTo" />
                <th style={{padding:'11px 14px',textAlign:'left',fontSize:'11px',fontWeight:'700',color:'#6B7280',textTransform:'uppercase',letterSpacing:'0.06em'}}>SLA</th>
                <th style={{padding:'11px 14px',textAlign:'left',fontSize:'11px',fontWeight:'700',color:'#6B7280',textTransform:'uppercase',letterSpacing:'0.06em'}}>Action</th>
              </tr>
            </thead>
            <tbody>
              {finalFiltered.length===0 ? (
                <tr><td colSpan="8"
                  style={{textAlign:'center',padding:'48px',
                    color:'#9CA3AF',fontSize:'14px'}}>
                  {tickets.length===0
                    ?'No tickets yet'
                    :'No tickets match filters'}
                </td></tr>
              ) : visibleFiltered.map((t,i)=>{
                const sc = STATUS_COLORS[t.StatusName]   || STATUS_COLORS['Open'];
                const pc = PRIORITY_COLORS[t.PriorityName] || PRIORITY_COLORS['Low'];
                const slaHrs = t.SLADeadline
                  ? Math.round((new Date(t.SLADeadline)-new Date())/36e5)
                  : null;
                const slaColor = (t.IsOverdue && ['Open', 'In Progress'].includes(t.StatusName))||slaHrs<0
                  ? '#EF4444' : slaHrs<4 ? '#EF4444'
                  : slaHrs<12 ? '#F59E0B' : '#10B981';
                return (
                  <tr key={t.TicketID}
                    style={{borderBottom:i<visibleFiltered.length-1
                      ?'1px solid #F1F5F9':'none',
                      cursor:'pointer',transition:'all 0.12s',
                      borderLeft:'3px solid transparent'}}
                    onMouseEnter={e=>{
                      e.currentTarget.style.background='#F8FAFC';
                      e.currentTarget.style.borderLeftColor=pc.dot;
                    }}
                    onMouseLeave={e=>{
                      e.currentTarget.style.background='transparent';
                      e.currentTarget.style.borderLeftColor='transparent';
                    }}
                    onClick={()=>navigate(`/tickets/${t.TicketID}`)}>
                    <td style={{padding:'12px 14px'}}>
                      <span style={{fontSize:'12px',fontWeight:'700',
                        color:'#4F46E5'}}>
                        #{t.TicketID}
                      </span>
                    </td>
                    <td style={{padding:'12px 14px',maxWidth:'220px'}}>
                      <div style={{fontSize:'13px',fontWeight:'600',
                        color:'#1E293B',whiteSpace:'nowrap',
                        overflow:'hidden',textOverflow:'ellipsis'}}>
                        {t.Title}
                      </div>
                      <div style={{fontSize:'11px',color:'#9CA3AF',marginTop:'2px'}}>
                        {new Date(t.CreatedAt).toLocaleDateString('en-IN',{
                          day:'numeric',month:'short',year:'numeric'})}
                      </div>
                    </td>
                    <td style={{padding:'12px 14px',fontSize:'13px',color:'#374151'}}>
                      {t.CompanyName||'—'}
                    </td>
                    <td style={{padding:'12px 14px'}}>
                      <span style={{background:pc.bg,color:pc.color,
                        padding:'3px 9px',borderRadius:'999px',
                        fontSize:'11px',fontWeight:'700'}}>
                        {t.PriorityName}
                      </span>
                    </td>
                    <td style={{padding:'12px 14px'}}>
                      <span style={{background:sc.bg,color:sc.color,
                        padding:'3px 9px',borderRadius:'999px',
                        fontSize:'11px',fontWeight:'700'}}>
                        {t.StatusName}
                      </span>
                    </td>
                    <td style={{padding:'12px 14px',fontSize:'13px',color:'#374151'}}>
                      {t.AssignedToName || (
                        <span style={{color:'#9CA3AF',fontStyle:'italic'}}>
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td style={{padding:'12px 14px'}}>
                      {slaHrs!==null && (
                        <span style={{background:slaColor+'20',color:slaColor,
                          padding:'3px 8px',borderRadius:'999px',
                          fontSize:'11px',fontWeight:'700'}}>
                          {(t.IsOverdue && ['Open', 'In Progress'].includes(t.StatusName))||slaHrs<0 ? 'Overdue'
                            : slaHrs<24 ? `${slaHrs}h`
                            : `${Math.round(slaHrs/24)}d`}
                        </span>
                      )}
                    </td>
                    <td style={{padding:'12px 14px'}}
                      onClick={e=>e.stopPropagation()}>
                      <button
                        onClick={()=>navigate(`/tickets/${t.TicketID}`)}
                        style={{padding:'5px 12px',background:'#EEF2FF',
                          color:'#4F46E5',border:'1px solid #C7D2FE',
                          borderRadius:'6px',fontSize:'12px',fontWeight:'600',
                          cursor:'pointer',fontFamily:'inherit'}}>
                        View →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="manager-mobile-cards">
          {finalFiltered.length===0 ? (
            <div className="manager-mobile-card" style={{textAlign:'center',color:'#9CA3AF'}}>
              {tickets.length===0 ? 'No tickets yet' : 'No tickets match filters'}
            </div>
          ) : visibleFiltered.map((t) => {
            const sc = STATUS_COLORS[t.StatusName] || STATUS_COLORS['Open'];
            const pc = PRIORITY_COLORS[t.PriorityName] || PRIORITY_COLORS['Low'];
            const slaHrs = t.SLADeadline
              ? Math.round((new Date(t.SLADeadline)-new Date())/36e5)
              : null;
            const slaColor = (t.IsOverdue && ['Open', 'In Progress'].includes(t.StatusName))||slaHrs<0
              ? '#EF4444' : slaHrs<4 ? '#EF4444'
              : slaHrs<12 ? '#F59E0B' : '#10B981';

            return (
              <div
                key={`mobile-ticket-${t.TicketID}`}
                className="manager-mobile-card"
                onClick={()=>navigate(`/tickets/${t.TicketID}`)}
                style={{ cursor: 'pointer' }}
              >
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                  <span style={{fontSize:'12px',fontWeight:'700',color:'#4F46E5'}}>#{t.TicketID}</span>
                  <span style={{background:pc.bg,color:pc.color,padding:'3px 9px',borderRadius:'999px',fontSize:'11px',fontWeight:'700'}}>
                    {t.PriorityName}
                  </span>
                </div>

                <div style={{fontSize:'14px',fontWeight:'700',color:'#1E293B',marginBottom:6}}>{t.Title}</div>
                <div style={{fontSize:'12px',color:'#6B7280',marginBottom:4}}>Company: {t.CompanyName||'—'}</div>
                <div style={{fontSize:'12px',color:'#6B7280',marginBottom:4}}>Assigned: {t.AssignedToName || 'Unassigned'}</div>
                <div style={{fontSize:'12px',color:'#9CA3AF',marginBottom:8}}>
                  {new Date(t.CreatedAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
                </div>

                <div style={{display:'flex',gap:'6px',flexWrap:'wrap',alignItems:'center'}}>
                  <span style={{background:sc.bg,color:sc.color,padding:'3px 9px',borderRadius:'999px',fontSize:'11px',fontWeight:'700'}}>
                    {t.StatusName}
                  </span>
                  {slaHrs!==null && (
                    <span style={{background:slaColor+'20',color:slaColor,padding:'3px 8px',borderRadius:'999px',fontSize:'11px',fontWeight:'700'}}>
                      {(t.IsOverdue && ['Open', 'In Progress'].includes(t.StatusName))||slaHrs<0 ? 'Overdue' : slaHrs<24 ? `${slaHrs}h` : `${Math.round(slaHrs/24)}d`}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

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
        </>
      )}
      </div>
    </div>
  );
}
