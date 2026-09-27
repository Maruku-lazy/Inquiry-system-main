const { isStale } = require('./staleness');
const { isOverdue } = require('./overdue');

function notificationReasons(inquiry, assigneeRole, now = new Date()) {
  const reasons = [];
  if (assigneeRole === 'sales' && isOverdue(inquiry, now)) reasons.push('overdue');
  if (inquiry.priority === 'critical') reasons.push('critical');
  if (isStale(inquiry, now)) reasons.push('follow_up');
  return reasons;
}

module.exports = { notificationReasons };
