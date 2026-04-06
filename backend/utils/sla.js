/**
 * Calculate SLA deadline based on priority
 */
const calculateSLADeadline = (createdDate, slaHours) => {
  const deadline = new Date(createdDate);
  deadline.setHours(deadline.getHours() + slaHours);
  return deadline;
};

/**
 * Check if ticket is overdue
 */
const isTicketOverdue = (slaDeadline) => {
  return new Date() > new Date(slaDeadline);
};

/**
 * Get SLA countdown in readable format
 */
const getSLACountdown = (slaDeadline) => {
  const now = new Date();
  const deadline = new Date(slaDeadline);
  const diff = deadline - now;

  if (diff < 0) {
    return 'OVERDUE';
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return `${hours}h ${minutes}m ${seconds}s`;
};

/**
 * Format date for display
 */
const formatDate = (date) => {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

module.exports = {
  calculateSLADeadline,
  isTicketOverdue,
  getSLACountdown,
  formatDate,
};
