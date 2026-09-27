const ROLE_LABELS = {
  all: 'All Members',
  admin: 'System Administrator',
  manager: 'Sales Manager',
  leader: 'Sales Marketing Leader',
  sales: 'Sales Marketing Agent',
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// "2026" or "July 2026" — matches how the Analytics page itself describes
// its current scope.
function scopeLabel(analytics) {
  const period = analytics.month ? `${MONTH_NAMES[analytics.month - 1]} ${analytics.year}` : `${analytics.year}`;
  return analytics.role === 'all' ? period : `${period} — ${ROLE_LABELS[analytics.role]}`;
}

function buildFilename(analytics, format) {
  const slug = scopeLabel(analytics)
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '');
  return `Analytics_${slug}.${format}`;
}

module.exports = { ROLE_LABELS, MONTH_NAMES, scopeLabel, buildFilename };
