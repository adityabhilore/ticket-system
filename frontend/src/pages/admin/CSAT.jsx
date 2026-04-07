import React, { useState, useEffect } from 'react';
import { getCSATStats, getCSATReport } from '../../services/csatService';

const CSATDashboard = () => {
  const [stats, setStats] = useState(null);
  const [distribution, setDistribution] = useState([]);
  const [byProduct, setByProduct] = useState([]);
  const [lowScoreTickets, setLowScoreTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState('30days');

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await getCSATStats();
      setStats(res.data.data.stats);
      setDistribution(res.data.data.distribution);
      setByProduct(res.data.data.byProduct);
      setLowScoreTickets(res.data.data.lowScoreTickets);

      // Get report based on date range
      let startDate, endDate = new Date();
      if (dateRange === '7days') {
        startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (dateRange === '90days') {
        startDate = new Date(endDate.getTime() - 90 * 24 * 60 * 60 * 1000);
      } else {
        startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      const reportRes = await getCSATReport({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
      // Report and trend data available but not used in current implementation
    } catch (err) {
      setError('Failed to load CSAT data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: '#9CA3AF' }}>
        Loading CSAT Dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: '40px',
          textAlign: 'center',
          color: '#EF4444',
          fontSize: '14px',
        }}
      >
        {error}
      </div>
    );
  }

  const avgRating = stats?.AverageRating ? parseFloat(stats.AverageRating).toFixed(1) : 0;

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1E293B', margin: '0 0 16px 0' }}>
          📊 Customer Satisfaction (CSAT) Dashboard
        </h1>
        <p style={{ color: '#6B7280', margin: '0' }}>
          Track customer satisfaction and identify areas for improvement
        </p>
      </div>

      {/* Date Range Selector */}
      <div style={{ marginBottom: '24px', display: 'flex', gap: '8px' }}>
        {['7days', '30days', '90days'].map((range) => (
          <button
            key={range}
            onClick={() => setDateRange(range)}
            style={{
              padding: '8px 16px',
              border: `1.5px solid ${dateRange === range ? '#4F46E5' : '#E2E8F0'}`,
              background: dateRange === range ? '#4F46E5' : '#fff',
              color: dateRange === range ? '#fff' : '#6B7280',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {range === '7days' ? 'Last 7 days' : range === '30days' ? 'Last 30 days' : 'Last 90 days'}
          </button>
        ))}
      </div>

      {/* Top Stats Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {/* Average Rating Card */}
        <div
          style={{
            background: '#fff',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: '600', marginBottom: '8px' }}>
            AVERAGE RATING
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#4F46E5', marginBottom: '4px' }}>
            {avgRating}
          </div>
          <div style={{ fontSize: '13px', color: '#9CA3AF' }}>out of 5 stars</div>
        </div>

        {/* Total Ratings Card */}
        <div
          style={{
            background: '#fff',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: '600', marginBottom: '8px' }}>
            TOTAL RATINGS
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#10B981', marginBottom: '4px' }}>
            {stats?.TotalRatings || 0}
          </div>
          <div style={{ fontSize: '13px', color: '#9CA3AF' }}>feedback submissions</div>
        </div>

        {/* Low Scores Alert Card */}
        <div
          style={{
            background: stats?.LowScoreCount > 0 ? '#FEE2E2' : '#F0FDF4',
            border: `1px solid ${stats?.LowScoreCount > 0 ? '#FECACA' : '#86EFAC'}`,
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ fontSize: '12px', color: '#6B7280', fontWeight: '600', marginBottom: '8px' }}>
            ⚠️ LOW SATISFACTION SCORES
          </div>
          <div
            style={{
              fontSize: '32px',
              fontWeight: '700',
              color: stats?.LowScoreCount > 0 ? '#EF4444' : '#16A34A',
              marginBottom: '4px',
            }}
          >
            {stats?.LowScoreCount || 0}
          </div>
          <div style={{ fontSize: '13px', color: '#9CA3AF' }}>tickets rated ≤3 stars</div>
        </div>
      </div>

      {/* Rating Distribution & By Product */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
        {/* Rating Distribution */}
        <div
          style={{
            background: '#fff',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '20px 24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ fontSize: '14px', fontWeight: '700', color: '#1E293B', marginBottom: '16px' }}>
            Rating Distribution
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {distribution.length > 0 ? (
              distribution.map((item) => (
                <div key={item.Rating} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ minWidth: '40px', fontSize: '14px', fontWeight: '600', color: '#4F46E5' }}>
                    {'⭐'.repeat(item.Rating)}
                  </div>
                  <div
                    style={{
                      flex: 1,
                      height: '24px',
                      background: '#F1F5F9',
                      borderRadius: '4px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${item.Percentage}%`,
                        background:
                          item.Rating >= 4
                            ? '#10B981'
                            : item.Rating === 3
                            ? '#F59E0B'
                            : '#EF4444',
                        transition: 'width 0.3s',
                      }}
                    />
                  </div>
                  <div style={{ minWidth: '50px', textAlign: 'right', fontSize: '12px', color: '#6B7280' }}>
                    {item.Percentage}%
                  </div>
                </div>
              ))
            ) : (
              <div style={{ color: '#9CA3AF', fontSize: '13px' }}>No ratings yet</div>
            )}
          </div>
        </div>

        {/* By Product */}
        <div
          style={{
            background: '#fff',
            border: '1px solid #E2E8F0',
            borderRadius: '12px',
            padding: '20px 24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ fontSize: '14px', fontWeight: '700', color: '#1E293B', marginBottom: '16px' }}>
            CSAT by Product
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {byProduct.length > 0 ? (
              byProduct.map((item) => (
                <div
                  key={item.ProductID}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 12px',
                    background: '#F8FAFC',
                    borderRadius: '8px',
                    borderLeft: `3px solid ${
                      item.AverageRating >= 4
                        ? '#10B981'
                        : item.AverageRating >= 3
                        ? '#F59E0B'
                        : '#EF4444'
                    }`,
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#1E293B' }}>
                      {item.ProductName || 'No Product'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#9CA3AF' }}>
                      {item.Count} rating{item.Count !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: '700',
                      color:
                        item.AverageRating >= 4
                          ? '#10B981'
                          : item.AverageRating >= 3
                          ? '#F59E0B'
                          : '#EF4444',
                    }}
                  >
                    {item.AverageRating.toFixed(1)}★
                  </div>
                </div>
              ))
            ) : (
              <div style={{ color: '#9CA3AF', fontSize: '13px' }}>No product data</div>
            )}
          </div>
        </div>
      </div>

      {/* Low Score Tickets Alert */}
      {lowScoreTickets.length > 0 && (
        <div
          style={{
            background: '#FEE2E2',
            border: '1px solid #FECACA',
            borderRadius: '12px',
            padding: '20px 24px',
            marginBottom: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ fontSize: '14px', fontWeight: '700', color: '#991B1B', marginBottom: '12px' }}>
            ⚠️ Tickets Needing Attention ({lowScoreTickets.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {lowScoreTickets.slice(0, 5).map((ticket) => (
              <div
                key={ticket.TicketID}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 12px',
                  background: '#FFFBFB',
                  borderRadius: '8px',
                  borderLeft: '3px solid #EF4444',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#1E293B' }}>
                    #{ticket.TicketID} - {ticket.Title}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
                    Rating: {ticket.Rating}★ | {ticket.CreatedByName}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: '24px',
                    fontWeight: '700',
                    color: '#EF4444',
                    minWidth: '40px',
                    textAlign: 'center',
                  }}
                >
                  {ticket.Rating}
                </div>
              </div>
            ))}
            {lowScoreTickets.length > 5 && (
              <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '8px', textAlign: 'center' }}>
                +{lowScoreTickets.length - 5} more low-score tickets
              </div>
            )}
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div
        style={{
          background: '#fff',
          border: '1px solid #E2E8F0',
          borderRadius: '12px',
          padding: '20px 24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ fontSize: '14px', fontWeight: '700', color: '#1E293B', marginBottom: '16px' }}>
          Rating Breakdown
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
          {[
            { stars: 5, count: stats?.FiveStarCount, label: 'Excellent' },
            { stars: 4, count: stats?.FourStarCount, label: 'Good' },
            { stars: 3, count: stats?.ThreeStarCount, label: 'Average' },
            { stars: 2, count: stats?.TwoStarCount, label: 'Poor' },
            { stars: 1, count: stats?.OneStarCount, label: 'Terrible' },
          ].map((item) => (
            <div
              key={item.stars}
              style={{
                textAlign: 'center',
                padding: '12px',
                background: '#F8FAFC',
                borderRadius: '8px',
              }}
            >
              <div style={{ fontSize: '18px', marginBottom: '4px' }}>
                {'⭐'.repeat(item.stars)}
              </div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#1E293B', marginBottom: '4px' }}>
                {item.count || 0}
              </div>
              <div style={{ fontSize: '11px', color: '#6B7280' }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CSATDashboard;
