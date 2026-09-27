const { NOTIFICATION_OVERDUE_DAYS } = require('../config/constants');

// Same day-boundary rule as staleness.js's computeStaleAt (rolls forward
// to the start of the NEXT day after the last update, then adds the full
// threshold), but using the notification system's own, longer threshold —
// deliberately kept separate from STALE_THRESHOLD_DAYS (2 days), which
// only drives the "FOLLOW UP NOW!" UI badge. This is a distinct, later
// trigger specifically for escalating to a desktop notification / email.
function computeOverdueAt(updatedAt) {
  const updated = new Date(updatedAt);
  const overdueAt = new Date(updated.getFullYear(), updated.getMonth(), updated.getDate() + 1, 0, 0, 0, 0);
  overdueAt.setDate(overdueAt.getDate() + NOTIFICATION_OVERDUE_DAYS);
  return overdueAt;
}

// Completed inquiries are never overdue — same rule as isStale.
function isOverdue(inquiry, now = new Date()) {
  if (inquiry.status === 'completed') return false;
  return now >= computeOverdueAt(inquiry.updatedAt);
}

// Same trick as staleness.js's computeStaleCutoffForQuery: turns the
// per-row "is this overdue" check into a single fixed cutoff instant
// usable in a plain Prisma `{ updatedAt: { lt } }` filter, so the daily
// digest job can find candidate rows in one query instead of loading
// everything into JS. Callers should still re-confirm each row with
// isOverdue() afterward — this cutoff can over-select by up to a day at
// the boundary, same caveat as its staleness.js counterpart.
function computeOverdueCutoffForQuery(now = new Date()) {
  const cutoffInstant = new Date(now.getTime() - (NOTIFICATION_OVERDUE_DAYS + 1) * 24 * 60 * 60 * 1000);
  const flooredNextDay = new Date(
    cutoffInstant.getFullYear(),
    cutoffInstant.getMonth(),
    cutoffInstant.getDate() + 1,
    0, 0, 0, 0,
  );
  return flooredNextDay;
}

module.exports = { computeOverdueAt, isOverdue, computeOverdueCutoffForQuery };
