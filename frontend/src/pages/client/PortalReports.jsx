import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function PortalReports() {
  const [range, setRange] = useState(30);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/tickets');
      const now = new Date();
      const cutoff = new Date(now.getTime() - range * 24 * 60 * 60 * 1000);
      const data = Array.isArray(res.data?.data) ? res.data.data : [];
      const filtered = data.filter(t => {
        const createdDate = new Date(t.CreatedAt || t.createdAt);
        return createdDate >= cutoff;
      });
      setTickets(filtered);
    } catch(err) {
      console.error('Failed to fetch tickets', err);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const statusCounts = { Open: 0, 'In Progress': 0, Resolved: 0, Closed: 0 };
  const priorityCounts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  let slaMet = 0, slaMissed = 0, overdueCount = 0;

  tickets.forEach(t => {
    const status = t.StatusName || t.Status || 'Open';
    if (statusCounts.hasOwnProperty(status)) statusCounts[status]++;
    const priority = t.PriorityName || t.Priority || 'Medium';
    if (priorityCounts.hasOwnProperty(priority)) priorityCounts[priority]++;
    
    // Check SLA compliance - ONLY for resolved/closed tickets
    const isResolved = ['Resolved', 'Closed'].includes(status);
    if (isResolved) {
      const deadline = new Date(t.SLADeadline || t.DueDate || t.dueDate);
      const resolvedAt = new Date(t.UpdatedAt || t.ResolvedAt || t.resolvedAt);
      
      if (!isNaN(deadline) && !isNaN(resolvedAt)) {
        if (resolvedAt <= deadline) {
          slaMet++;
        } else {
          slaMissed++;
          overdueCount++;
        }
      }
    } else if (!['Resolved', 'Closed'].includes(status)) {
      // Open/In Progress tickets - check if past deadline
      const deadline = new Date(t.SLADeadline || t.DueDate || t.dueDate);
      if (!isNaN(deadline) && deadline < new Date()) {
        overdueCount++;
      }
    }
  });

  const chartData = (() => {
    if (tickets.length === 0) {
      if (range <= 7) {
        return Array.from({length: range}, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (range - 1 - i));
          return {name: d.toLocaleDateString('en-US', {month: 'short', day: 'numeric'}), tickets: 0};
        });
      } else if (range <= 30) {
        return [{name: 'Week 1', tickets: 0}, {name: 'Week 2', tickets: 0}, {name: 'Week 3', tickets: 0}, {name: 'Week 4', tickets: 0}];
      } else if (range <= 90) {
        return Array.from({length: 13}, (_, i) => ({name: `W${i+1}`, tickets: 0}));
      } else {
        return Array.from({length: 12}, (_, i) => ({name: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i], tickets: 0}));
      }
    }

    const now = new Date();
    const msPerDay = 24 * 60 * 60 * 1000;

    if (range <= 7) {
      // Daily breakdown - last 7/fewer days
      const dailyData = {};
      for (let i = range - 1; i >= 0; i--) {
        const d = new Date(now.getTime() - i * msPerDay);
        const key = d.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
        dailyData[key] = 0;
      }
      
      tickets.forEach(t => {
        const created = new Date(t.CreatedAt || t.createdAt);
        const key = created.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
        if (dailyData.hasOwnProperty(key)) dailyData[key]++;
      });
      
      return Object.entries(dailyData).map(([name, count]) => ({name, tickets: count}));
    } else if (range <= 30) {
      // Weekly breakdown
      const weekStarts = [];
      for (let i = 3; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 7 * msPerDay);
        weekStarts.push({start: new Date(d.getTime() - (d.getDay()) * msPerDay), name: `Week ${4-i}`});
      }
      
      return weekStarts.map(w => ({
        name: w.name,
        tickets: tickets.filter(t => {
          const d = new Date(t.CreatedAt || t.createdAt);
          const weekEnd = new Date(w.start.getTime() + 7 * msPerDay);
          return d >= w.start && d < weekEnd;
        }).length
      }));
    } else if (range <= 90) {
      // 13-week view
      const weeks = [];
      for (let i = 12; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 7 * msPerDay);
        weeks.push({start: new Date(d.getTime() - (d.getDay()) * msPerDay), name: `W${13-i}`});
      }
      
      return weeks.map(w => ({
        name: w.name,
        tickets: tickets.filter(t => {
          const d = new Date(t.CreatedAt || t.createdAt);
          const weekEnd = new Date(w.start.getTime() + 7 * msPerDay);
          return d >= w.start && d < weekEnd;
        }).length
      }));
    } else {
      // 12-month view
      const months = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        d.setDate(1);
        months.push({start: new Date(d), end: new Date(d.getFullYear(), d.getMonth() + 1, 0), name: d.toLocaleDateString('en-US', {month: 'short'})});
      }
      
      return months.map(m => ({
        name: m.name,
        tickets: tickets.filter(t => {
          const d = new Date(t.CreatedAt || t.createdAt);
          return d >= m.start && d <= m.end;
        }).length
      }));
    }
  })();

  const statusData = Object.entries(statusCounts).map(([name, value]) => ({name, value}));
  const priorityData = Object.entries(priorityCounts).map(([name, value]) => ({name, value}));

  const totalResolved = statusCounts.Resolved + statusCounts.Closed;
  const slaPercent = totalResolved > 0 ? Math.round((slaMet / totalResolved) * 100) : 0;

  const avg = (priority) => {
    const priorityTickets = tickets.filter(t => (t.PriorityName || t.Priority || 'Medium') === priority);
    if (!priorityTickets.length) return 0;
    const total = priorityTickets.reduce((sum, t) => {
      const created = new Date(t.CreatedAt || t.createdAt);
      const deadline = new Date(t.SLADeadline || t.DueDate || t.dueDate);
      if (isNaN(deadline)) return sum; // Skip if no deadline
      return sum + (deadline - created) / (1000 * 60 * 60);
    }, 0);
    return Math.round(total / priorityTickets.length);
  };

  const COLORS = {
    'Open': '#3B82F6',
    'In Progress': '#F59E0B',
    'Resolved': '#10B981',
    'Closed': '#6B7280',
    'Critical': '#EF4444',
    'High': '#F59E0B',
    'Medium': '#EAB308',
    'Low': '#10B981',
  };

  return (
    <div style={{fontFamily:'Inter,-apple-system,sans-serif',minHeight:'100vh',background:'#F8FAFC'}}>
      <div style={{background:'linear-gradient(135deg, #1E1B4B 0%, #4C1D95 60%, #4F46E5 100%)',padding:'24px 36px',
        borderRadius:'12px',margin:'24px',border:'1px solid rgba(255,255,255,0.2)',
        boxShadow:'0 8px 24px rgba(79,70,229,0.3)'}}>
        <div>
          <h1 style={{fontSize:'28px',fontWeight:'700',color:'#FFFFFF',margin:'0 0 12px',fontFamily:'Inter,sans-serif'}}>Reports & Analytics</h1>
          <p style={{fontSize:'13px',color:'rgba(255,255,255,0.8)',margin:'0'}}>
            Track your ticket metrics and performance trends
          </p>
        </div>
      </div>

      <div style={{padding:'20px 36px'}}>
      
      {loading ? (
        <div style={{textAlign:'center',padding:'40px',color:'#9CA3AF'}}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" style={{margin:'0 auto 8px',animation:'spin 1s linear infinite'}}>
            <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.88"/>
          </svg>
          Loading reports...
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))',gap:'16px',marginBottom:'20px'}}>
            {[
              { id: 0, label:'Total Tickets', value:tickets.length, color:'#C7D2FE', bg:'#4F46E5', border:'#4F46E5' },
              { id: 1, label:'SLA Compliance', value:slaPercent+'%', color:'#BBF7D0', bg:'#10B981', border:'#10B981' },
              { id: 2, label:'Resolved', value:totalResolved, color:'#CFFAFE', bg:'#06B6D4', border:'#06B6D4' },
              { id: 3, label:'Overdue', value:overdueCount, color:'#FECACA', bg:'#EF4444', border:'#EF4444' },
            ].map((card, idx) => (
              <div key={idx}
                style={{background:card.bg,border:`1px solid ${card.border}`,borderTop:`3px solid ${card.border}`,borderRadius:'12px',
                  padding:'20px',display:'flex',alignItems:'center',justifyContent:'flex-start',
                  boxShadow:'0 4px 12px rgba(0,0,0,0.16)',
                  transition:'all 0.2s',cursor:'default'}}
                onMouseEnter={e => {
                  e.currentTarget.style.boxShadow='0 10px 24px rgba(0,0,0,0.24)';
                  e.currentTarget.style.transform='translateY(-2px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.boxShadow='0 4px 12px rgba(0,0,0,0.16)';
                  e.currentTarget.style.transform='translateY(0)';
                }}>
                <div>
                  <div style={{fontSize:'13px',fontWeight:'700',color:'rgba(255,255,255,0.88)',textTransform:'uppercase',
                    letterSpacing:'0.05em',marginBottom:'6px'}}>
                    {card.label}
                  </div>
                  <div style={{fontSize:'36px',fontWeight:'800',color:'#FFFFFF',lineHeight:1.05}}>
                    {card.value}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Date Range Filter */}
          <div style={{background:'#fff',border:'1px solid #E2E8F0',borderRadius:'12px',padding:'14px 16px',marginBottom:'24px',boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
            <div style={{display:'flex',alignItems:'center',gap:'12px'}}>
              <label style={{fontSize:'13px',fontWeight:'600',color:'#6B7280',whiteSpace:'nowrap'}}>Filter by date:</label>
              <div style={{position:'relative',minWidth:'180px'}}>
                <select value={range} onChange={e => setRange(parseInt(e.target.value))}
                  style={{width:'100%',padding:'9px 32px 9px 12px',border:'1.5px solid #E2E8F0',borderRadius:'8px',fontSize:'13px',fontFamily:'Inter,sans-serif',outline:'none',background:'#fff',cursor:'pointer',appearance:'none',color:'#1E293B',fontWeight:'600',transition:'border-color 0.15s',borderColor:'#4F46E5'}}
                  onFocus={e=>e.target.style.borderColor='#4F46E5'}
                  onBlur={e=>e.target.style.borderColor='#E2E8F0'}>
                  <option value={7}>Last 7 days</option>
                  <option value={30}>Last 30 days</option>
                  <option value={90}>Last 90 days</option>
                  <option value={365}>Last year</option>
                </select>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" style={{position:'absolute',right:'10px',top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'20px',marginBottom:'20px'}}>
            {/* Line Chart */}
            <div className="portal-chart-card">
              <h3 style={{fontSize:'14px',fontWeight:'700',color:'#1E293B',marginBottom:'12px'}}>Ticket Volume Trend</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="name" tick={{fontSize:11}} />
                  <YAxis tick={{fontSize:11}} />
                  <Tooltip contentStyle={{background:'#FFF',border:'1px solid #E5E7EB',borderRadius:'4px'}} />
                  <Line type="monotone" dataKey="tickets" stroke="#4F46E5" dot={{r:4}} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Pie Chart - Status */}
            <div className="portal-chart-card">
              <h3 style={{fontSize:'14px',fontWeight:'700',color:'#1E293B',marginBottom:'12px'}}>By Status</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="value">
                    {statusData.map((entry, idx) => <Cell key={`cell-${idx}`} fill={COLORS[entry.name] || '#4F46E5'} />)}
                  </Pie>
                  <Tooltip formatter={v => v} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Bar Chart - Priority */}
            <div className="portal-chart-card">
              <h3 style={{fontSize:'14px',fontWeight:'700',color:'#1E293B',marginBottom:'12px'}}>By Priority</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={priorityData} margin={{top:10,right:10,left:-20,bottom:10}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="name" tick={{fontSize:10}} />
                  <YAxis tick={{fontSize:11}} />
                  <Tooltip contentStyle={{background:'#FFF',border:'1px solid #E5E7EB',borderRadius:'4px'}} />
                  <Bar dataKey="value" fill="#4F46E5" radius={[4,4,0,0]}>
                    {priorityData.map((entry, idx) => <Cell key={`cell-${idx}`} fill={COLORS[entry.name] || '#4F46E5'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Resolution Time */}
          <div className="portal-card">
            <h3 className="portal-card-title">Average Resolution Time by Priority</h3>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))',gap:'12px',marginTop:'12px'}}>
              {['Critical','High','Medium','Low'].map(priority => {
                const hours = avg(priority);
                const maxHours = {Critical:4,High:8,Medium:24,Low:72}[priority];
                const percent = Math.min((hours / maxHours) * 100, 100);
                return (
                  <div key={priority}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px',fontSize:'12px'}}>
                      <span style={{color:'#1E293B',fontWeight:'700'}}>{priority}</span>
                      <span style={{color:COLORS[priority],fontWeight:'600'}}>{hours}h</span>
                    </div>
                    <div style={{height:'6px',background:'#E5E7EB',borderRadius:'3px',overflow:'hidden'}}>
                      <div style={{height:'100%',background:COLORS[priority],width:`${percent}%`,transition:'width 0.3s'}}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* History Table */}
          <div className="portal-card">
            <h3 className="portal-card-title">Ticket History</h3>
            <div style={{overflowX:'auto'}}>
              <table className="portal-history-table">
                <thead>
                  <tr>
                    <th>Ticket ID</th>
                    <th>Title</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Due Date</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.slice(0, 10).map(t => {
                    const dueDate = new Date(t.SLADeadline || t.DueDate || t.dueDate || new Date());
                    return (
                    <tr key={t.TicketId}>
                      <td style={{maxWidth:'80px',overflow:'hidden',textOverflow:'ellipsis'}}><strong>#{t.TicketId}</strong></td>
                      <td style={{maxWidth:'250px',overflow:'hidden',textOverflow:'ellipsis'}}>{(t.Title || 'N/A').substring(0,40)}</td>
                      <td><span style={{display:'inline-block',padding:'4px 8px',fontSize:'11px',fontWeight:'600',background: t.PriorityName ? COLORS[t.PriorityName] : '#9CA3AF',color:'#FFF',borderRadius:'4px'}}>{t.PriorityName || 'Medium'}</span></td>
                      <td><span style={{display:'inline-block',padding:'4px 8px',fontSize:'11px',fontWeight:'600',background: t.StatusName ? COLORS[t.StatusName] : '#9CA3AF',color:'#FFF',borderRadius:'4px'}}>{t.StatusName || 'Open'}</span></td>
                      <td style={{fontSize:'12px',color:'#6B7280'}}>{new Date(t.CreatedAt || t.createdAt).toLocaleDateString()}</td>
                      <td style={{fontSize:'12px',color:dueDate < new Date() ? '#EF4444' : '#10B981',fontWeight:'600'}}>{dueDate.toLocaleDateString()}</td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
              {tickets.length === 0 && (
                <div style={{padding:'40px',textAlign:'center',color:'#9CA3AF'}}>
                  No tickets in this period
                </div>
              )}
            </div>
          </div>
        </>
      )}
      </div>
    </div>
  );
}

