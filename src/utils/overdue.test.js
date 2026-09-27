const { computeOverdueAt, isOverdue } = require('./overdue');

// NOTIFICATION_OVERDUE_DAYS is 3 (see config/constants.js) — deliberately
// a longer, separate threshold from staleness's 2 days.
describe('computeOverdueAt', () => {
  test('rolls forward to the start of the next day, then adds 3 full days', () => {
    const updated = new Date(2026, 6, 6, 15, 47); // Monday, July 6 2026, 3:47 PM
    const overdueAt = computeOverdueAt(updated);
    expect(overdueAt).toEqual(new Date(2026, 6, 10, 0, 0, 0, 0)); // Friday 00:00
  });
});

describe('isOverdue', () => {
  test('is false before the overdue instant', () => {
    const inquiry = { status: 'ongoing', updatedAt: new Date(2026, 6, 6, 15, 47) };
    expect(isOverdue(inquiry, new Date(2026, 6, 9, 23, 59, 59))).toBe(false);
  });

  test('is true at and after the overdue instant', () => {
    const inquiry = { status: 'ongoing', updatedAt: new Date(2026, 6, 6, 15, 47) };
    expect(isOverdue(inquiry, new Date(2026, 6, 10, 0, 0, 0, 0))).toBe(true);
  });

  test('completed inquiries are never overdue', () => {
    const inquiry = { status: 'completed', updatedAt: new Date(2020, 0, 1) };
    expect(isOverdue(inquiry, new Date())).toBe(false);
  });

  test('overdue kicks in strictly later than stale, for the same inquiry', () => {
    // Confirms the two thresholds are genuinely independent — an inquiry
    // that just went stale (2 days) should NOT also be overdue (3 days) yet.
    const { isStale } = require('./staleness');
    const inquiry = { status: 'ongoing', updatedAt: new Date(2026, 6, 6, 15, 47) };
    const justWentStale = new Date(2026, 6, 9, 0, 0, 0, 0);
    expect(isStale(inquiry, justWentStale)).toBe(true);
    expect(isOverdue(inquiry, justWentStale)).toBe(false);
  });
});
