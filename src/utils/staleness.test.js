const { computeStaleAt, isStale, augmentWithStaleness } = require('./staleness');

// STALE_THRESHOLD_DAYS is 2 (see config/constants.js) — updated Monday
// 3:47 PM should go stale Thursday 00:00, not "48 hours later."
describe('computeStaleAt', () => {
  test('rolls forward to the start of the next day, then adds the threshold', () => {
    const updated = new Date(2026, 6, 6, 15, 47); // Monday, July 6 2026, 3:47 PM
    const staleAt = computeStaleAt(updated);
    expect(staleAt).toEqual(new Date(2026, 6, 9, 0, 0, 0, 0)); // Thursday 00:00
  });

  test('an update made exactly at midnight still rolls to the next day first', () => {
    const updated = new Date(2026, 6, 6, 0, 0, 0, 0);
    const staleAt = computeStaleAt(updated);
    expect(staleAt).toEqual(new Date(2026, 6, 9, 0, 0, 0, 0));
  });
});

describe('isStale', () => {
  test('is false before the stale instant', () => {
    const inquiry = { status: 'ongoing', updatedAt: new Date(2026, 6, 6, 15, 47) };
    const justBefore = new Date(2026, 6, 8, 23, 59, 59);
    expect(isStale(inquiry, justBefore)).toBe(false);
  });

  test('is true at and after the stale instant', () => {
    const inquiry = { status: 'ongoing', updatedAt: new Date(2026, 6, 6, 15, 47) };
    const staleInstant = new Date(2026, 6, 9, 0, 0, 0, 0);
    expect(isStale(inquiry, staleInstant)).toBe(true);
  });

  test('completed inquiries are never stale, no matter how old', () => {
    const inquiry = { status: 'completed', updatedAt: new Date(2020, 0, 1) };
    expect(isStale(inquiry, new Date())).toBe(false);
  });
});

describe('augmentWithStaleness', () => {
  test('a stale inquiry gets effectivePriority bumped to critical and a remark, without touching the real priority field', () => {
    const inquiry = { status: 'ongoing', priority: 'low', updatedAt: new Date(2026, 0, 1) };
    const result = augmentWithStaleness(inquiry, new Date(2026, 0, 10));
    expect(result.isStale).toBe(true);
    expect(result.effectivePriority).toBe('critical');
    expect(result.remarks).toBe('FOLLOW UP NOW!');
    expect(result.priority).toBe('low'); // the original stored value is never overwritten
  });

  test('a fresh inquiry keeps its own priority as effectivePriority, with no remark', () => {
    const inquiry = { status: 'ongoing', priority: 'medium', updatedAt: new Date() };
    const result = augmentWithStaleness(inquiry, new Date());
    expect(result.isStale).toBe(false);
    expect(result.effectivePriority).toBe('medium');
    expect(result.remarks).toBeNull();
  });
});
