/**
 * Format date for display
 */
export const formatDate = (date) => {
  if (!date) {
    return 'N/A';
  }

  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Get status color based on status name
 */
export const getStatusColor = (statusName) => {
  const colors = {
    Open: '#dc3545',
    'In Progress': '#ffc107',
    Resolved: '#28a745',
    Closed: '#6c757d',
    Overdue: '#dc3545',
  };
  return colors[statusName] || '#6c757d';
};

/**
 * Get priority color based on priority name
 */
export const getPriorityColor = (priorityName) => {
  const colors = {
    Critical: '#dc3545',
    High: '#ff6b6b',
    Medium: '#ffc107',
    Low: '#28a745',
  };
  return colors[priorityName] || '#6c757d';
};

/**
 * Get SLA countdown display
 */
export const getSLACountdownDisplay = (slaDeadline) => {
  if (!slaDeadline) {
    return 'No SLA';
  }

  const now = new Date();
  const deadline = new Date(slaDeadline);
  const diff = deadline - now;

  if (diff < 0) {
    const overdueMinutes = Math.floor(Math.abs(diff) / (1000 * 60));
    const overdueHours = Math.floor(overdueMinutes / 60);
    const remainingMinutes = overdueMinutes % 60;

    if (overdueHours >= 24) {
      const overdueDays = Math.floor(overdueHours / 24);
      const leftoverHours = overdueHours % 24;
      return `Overdue by ${overdueDays}d ${leftoverHours}h`;
    }

    return `Overdue by ${overdueHours}h ${remainingMinutes}m`;
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) {
    return `${days}d ${hours % 24}h left`;
  }

  return `${hours}h ${minutes}m`;
};

export const getSLAState = (slaDeadline) => {
  if (!slaDeadline) {
    return {
      label: 'No SLA',
      tone: 'neutral',
      isOverdue: false,
    };
  }

  const deadline = new Date(slaDeadline);
  const diff = deadline - new Date();

  if (diff <= 0) {
    return {
      label: getSLACountdownDisplay(slaDeadline),
      tone: 'critical',
      isOverdue: true,
    };
  }

  const hoursRemaining = diff / (1000 * 60 * 60);

  return {
    label: getSLACountdownDisplay(slaDeadline),
    tone: hoursRemaining <= 2 ? 'warning' : 'healthy',
    isOverdue: false,
  };
};

/**
 * Validate email format
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Show error message
 */
export const showError = (error) => {
  if (typeof error === 'string') {
    return error;
  }
  if (error?.message) {
    return error.message;
  }
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  return 'An error occurred. Please try again.';
};
