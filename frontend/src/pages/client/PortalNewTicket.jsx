import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';

const PRIORITIES = [
  {
    id: '1', name: 'Critical', dot: '#EF4444',
    bg: '#FEF2F2', border: '#FECACA', color: '#991B1B',
    sla: '4 hours', icon: 'â—',
    desc: 'Service unavailable or severe business impact',
    example: 'e.g. Login unavailable, key service interruption',
  },
  {
    id: '2', name: 'High', dot: '#F59E0B',
    bg: '#FFF7ED', border: '#FED7AA', color: '#9A3412',
    sla: '8 hours', icon: 'â—',
    desc: 'Major feature issue with limited workaround',
    example: 'e.g. Reports failing, workflow blocked for users',
  },
  {
    id: '3', name: 'Medium', dot: '#EAB308',
    bg: '#FEFCE8', border: '#FEF08A', color: '#713F12',
    sla: '24 hours', icon: 'â—',
    desc: 'Minor issue with manageable impact',
    example: 'e.g. UI inconsistency, slow response, small calculation issue',
  },
  {
    id: '4', name: 'Low', dot: '#10B981',
    bg: '#F0FDF4', border: '#BBF7D0', color: '#166534',
    sla: '72 hours', icon: 'â—',
    desc: 'General help request or enhancement suggestion',
    example: 'e.g. Export guidance, improvement request',
  },
];

const CATEGORIES = [
  { id: 'login', name: 'Login / Access Issue', icon: 'ðŸ”', color: '#4F46E5', tips: ['What error message appears?', 'Single user or multiple users?', 'When did it start?'] },
  { id: 'payment', name: 'Payment / Billing Issue', icon: 'ðŸ’³', color: '#7C3AED', tips: ['Transaction ID?', 'Payment method used?', 'Expected vs actual amount?'] },
  { id: 'reports', name: 'Reports / Analytics Issue', icon: 'ðŸ“Š', color: '#0EA5E9', tips: ['Which report failed?', 'Date range selected?', 'Download or view issue?'] },
  { id: 'performance', name: 'Slow Performance', icon: 'ðŸ¢', color: '#F59E0B', tips: ['Which page is slow?', 'Approximate load time?', 'Happens always or sometimes?'] },
  { id: 'data', name: 'Data Mismatch / Missing Data', icon: 'ðŸ—‚ï¸', color: '#059669', tips: ['What data is missing?', 'Any affected record IDs?', 'Expected result?'] },
  { id: 'permission', name: 'Permission / Role Issue', icon: 'ðŸ›¡ï¸', color: '#DC2626', tips: ['Which user/role?', 'What action is blocked?', 'Screenshot of error?'] },
  { id: 'integration', name: 'Integration / API Issue', icon: 'ðŸ”Œ', color: '#2563EB', tips: ['Which integration?', 'Error response/code?', 'When did it last work?'] },
  { id: 'feature', name: 'Feature Request', icon: 'ðŸ’¡', color: '#7C3AED', tips: ['What problem does it solve?', 'Who needs this?', 'What should the workflow be?'] },
  { id: 'help', name: 'General Help', icon: 'ðŸ“', color: '#0EA5E9', tips: ['What are you trying to do?', 'Where are you stuck?', 'What have you tried?'] },
  { id: 'other', name: 'Other (Custom Issue Type)', icon: 'âž•', color: '#6B7280', tips: ['Describe the issue type in your own words', 'Include impacted area and urgency', 'Add any useful references'] },
];

const COMMON_ISSUES = [
  'Cannot login to system',
  'Payment processing error',
  'Reports not generating',
  'Dashboard loading slow',
  'Data export failure',
  'User permission issue',
];

function getAutoPriority(title, desc) {
  const text = (title + ' ' + desc).toLowerCase();
  if (/down|fail|crash|broken|cannot access|blocked|critical/.test(text)) return '1';
  if (/error|issue|problem|bug|not work/.test(text)) return '2';
  if (/slow|glitch|minor|UI/.test(text)) return '3';
  return '3';
}

function getFormProgress(form) {
  let p = 0;
  if (form.category) p += 20;
  if (form.title?.length >= 5) p += 20;
  if (form.description?.length >= 30) p += 20;
  if (form.description?.length >= 100) p += 20;
  if (form.priorityId) p += 20;
  return p;
}

