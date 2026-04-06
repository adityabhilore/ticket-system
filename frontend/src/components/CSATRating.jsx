import React, { useState } from 'react';
import { submitCSATRating } from '../services/csatService';

const CSATRating = ({ ticketId, onSuccess, onError }) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  // Don't render if no valid ticketId
  if (!ticketId) {
    console.warn('❌ CSATRating: No valid ticketId provided');
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (rating === 0) {
      setMessage({ type: 'error', text: 'Please select a rating' });
      return;
    }

    if (comment.trim().length < 10) {
      setMessage({ type: 'error', text: 'Feedback must be at least 10 characters' });
      return;
    }

    setLoading(true);
    try {
      await submitCSATRating(ticketId, rating, comment);
      setSubmitted(true);
      setMessage({ type: 'success', text: 'Thank you for your feedback!' });
      if (onSuccess) onSuccess();
    } catch (err) {
      const errorMsg = err?.response?.data?.message || 'Failed to submit rating';
      setMessage({ type: 'error', text: errorMsg });
      if (onError) onError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div style={{
        background: '#F0FDF4',
        border: '1px solid #86EFAC',
        borderRadius: '12px',
        padding: '20px 24px',
        marginBottom: '20px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '24px', marginBottom: '8px' }}>🎉</div>
        <div style={{
          fontSize: '14px',
          fontWeight: '700',
          color: '#166534',
          marginBottom: '4px',
        }}>
          Thank you for rating!
        </div>
        <div style={{
          fontSize: '13px',
          color: '#15803D',
        }}>
          Your feedback helps us improve our service
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #E2E8F0',
      borderRadius: '12px',
      padding: '20px 24px',
      marginBottom: '20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    }}>
      <div style={{
        fontSize: '14px',
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <span>⭐</span> Rate Your Experience
      </div>

      <form onSubmit={handleSubmit}>
        {/* Star Rating */}
        <div style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '16px',
          justifyContent: 'center',
        }}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => setRating(star)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '40px',
                cursor: 'pointer',
                opacity: (hoverRating || rating) >= star ? 1 : 0.3,
                transform: (hoverRating || rating) >= star ? 'scale(1.1)' : 'scale(1)',
                transition: 'all 0.2s',
                padding: '0',
              }}
            >
              ★
            </button>
          ))}
        </div>

        {/* Rating text */}
        {(rating || hoverRating) > 0 && (
          <div style={{
            fontSize: '13px',
            color: '#6B7280',
            textAlign: 'center',
            marginBottom: '16px',
            fontWeight: '500',
          }}>
            {(hoverRating || rating) === 1 && 'Needs Improvement 😞'}
            {(hoverRating || rating) === 2 && 'Poor Experience 😕'}
            {(hoverRating || rating) === 3 && 'Average 😐'}
            {(hoverRating || rating) === 4 && 'Good! 😊'}
            {(hoverRating || rating) === 5 && 'Excellent! 🤩'}
          </div>
        )}

        {/* Feedback textarea */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: '700',
            color: '#6B7280',
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            Your Feedback (Required - min 10 characters)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Please tell us what we can improve or what went well..."
            maxLength={500}
            style={{
              width: '100%',
              minHeight: '100px',
              padding: '12px',
              border: '1.5px solid #E2E8F0',
              borderRadius: '8px',
              fontSize: '13px',
              fontFamily: 'inherit',
              outline: 'none',
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => (e.target.style.borderColor = '#4F46E5')}
            onBlur={(e) => (e.target.style.borderColor = '#E2E8F0')}
          />
          <div style={{
            fontSize: '11px',
            color: '#9CA3AF',
            marginTop: '4px',
            textAlign: 'right',
          }}>
            {comment.length}/500
          </div>
        </div>

        {/* Error/Success message */}
        {message && (
          <div style={{
            padding: '10px 12px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '500',
            marginBottom: '16px',
            background: message.type === 'error' ? '#FEE2E2' : '#F0FDF4',
            color: message.type === 'error' ? '#991B1B' : '#166534',
            border: `1px solid ${message.type === 'error' ? '#FECACA' : '#86EFAC'}`,
          }}>
            {message.text}
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading || !rating || comment.trim().length < 10}
          style={{
            width: '100%',
            padding: '10px 16px',
            background: loading || !rating || comment.trim().length < 10 ? '#D1D5DB' : '#4F46E5',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '700',
            cursor: loading || !rating || comment.trim().length < 10 ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
            transition: 'background 0.2s',
            opacity: loading ? 0.8 : 1,
          }}
        >
          {loading ? '⏳ Submitting...' : '✓ Submit Feedback'}
        </button>
      </form>
    </div>
  );
};

export default CSATRating;
