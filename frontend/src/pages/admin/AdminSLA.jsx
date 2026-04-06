import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import '../../styles/admin.css';

const PRIORITY_COLORS = {
  1: { name: 'Critical', color: '#DC2626', bgLight: '#FEE2E2', icon: '1', border: '#FECACA' },
  2: { name: 'High', color: '#F59E0B', bgLight: '#FEF3C7', icon: '2', border: '#FED7AA' },
  3: { name: 'Medium', color: '#EAB308', bgLight: '#FEFCE8', icon: '3', border: '#FEF08A' },
  4: { name: 'Low', color: '#10B981', bgLight: '#ECFDF5', icon: '4', border: '#D1FAE5' },
};

const PRESETS = {
  standard: { name: 'Standard', values: { 1: 4, 2: 8, 3: 24, 4: 72 } },
  strict: { name: 'Strict', values: { 1: 1, 2: 4, 3: 8, 4: 24 } },
  relaxed: { name: 'Relaxed', values: { 1: 8, 2: 24, 3: 48, 4: 168 } },
};

export default function AdminSLA() {
  const [priorities, setPriorities] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [editedSLA, setEditedSLA] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saveAllLoading, setSaveAllLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [slaRes, ticketsRes] = await Promise.all([
        api.get('/admin/sla'),
        api.get('/admin/tickets'),
      ]);
      setPriorities(slaRes.data.data || []);
      setTickets(ticketsRes.data.data || []);
      const initialSLA = {};
      (slaRes.data.data || []).forEach(p => {
        initialSLA[p.PriorityID] = p.SLAHours;
      });
      setEditedSLA(initialSLA);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load SLA settings');
    } finally {
      setLoading(false);
    }
  };

  const getAffectedTickets = (priorityId) => {
    return tickets.filter(t => t.PriorityID === priorityId).length;
  };

  const getOverdueTickets = () => {
    return tickets.filter(t => t.PriorityID === 1 && t.StatusID !== 3 && t.StatusID !== 4).length;
  };

  const handleApplyPreset = (preset) => {
    const newSLA = { ...editedSLA };
    Object.keys(preset.values).forEach(key => {
      newSLA[key] = preset.values[key];
    });
    setEditedSLA(newSLA);
    setEditing(null);
    setSuccess(`${preset.name} preset applied!`);
    setTimeout(() => setSuccess(''), 2000);
  };

  const handleEditStart = (priorityId) => {
    setEditing(priorityId);
    setError('');
  };

  const handleSLAChange = (priorityId, value) => {
    setEditedSLA(prev => ({ ...prev, [priorityId]: parseInt(value) || 0 }));
  };

  const handleSaveAll = async () => {
    setError('');
    setSuccess('');
    setSaveAllLoading(true);

    try {
      const updates = Object.entries(editedSLA).map(([priorityId, hours]) => {
        if (hours < 1) throw new Error('SLA hours must be at least 1');
        return api.put(`/admin/sla/${priorityId}`, { slaHours: hours });
      });

      await Promise.all(updates);
      setSuccess('All SLA settings updated successfully!');
      setEditing(null);
      await fetchData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Failed to update SLA');
    } finally {
      setSaveAllLoading(false);
    }
  };

  const handleCancel = () => {
    setEditing(null);
    const resetSLA = {};
    priorities.forEach(p => {
      resetSLA[p.PriorityID] = p.SLAHours;
    });
    setEditedSLA(resetSLA);
    setError('');
  };

  const hasChanges = Object.keys(editedSLA).some(key => editedSLA[key] !== priorities.find(p => p.PriorityID === parseInt(key))?.SLAHours);

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">SLA Settings</h1>
          <p className="admin-page-sub">Configure Service Level Agreement hours for each priority</p>
        </div>
      </div>

      {error && <div className="admin-alert admin-alert-error">{error}</div>}
      {success && <div className="admin-alert admin-alert-success">{success}</div>}

      {/* Quick Presets */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '24px',
        flexWrap: 'wrap',
        padding: '16px',
        background: '#F3F4F6',
        borderRadius: '8px',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: '13px', fontWeight: '600', color: '#374151', marginRight: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Quick Presets:</span>
        {Object.entries(PRESETS).map(([key, preset]) => (
          <button
            key={key}
            onClick={() => handleApplyPreset(preset)}
            style={{
              padding: '8px 14px',
              background: '#fff',
              border: '1px solid #E5E7EB',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: '500',
              color: '#374151',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.target.style.borderColor = '#3B82F6';
              e.target.style.background = '#EFF6FF';
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = '#E5E7EB';
              e.target.style.background = '#fff';
            }}
          >
            {preset.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF' }}>
          Loading SLA settings...
        </div>
      ) : (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '100px' }}>
            {priorities.map((priority) => {
              const colors = PRIORITY_COLORS[priority.PriorityID];
              const affectedCount = getAffectedTickets(priority.PriorityID);
              const overdueCount = priority.PriorityID === 1 ? getOverdueTickets() : 0;
              const isEditing = editing === priority.PriorityID;

              return (
                <div
                  key={priority.PriorityID}
                  style={{
                    background: '#fff',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    border: `1px solid ${colors.border}20`,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                  }}
                >
                  {/* Top Border */}
                  <div style={{ height: '4px', background: colors.color }}></div>

                  <div style={{ padding: '16px' }}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: colors.bgLight,
                        border: `2px solid ${colors.color}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        fontWeight: '700',
                        color: colors.color,
                        flexShrink: 0,
                      }}>
                        {colors.icon}
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: colors.color }}>
                          {colors.name}
                        </h3>
                      </div>
                      {overdueCount > 0 && (
                        <span style={{
                          marginLeft: 'auto',
                          padding: '4px 8px',
                          background: colors.color,
                          color: '#fff',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '600',
                        }}>
                          {overdueCount} overdue
                        </span>
                      )}
                    </div>

                    {/* SLA Hours */}
                    <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: `1px solid ${colors.bgLight}` }}>
                      <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: '600', marginBottom: '6px', textTransform: 'uppercase' }}>
                        Current SLA
                      </div>
                      {!isEditing && (
                        <div style={{ fontSize: '28px', fontWeight: '700', color: colors.color }}>
                          {editedSLA[priority.PriorityID]}
                          <span style={{ fontSize: '14px', color: '#6B7280', marginLeft: '4px' }}>hours</span>
                        </div>
                      )}
                    </div>

                    {/* Affected Tickets */}
                    <div style={{ marginBottom: '16px', padding: '10px', background: colors.bgLight, borderRadius: '6px' }}>
                      <div style={{ fontSize: '12px', color: colors.color, fontWeight: '600' }}>
                        {affectedCount} {affectedCount === 1 ? 'ticket' : 'tickets'} using this SLA
                      </div>
                    </div>

                    {/* Edit Button or Input */}
                    {isEditing ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <input
                          type="number"
                          min="1"
                          value={editedSLA[priority.PriorityID] || ''}
                          onChange={(e) => handleSLAChange(priority.PriorityID, e.target.value)}
                          style={{
                            width: '100%',
                            padding: '8px 10px',
                            border: `2px solid ${colors.color}`,
                            borderRadius: '6px',
                            fontSize: '18px',
                            fontWeight: '600',
                            color: colors.color,
                            outline: 'none',
                            boxSizing: 'border-box',
                          }}
                          autoFocus
                        />
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={handleCancel}
                            style={{
                              flex: 1,
                              padding: '8px 12px',
                              background: '#E5E7EB',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: '600',
                              color: '#374151',
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSaveAll}
                            disabled={saveAllLoading || !editedSLA[priority.PriorityID] || editedSLA[priority.PriorityID] < 1}
                            style={{
                              flex: 1,
                              padding: '8px 12px',
                              background: colors.color,
                              color: '#fff',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: (saveAllLoading || !editedSLA[priority.PriorityID] || editedSLA[priority.PriorityID] < 1) ? 'not-allowed' : 'pointer',
                              fontSize: '12px',
                              fontWeight: '600',
                              opacity: (saveAllLoading || !editedSLA[priority.PriorityID] || editedSLA[priority.PriorityID] < 1) ? 0.6 : 1,
                            }}
                          >
                            {saveAllLoading ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleEditStart(priority.PriorityID)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          background: colors.color,
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '13px',
                          fontWeight: '600',
                          transition: 'opacity 0.2s',
                        }}
                        onMouseEnter={(e) => e.target.style.opacity = '0.9'}
                        onMouseLeave={(e) => e.target.style.opacity = '1'}
                      >
                        Edit SLA
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Save All Button - Improved Mobile */}
          {(editing || hasChanges) && (
            <div style={{
              position: 'sticky',
              bottom: 0,
              background: '#fff',
              padding: '16px',
              borderTop: '1px solid #E5E7EB',
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
              flexWrap: 'wrap',
              borderRadius: '8px',
            }}>
              <button
                onClick={handleCancel}
                style={{
                  padding: '10px 20px',
                  background: '#E5E7EB',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => e.target.style.background = '#D1D5DB'}
                onMouseLeave={(e) => e.target.style.background = '#E5E7EB'}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAll}
                disabled={saveAllLoading}
                style={{
                  padding: '10px 20px',
                  background: '#3B82F6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: saveAllLoading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  opacity: saveAllLoading ? 0.6 : 1,
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={(e) => !saveAllLoading && (e.target.style.opacity = '0.9')}
                onMouseLeave={(e) => !saveAllLoading && (e.target.style.opacity = '1')}
              >
                {saveAllLoading ? '⏳ Saving...' : '✓ Save All'}
              </button>
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: '40px', padding: '16px 20px', background: '#F0F9FF', borderRadius: '8px', borderLeft: '4px solid #2563EB' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', color: '#1e40af', marginBottom: '8px', marginTop: 0 }}>
          About SLA Settings
        </h3>
        <p style={{ color: '#1e3a8a', fontSize: '13px', lineHeight: '1.6', margin: 0 }}>
          SLA (Service Level Agreement) hours define the maximum time allowed to resolve tickets. Set realistic SLA targets for each priority level. 
          Tickets exceeding their SLA deadline will be marked as <strong>overdue</strong>.
        </p>
      </div>
    </div>
  );
}