export default function PortalNewTicket() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState({ title:'', description:'', priorityId:'3', category: '', customIssueType: '', productId: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const [suggestedPriority, setSuggestedPriority] = useState(null);
  const [products, setProducts] = useState([]);

  // Load from localStorage on mount and fetch products when user is available
  useEffect(() => {
    const saved = localStorage.getItem('newTicketDraft');
    if (saved) {
      try {
        setForm(JSON.parse(saved));
      } catch (e) { console.error(e); }
    }
  }, []);

  // Fetch products when user is available
  useEffect(() => {
    if (user?.companyId) {
      fetchCompanyProducts();
    }
  }, [user?.companyId]);

  const fetchCompanyProducts = async () => {
    try {
      if (!user?.companyId) {
        console.warn('No companyId found');
        return;
      }
      console.log('Fetching products for company:', user.companyId);
      const res = await api.get(`/products/company/${user.companyId}`);
      console.log('Products response:', res.data);
      setProducts(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      console.error('Failed to fetch products:', err);
    }
  };

  // Auto-save draft
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('newTicketDraft', JSON.stringify(form));
    }, 1000);
    return () => clearTimeout(timer);
  }, [form]);

  // Auto-detect priority based on content
  useEffect(() => {
    const detected = getAutoPriority(form.title, form.description);
    setSuggestedPriority(detected);
  }, [form.title, form.description]);

  const selected = PRIORITIES.find(p => p.id === form.priorityId);
  const selectedCat = CATEGORIES.find(c => c.id === form.category);
  const selectedIssueTypeLabel = form.category === 'other'
    ? form.customIssueType?.trim()
    : selectedCat?.name;
  const tipsThemeColor = selectedCat?.color || '#6B7280';
  const tipsTitle = selectedCat?.name || 'Custom Issue Type';
  const tipsList = selectedCat?.tips || ['Describe impact clearly', 'Mention where issue occurs', 'Add expected vs actual behavior'];
  const progress = getFormProgress(form);
  const readyToSubmit = form.title?.length >= 5 && form.description?.length >= 10;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.title.trim()) { setError('Please enter an issue title'); return; }
    if (form.title.trim().length < 5) {
      setError('Title must be at least 5 characters'); return;
    }
    if (!form.description.trim()) {
      setError('Please describe your issue'); return;
    }
    if (form.description.trim().length < 10) {
      setError('Description must be at least 10 characters'); return;
    }
    if (form.category === 'other' && !form.customIssueType?.trim()) {
      setError('Please specify your custom issue type'); return;
    }
    setLoading(true);
    try {
      const issueTypeLine = selectedIssueTypeLabel ? `[Issue Type: ${selectedIssueTypeLabel}]\n\n` : '';
      const res = await api.post('/tickets', {
        title: form.title.trim(),
        description: `${issueTypeLine}${form.description.trim()}`,
        priorityId: parseInt(form.priorityId),
        productId: form.productId ? parseInt(form.productId) : null,
      });
      const id = res.data.ticketId || res.data.data?.ticketId || res.data.data?.TicketId;
      setSuccess(id);
      localStorage.removeItem('newTicketDraft');
    } catch(err) {
      setError(err?.response?.data?.message || 'Failed to submit. Please try again.');
    } finally { setLoading(false); }
  };

  const css = `
    @keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
    @keyframes scaleIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
    textarea:focus,input:focus{outline:none!important;}
    textarea::placeholder,input::placeholder{color:#9CA3AF;}
    .confetti{position:fixed;pointer-events:none;width:10px;height:10px;border-radius:50%}
  `;

  if (success !== null) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',
      minHeight:'100vh',padding:'24px',background:'#F8FAFC',
      fontFamily:'Inter,sans-serif'}}>
      <style>{css}</style>
      <div style={{background:'#fff',border:'1px solid #BBF7D0',borderRadius:'16px',
        padding:'48px 40px',maxWidth:'440px',width:'100%',textAlign:'center',
        boxShadow:'0 8px 24px rgba(0,0,0,0.08)',animation:'scaleIn 0.3s ease'}}>
        <div style={{width:'80px',height:'80px',background:selectedCat?selectedCat.color+'20':'#D1FAE5',
          borderRadius:'50%',display:'flex',alignItems:'center',
          justifyContent:'center',fontSize:'40px',margin:'0 auto 24px',animation:'pulse 2s ease-in-out infinite'}}>
          âœ…
        </div>
        <div style={{fontSize:'24px',fontWeight:'700',color:'#065F46',
          marginBottom:'8px'}}>Request Submitted</div>
        {success && (
          <div style={{display:'inline-block',background:'#EEF2FF',color:'#4F46E5',
            padding:'4px 14px',borderRadius:'999px',fontSize:'13px',
            fontWeight:'700',marginBottom:'16px'}}>
            Ticket #{success}
          </div>
        )}
        <div style={{fontSize:'14px',color:'#6B7280',marginBottom:'12px',lineHeight:'1.6'}}>
          Your {(selectedIssueTypeLabel || 'support request').toLowerCase()} has been submitted successfully.
        </div>
        <div style={{fontSize:'13px',color:'#9CA3AF',marginBottom:'28px'}}>
          Our team will respond within{' '}
          <strong style={{color:selected?.color||'#374151'}}>
            {selected?.sla||'24 hours'}
          </strong>
        </div>
        <div style={{display:'flex',gap:'10px',justifyContent:'center'}}>
          <button onClick={()=>navigate('/client/tickets')}
            style={{padding:'10px 20px',background:'#4F46E5',color:'#fff',
              border:'none',borderRadius:'8px',fontSize:'13px',fontWeight:'700',
              cursor:'pointer',fontFamily:'inherit',
              boxShadow:'0 4px 12px rgba(79,70,229,0.3)'}}>
            View My Tickets
          </button>
          <button onClick={()=>{setSuccess(null);setForm({title:'',description:'',priorityId:'3',category:'',customIssueType:''})}}
            style={{padding:'10px 20px',background:'#F3F4F6',color:'#374151',
              border:'1px solid #E5E7EB',borderRadius:'8px',fontSize:'13px',
              fontWeight:'600',cursor:'pointer',fontFamily:'inherit'}}>
            Submit Another
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{fontFamily:'Inter,-apple-system,sans-serif',
      minHeight:'100vh',background:'#F8FAFC'}}>
      <style>{css}</style>

      {/* â”€â”€ PAGE HEADER â”€â”€ */}
      <div style={{background:'linear-gradient(135deg, #1E1B4B 0%, #4C1D95 60%, #4F46E5 100%)',
        padding:'24px 36px',borderRadius:'12px',margin:'24px',
        border:'1px solid rgba(255,255,255,0.2)',
        boxShadow:'0 8px 24px rgba(79,70,229,0.3)'}}>
        <div style={{display:'flex',alignItems:'center',
          justifyContent:'space-between',gap:'16px',marginBottom:'16px'}}>
          <div>
            <button onClick={()=>navigate('/client/tickets')}
              style={{display:'flex',alignItems:'center',gap:'6px',
                background:'none',border:'none',color:'rgba(255,255,255,0.8)',
                fontSize:'13px',fontWeight:'500',cursor:'pointer',
                padding:'0',marginBottom:'8px',fontFamily:'inherit',
                transition:'color 0.15s'}}
              onMouseEnter={e=>e.currentTarget.style.color='#FFFFFF'}
              onMouseLeave={e=>e.currentTarget.style.color='rgba(255,255,255,0.8)'}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              Back to My Tickets
            </button>
            <h1 style={{fontSize:'24px',fontWeight:'700',color:'#FFFFFF',
              margin:'0 0 4px',fontFamily:'Inter,sans-serif'}}>
              Submit Support Request
            </h1>
            <p style={{fontSize:'14px',color:'rgba(255,255,255,0.8)',margin:0}}>
              {progress}% Complete
            </p>
          </div>

          {/* Selected priority preview */}
          {selected&&(
            <div style={{background:selected.bg,border:`1px solid ${selected.border}`,
              borderRadius:'10px',padding:'10px 16px',textAlign:'center',
              flexShrink:0}}>
              <div style={{fontSize:'11px',fontWeight:'700',color:selected.color,
                textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:'3px'}}>
                {suggestedPriority !== form.priorityId ? 'Suggested' : 'Selected'} Priority
              </div>
              <div style={{fontSize:'15px',fontWeight:'700',color:selected.color}}>
                {selected.icon} {selected.name}
              </div>
              <div style={{fontSize:'11px',color:selected.color,opacity:0.8}}>
                Response: {selected.sla}
              </div>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div style={{height:'4px',background:'rgba(255,255,255,0.25)',borderRadius:'999px',overflow:'hidden'}}>
          <div style={{height:'100%',background:'#4F46E5',width:progress+'%',
            transition:'width 0.3s ease'}}/>
        </div>
      </div>

      {/* â”€â”€ CONTENT â”€â”€ */}
      <div style={{padding:'24px 36px',display:'grid',
        gridTemplateColumns:'1fr 320px',gap:'20px',alignItems:'start'}}>

        {/* LEFT â€” Form */}
        <div style={{background:'#fff',border:'1px solid #E2E8F0',
          borderRadius:'12px',padding:'24px',
          boxShadow:'0 1px 3px rgba(0,0,0,0.06)',animation:'fadeIn 0.3s ease'}}>

          {error&&(
            <div style={{background:'#FEF2F2',border:'1px solid #FECACA',
              color:'#991B1B',borderRadius:'8px',padding:'10px 14px',
              fontSize:'13px',marginBottom:'20px',display:'flex',
              alignItems:'center',gap:'8px'}}>
              <span style={{fontSize:'16px'}}>âš ï¸</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>

            {/* Category selector */}
            <div style={{marginBottom:'20px'}}>
              <label style={{display:'block',fontSize:'13px',fontWeight:'700',
                color:'#374151',marginBottom:'10px',textTransform:'uppercase',
                letterSpacing:'0.06em'}}>
                Issue Type
              </label>
              <div style={{position:'relative',marginBottom:'10px'}}>
                <select
                  value={form.category}
                  onChange={e=>setForm({...form,category:e.target.value,customIssueType:e.target.value==='other'?form.customIssueType:''})}
                  style={{width:'100%',padding:'12px 38px 12px 14px',border:`1.5px solid ${form.category ? '#4F46E5' : '#E2E8F0'}`,
                    borderRadius:'8px',fontSize:'14px',fontFamily:'Inter,sans-serif',
                    color:'#1E293B',boxSizing:'border-box',outline:'none',background:'#fff',
                    appearance:'none'}}>
                  <option value="">Select issue type (optional)</option>
                  {CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                  ))}
                </select>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"
                  style={{position:'absolute',right:'12px',top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </div>

              {form.category === 'other' && (
                <input
                  type="text"
                  value={form.customIssueType}
                  onChange={e=>setForm({...form,customIssueType:e.target.value})}
                  placeholder="Enter your issue type (e.g. Mobile app crash, Invoice mismatch)"
                  maxLength={100}
                  style={{width:'100%',padding:'11px 12px',border:`1.5px solid ${form.customIssueType?.trim() ? '#10B981' : '#E2E8F0'}`,
                    borderRadius:'8px',fontSize:'13px',fontFamily:'Inter,sans-serif',
                    color:'#1E293B',boxSizing:'border-box',outline:'none',background:'#fff'}}
                />
              )}

              <div style={{fontSize:'11px',color:'#9CA3AF'}}>
                Canâ€™t find a matching type? Choose <strong>Other</strong> and enter your own.
              </div>
            </div>

            {/* Product selector */}
            <div style={{marginBottom:'20px'}}>
              <label style={{display:'block',fontSize:'13px',fontWeight:'700',color:'#374151',marginBottom:'10px',textTransform:'uppercase',letterSpacing:'0.06em'}}>Product (Optional)</label>
              <div style={{position:'relative'}}>
                <select value={form.productId} onChange={e=>setForm({...form,productId:e.target.value})} style={{width:'100%',padding:'12px 38px 12px 14px',border:`1.5px solid ${form.productId ? '#4F46E5' : '#E2E8F0'}`,borderRadius:'8px',fontSize:'14px',fontFamily:'Inter,sans-serif',color:'#1E293B',boxSizing:'border-box',outline:'none',background:'#fff',appearance:'none'}}>
                  <option value="">Select a product (optional)</option>
                  {products.length > 0 ? (
                    products.map(prod => (<option key={prod.ProductID} value={prod.ProductID}>{prod.ProductName} v{prod.ProductVersion}</option>))
                  ) : (
                    <option value="" disabled>No products assigned to your company</option>
                  )}
                </select>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" style={{position:'absolute',right:'12px',top:'50%',transform:'translateY(-50%)',pointerEvents:'none'}}><polyline points="6 9 12 15 18 9"/></svg>
              </div>
              {products.length === 0 && (
                <div style={{fontSize:'11px',color:'#9CA3AF',marginTop:'5px'}}>
                  ðŸ’¡ No products assigned yet. Contact your account manager if you need access to additional products.
                </div>
              )}
            </div>

            {/* Title */}
            <div style={{marginBottom:'20px'}}>
              <label style={{display:'block',fontSize:'13px',fontWeight:'700',
                color:'#374151',marginBottom:'8px',textTransform:'uppercase',
                letterSpacing:'0.06em'}}>
                Issue Title <span style={{color:'#4F46E5'}}>*</span>
              </label>
              <input type="text"
                placeholder="e.g. Cannot login to the system after password reset"
                value={form.title}
                onChange={e=>setForm({...form,title:e.target.value})}
                disabled={loading} maxLength={200}
                style={{width:'100%',padding:'12px 14px',
                  border:`1.5px solid ${form.title?.length >= 5?'#10B981':'#E2E8F0'}`,
                  borderRadius:'8px',fontSize:'14px',fontFamily:'Inter,sans-serif',
                  color:'#1E293B',boxSizing:'border-box',
                  transition:'border-color 0.15s',background:'#fff'}}
                onFocus={e=>e.target.style.borderColor='#4F46E5'}
                onBlur={e=>e.target.style.borderColor=form.title?.length >= 5?'#10B981':'#E2E8F0'}/>
              <div style={{display:'flex',justifyContent:'space-between',
                marginTop:'5px',fontSize:'11px',color:'#9CA3AF'}}>
                <span>Be specific</span>
                <span style={{color:form.title.length>180?'#EF4444':'#9CA3AF'}}>
                  {form.title.length}/200
                </span>
              </div>
            </div>

            {/* Quick issues */}
            <div style={{marginBottom:'20px',padding:'12px',background:'#F8FAFC',
              borderRadius:'8px',border:'1px solid #E2E8F0'}}>
              <div style={{fontSize:'11px',fontWeight:'700',color:'#6B7280',
                marginBottom:'8px',textTransform:'uppercase'}}>Quick templates:</div>
              <div style={{fontSize:'11px',color:'#9CA3AF',marginBottom:'8px'}}>
                Optional â€” pick one to autofill title, or type your own title manually.
              </div>
              <div style={{display:'flex',flexWrap:'wrap',gap:'6px'}}>
                {COMMON_ISSUES.map((issue,i)=>(
                  <button key={i} type="button"
                    onClick={()=>setForm({...form,title:issue})}
                    style={{padding:'5px 10px',background:'#fff',border:'1px solid #D1D5DB',
                      borderRadius:'6px',fontSize:'11px',color:'#6B7280',cursor:'pointer',
                      fontFamily:'inherit',transition:'all 0.15s'}}
                    onMouseEnter={e=>{e.currentTarget.style.background='#EEF2FF';e.currentTarget.style.borderColor='#4F46E5'}}
                    onMouseLeave={e=>{e.currentTarget.style.background='#fff';e.currentTarget.style.borderColor='#D1D5DB'}}>
                    {issue}
                  </button>
                ))}
              </div>
            </div>

            {/* Description with checklist */}
            <div style={{marginBottom:'20px'}}>
              <label style={{display:'block',fontSize:'13px',fontWeight:'700',
                color:'#374151',marginBottom:'8px',textTransform:'uppercase',
                letterSpacing:'0.06em'}}>
                Description <span style={{color:'#4F46E5'}}>*</span>
              </label>
              <textarea
                placeholder={`What happened?\nWhen did it start?\nSteps to reproduce\nError messages (if any)\nWhat you expected to happen`}
                value={form.description}
                onChange={e=>setForm({...form,description:e.target.value})}
                disabled={loading} rows={7}
                style={{width:'100%',padding:'12px 14px',
                  border:`1.5px solid ${form.description?.length >= 10?'#10B981':'#E2E8F0'}`,
                  borderRadius:'8px',fontSize:'14px',fontFamily:'Inter,sans-serif',
                  color:'#1E293B',resize:'vertical',minHeight:'140px',
                  boxSizing:'border-box',lineHeight:'1.6',
                  transition:'border-color 0.15s',background:'#fff'}}
                onFocus={e=>e.target.style.borderColor='#4F46E5'}
                onBlur={e=>e.target.style.borderColor=form.description?.length >= 10?'#10B981':'#E2E8F0'}/>
              <div style={{display:'flex',justifyContent:'space-between',
                marginTop:'5px',fontSize:'11px',color:'#9CA3AF'}}>
                <span>{form.description?.length >= 100 ? 'âœ… Great!' : form.description?.length >= 30 ? 'ðŸ‘ Good' : 'ðŸ‘‰ Keep typing'}</span>
                <span style={{color:form.description?.length >= 100?'#10B981':form.description?.length >= 30?'#EAB308':'#9CA3AF'}}>
                  {form.description?.length || 0} chars
                </span>
              </div>
            </div>

            {/* Priority selector with suggestion */}
            <div style={{marginBottom:'24px'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',
                marginBottom:'10px'}}>
                <label style={{fontSize:'13px',fontWeight:'700',
                  color:'#374151',textTransform:'uppercase',letterSpacing:'0.06em'}}>
                  Priority <span style={{color:'#4F46E5'}}>*</span>
                </label>
                {suggestedPriority && suggestedPriority !== form.priorityId && (
                  <button type="button"
                    onClick={()=>setForm({...form,priorityId:suggestedPriority})}
                    style={{fontSize:'11px',color:'#4F46E5',background:'#EEF2FF',
                      border:'1px solid #BFDBFE',padding:'3px 8px',borderRadius:'6px',
                      cursor:'pointer',fontFamily:'inherit',fontWeight:'600'}}>
                    Use Suggested
                  </button>
                )}
              </div>

              {/* Quick dropdown selector */}
              <div style={{marginBottom:'12px'}}>
                <select value={form.priorityId} onChange={e=>setForm({...form,priorityId:e.target.value})}
                  style={{width:'100%',padding:'11px 14px',border:'1.5px solid #E2E8F0',
                    borderRadius:'8px',fontSize:'14px',fontFamily:'Inter,sans-serif',
                    color:'#1E293B',background:'#fff',cursor:'pointer',fontWeight:'600',
                    transition:'all 0.15s',outline:'none',boxSizing:'border-box',
                    appearance:'none',backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%234F46E5' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                    backgroundRepeat:'no-repeat',backgroundPosition:'right 12px center',
                    paddingRight:'36px'}}>
                  {PRIORITIES.map(p=>(
                    <option key={p.id} value={p.id}>
                      {p.icon} {p.name} â€” {p.sla} response
                    </option>
                  ))}
                </select>
              </div>

              {/* Visual cards grid */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',
                gap:'10px'}}>
                {PRIORITIES.map(p=>{
                  const isSelected = form.priorityId === p.id;
                  return (
                    <div key={p.id} onClick={()=>setForm({...form,priorityId:p.id})}
                      style={{padding:'14px',border:`2px solid ${isSelected?p.dot:p.border}`,
                        borderRadius:'10px',cursor:'pointer',
                        background:isSelected?p.bg:'#fff',
                        transition:'all 0.15s',boxShadow:isSelected?`0 0 0 3px ${p.dot}20`:'none'}}
                      onMouseEnter={e=>{if(!isSelected)e.currentTarget.style.borderColor=p.dot}}
                      onMouseLeave={e=>{if(!isSelected)e.currentTarget.style.borderColor=p.border}}>
                      <div style={{display:'flex',alignItems:'center',
                        justifyContent:'space-between',marginBottom:'5px'}}>
                        <span style={{fontSize:'14px',fontWeight:'700',
                          color:isSelected?p.color:'#1E293B'}}>
                          {p.icon} {p.name}
                        </span>
                        <span style={{fontSize:'11px',fontWeight:'700',
                          color:isSelected?p.color:'#9CA3AF',
                          background:isSelected?p.dot+'20':'#F1F5F9',
                          padding:'2px 7px',borderRadius:'999px'}}>
                          {p.sla}
                        </span>
                      </div>
                      <div style={{fontSize:'12px',color:isSelected?p.color:'#6B7280',
                        marginBottom:'4px',lineHeight:'1.4'}}>{p.desc}</div>
                      {isSelected&&(
                        <div style={{marginTop:'8px',display:'flex',
                          alignItems:'center',gap:'5px',fontSize:'11px',
                          color:p.color,fontWeight:'700'}}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                          Selected
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Submit */}
            <div style={{display:'flex',gap:'10px',justifyContent:'flex-end',
              paddingTop:'16px',borderTop:'1px solid #F1F5F9'}}>
              <button type="button" onClick={()=>navigate('/client/tickets')}
                disabled={loading}
                style={{padding:'11px 20px',background:'#F3F4F6',color:'#374151',
                  border:'1px solid #E5E7EB',borderRadius:'8px',fontSize:'13px',
                  fontWeight:'600',cursor:'pointer',fontFamily:'inherit'}}>
                Cancel
              </button>
              <button type="submit" disabled={loading || !readyToSubmit}
                style={{padding:'11px 24px',
                  background:loading?'#9CA3AF':readyToSubmit?'#4F46E5':'#D1D5DB',
                  color:'#fff',border:'none',borderRadius:'8px',
                  fontSize:'14px',fontWeight:'700',cursor:loading?'not-allowed':readyToSubmit?'pointer':'not-allowed',
                  fontFamily:'inherit',transition:'all 0.15s',
                  boxShadow:readyToSubmit?'0 4px 12px rgba(79,70,229,0.3)':'none'}}>
                {loading?'Submitting...':'Submit Ticket'}
              </button>
            </div>
          </form>
        </div>

        {/* RIGHT â€” Smart sidebar */}
        <div style={{display:'flex',flexDirection:'column',gap:'12px',
          animation:'fadeIn 0.3s ease 0.1s both'}}>

          {/* Category tips */}
          {(selectedCat || form.category === 'other')&&(
            <div style={{background:tipsThemeColor+'10',border:`1px solid ${tipsThemeColor}30`,
              borderRadius:'12px',padding:'16px'}}>
              <div style={{fontSize:'13px',fontWeight:'700',color:tipsThemeColor,
                marginBottom:'10px'}}>{tipsTitle} Tips</div>
              {tipsList.map((tip,i)=>(
                <div key={i} style={{display:'flex',alignItems:'flex-start',
                  gap:'6px',marginBottom:'6px',fontSize:'12px',color:'#374151'}}>
                  <span style={{flexShrink:0,marginTop:'1px',color:tipsThemeColor}}>âœ“</span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          )}

          {/* What happens next */}
          <div style={{background:'#fff',border:'1px solid #E2E8F0',
            borderRadius:'12px',padding:'18px',
            boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
            <div style={{fontSize:'14px',fontWeight:'700',color:'#1E293B',
              marginBottom:'14px'}}>What Happens Next?</div>
            {[
              {n:'1',text:'Your ticket is submitted with a unique ID',color:'#4F46E5'},
              {n:'2',text:'Manager reviews and assigns to engineer',color:'#7C3AED'},
              {n:'3',text:'Engineer works on your issue',color:'#059669'},
              {n:'4',text:'You get notified when resolved',color:'#0891B2'},
            ].map(step=>(
              <div key={step.n} style={{display:'flex',alignItems:'flex-start',
                gap:'10px',marginBottom:'10px'}}>
                <div style={{width:'22px',height:'22px',borderRadius:'50%',
                  background:step.color,display:'flex',alignItems:'center',
                  justifyContent:'center',color:'#fff',fontSize:'11px',
                  fontWeight:'700',flexShrink:0,marginTop:'1px'}}>
                  {step.n}
                </div>
                <span style={{fontSize:'12px',color:'#374151',lineHeight:'1.5'}}>
                  {step.text}
                </span>
              </div>
            ))}
          </div>

          {/* SLA times */}
          <div style={{background:'#fff',border:'1px solid #E2E8F0',
            borderRadius:'12px',padding:'18px',
            boxShadow:'0 1px 3px rgba(0,0,0,0.06)'}}>
            <div style={{fontSize:'14px',fontWeight:'700',color:'#1E293B',
              marginBottom:'14px'}}>â±ï¸ Response Times</div>
            {PRIORITIES.map(p=>(
              <div key={p.id} style={{display:'flex',alignItems:'center',
                gap:'10px',padding:'8px 0',
                borderBottom:p.id!=='4'?'1px solid #F8FAFC':'none'}}>
                <div style={{width:'10px',height:'10px',borderRadius:'50%',
                  background:p.dot,flexShrink:0}}/>
                <span style={{fontSize:'13px',color:'#374151',flex:1,fontWeight:'500'}}>
                  {p.name}
                </span>
                <span style={{fontSize:'13px',fontWeight:'700',color:p.color}}>
                  {p.sla}
                </span>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}

