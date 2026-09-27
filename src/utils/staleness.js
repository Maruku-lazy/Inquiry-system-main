const { STALE_THRESHOLD_DAYS } = require('../config/constants');


function computeStaleAt(updatedAt) {
  const updated = new Date(updatedAt);
  const staleAt = new Date(updated.getFullYear(), updated.getMonth(), updated.getDate() + 1, 0, 0, 0, 0);
  staleAt.setDate(staleAt.getDate() + STALE_THRESHOLD_DAYS);
  return staleAt;
}

function isStale(inquiry, now = new Date()) {
  if (inquiry.status === 'completed') return false;
  return now >= computeStaleAt(inquiry.updatedAt);
}

function augmentWithStaleness(inquiry, now = new Date()) {
  const stale = isStale(inquiry, now);
  return {
    ...inquiry,
    isStale: stale,
    effectivePriority: stale ? 'critical' : inquiry.priority,
    remarks: stale ? 'FOLLOW UP NOW!' : null,
  };
}

function computeStaleCutoffForQuery(now = new Date()) {
  const cutoffInstant = new Date(now.getTime() - (STALE_THRESHOLD_DAYS + 1) * 24 * 60 * 60 * 1000);
  const flooredNextDay = new Date(
    cutoffInstant.getFullYear(),
    cutoffInstant.getMonth(),
    cutoffInstant.getDate() + 1,
    0, 0, 0, 0,
  );
  return flooredNextDay;
}

module.exports = { computeStaleAt, isStale, augmentWithStaleness, computeStaleCutoffForQuery };
