const { computeStaleAt, isStale } = require('./staleness');

// The instant an inquiry most recently became "notification-worthy" for
// whoever's watching it — the later of (a) when it was assigned to its
// current assignee, or (b) the moment it went stale, if it currently is.
// Only these two events count as triggers (not every routine edit) — see
// phase3 spec §4 for why a plain detail edit shouldn't cause a new dot.
function computeTriggerAt(inquiry, now = new Date()) {
  const assignedAt = new Date(inquiry.assignedAt);
  if (!isStale(inquiry, now)) return assignedAt;
  const staleAt = computeStaleAt(inquiry.updatedAt);
  return staleAt > assignedAt ? staleAt : assignedAt;
}

// seenAt: this user's InquirySeen.lastSeenAt for this inquiry, or
// null/undefined if they've never opened it.
function isUnseen(inquiry, seenAt, now = new Date()) {
  const trigger = computeTriggerAt(inquiry, now);
  return !seenAt || new Date(seenAt) < trigger;
}

module.exports = { computeTriggerAt, isUnseen };
