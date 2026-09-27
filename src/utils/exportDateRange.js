const { z } = require('zod');

// Cascading Year -> Month -> Week(s) export scope, resolved into a single
// [from, to) date range in the server's local timezone — same day-boundary
// convention already used by utils/staleness.js elsewhere in the app.
//
// Weeks are FIXED day-of-month blocks (1-7, 8-14, 15-21, 22-28, 29-end of
// month), NOT Mon-Sun calendar weeks — per spec. Week 5 is whatever's left
// in that month (1, 2, or 3 days depending on month length); if the month
// is too short to have a 29th at all (February in a non-leap year), week 5
// simply matches nothing.

const exportScopeSchema = z
  .object({
    year: z.coerce.number().int().min(2000).max(2100).optional(),
    month: z.coerce.number().int().min(1).max(12).optional(),
    weekFrom: z.coerce.number().int().min(1).max(5).optional(),
    weekTo: z.coerce.number().int().min(1).max(5).optional(),
  })
  .refine((v) => !(v.month && !v.year), {
    message: 'month requires year to also be set',
    path: ['month'],
  })
  .refine((v) => !((v.weekFrom || v.weekTo) && !v.month), {
    message: 'week requires year and month to also be set',
    path: ['weekFrom'],
  })
  .refine((v) => !(v.weekFrom && v.weekTo && v.weekFrom > v.weekTo), {
    message: 'weekFrom must be less than or equal to weekTo',
    path: ['weekFrom'],
  });

function daysInMonth(year, month /* 1-12 */) {
  return new Date(year, month, 0).getDate();
}

// Returns the [start, end] (inclusive, 1-indexed calendar day) this week
// number covers within a month of `totalDays` days, or null if that week
// doesn't exist in this month at all (only possible for week 5).
function weekDayBounds(week, totalDays) {
  const start = (week - 1) * 7 + 1;
  if (start > totalDays) return null;
  const end = week === 5 ? totalDays : Math.min(week * 7, totalDays);
  return { start, end };
}

// Resolves a validated scope into { from, to } (Date, `to` exclusive), or
// null for "no scope" (export everything, no date filter at all).
function resolveExportRange(scope) {
  const { year, month, weekFrom, weekTo } = scope;
  if (!year) return null;

  if (!month) {
    return { from: new Date(year, 0, 1), to: new Date(year + 1, 0, 1) };
  }

  if (!weekFrom && !weekTo) {
    return { from: new Date(year, month - 1, 1), to: new Date(year, month, 1) };
  }

  const total = daysInMonth(year, month);
  const startWeek = weekFrom ?? 1;
  const endWeek = weekTo ?? startWeek;

  const startBounds = weekDayBounds(startWeek, total);
  const endBounds = weekDayBounds(endWeek, total);

  // Neither end of the requested range exists in this month (e.g. week 5
  // requested for a 28-day February) — an empty range, not a silent
  // fallback to the whole month.
  if (!startBounds && !endBounds) {
    return { from: new Date(year, month - 1, 1), to: new Date(year, month - 1, 1) };
  }

  const startDay = startBounds ? startBounds.start : total + 1;
  const endDay = endBounds ? endBounds.end : total;

  return {
    from: new Date(year, month - 1, startDay),
    to: new Date(year, month - 1, endDay + 1),
  };
}

module.exports = { exportScopeSchema, resolveExportRange, daysInMonth, weekDayBounds };
