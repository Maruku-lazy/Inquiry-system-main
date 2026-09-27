const { resolveExportRange, daysInMonth, weekDayBounds, exportScopeSchema } = require('./exportDateRange');

describe('resolveExportRange', () => {
  test('no scope at all returns null (full export, no date filter)', () => {
    expect(resolveExportRange({})).toBeNull();
  });

  test('year only covers the whole calendar year', () => {
    const range = resolveExportRange({ year: 2026 });
    expect(range.from).toEqual(new Date(2026, 0, 1));
    expect(range.to).toEqual(new Date(2027, 0, 1));
  });

  test('year + month covers the whole month', () => {
    const range = resolveExportRange({ year: 2026, month: 7 });
    expect(range.from).toEqual(new Date(2026, 6, 1));
    expect(range.to).toEqual(new Date(2026, 7, 1));
  });

  test('Weeks 1-2 covers days 1-14', () => {
    const range = resolveExportRange({ year: 2026, month: 7, weekFrom: 1, weekTo: 2 });
    expect(range.from).toEqual(new Date(2026, 6, 1));
    expect(range.to).toEqual(new Date(2026, 6, 15)); // exclusive upper bound
  });

  test('Week 5 in a 31-day month covers days 29-31', () => {
    const range = resolveExportRange({ year: 2026, month: 7, weekFrom: 5, weekTo: 5 });
    expect(range.from).toEqual(new Date(2026, 6, 29));
    expect(range.to).toEqual(new Date(2026, 7, 1));
  });

  test('Week 5 in a 30-day month covers days 29-30', () => {
    const range = resolveExportRange({ year: 2026, month: 4, weekFrom: 5, weekTo: 5 });
    expect(range.from).toEqual(new Date(2026, 3, 29));
    expect(range.to).toEqual(new Date(2026, 4, 1));
  });

  test('Week 5 in a non-leap February (28 days) is an empty range', () => {
    const range = resolveExportRange({ year: 2026, month: 2, weekFrom: 5, weekTo: 5 });
    expect(range.from.getTime()).toBe(range.to.getTime());
  });

  test('Week 5 in a leap February (29 days) covers just day 29', () => {
    const range = resolveExportRange({ year: 2024, month: 2, weekFrom: 5, weekTo: 5 });
    expect(range.from).toEqual(new Date(2024, 1, 29));
    expect(range.to).toEqual(new Date(2024, 2, 1));
  });

  test('Weeks 4-5 spans into the start of the next month correctly', () => {
    const range = resolveExportRange({ year: 2026, month: 7, weekFrom: 4, weekTo: 5 });
    expect(range.from).toEqual(new Date(2026, 6, 22));
    expect(range.to).toEqual(new Date(2026, 7, 1));
  });
});

describe('daysInMonth', () => {
  test('handles standard months', () => {
    expect(daysInMonth(2026, 1)).toBe(31);
    expect(daysInMonth(2026, 4)).toBe(30);
  });

  test('handles February in leap vs non-leap years', () => {
    expect(daysInMonth(2024, 2)).toBe(29); // leap year
    expect(daysInMonth(2026, 2)).toBe(28); // non-leap year
  });
});

describe('weekDayBounds', () => {
  test('week 1 is always days 1-7', () => {
    expect(weekDayBounds(1, 31)).toEqual({ start: 1, end: 7 });
  });

  test('week 4 is always days 22-28', () => {
    expect(weekDayBounds(4, 31)).toEqual({ start: 22, end: 28 });
  });

  test('week 5 returns null when the month is too short', () => {
    expect(weekDayBounds(5, 28)).toBeNull();
  });
});

describe('exportScopeSchema validation', () => {
  test('rejects month without year', () => {
    expect(() => exportScopeSchema.parse({ month: 7 })).toThrow();
  });

  test('rejects a week without year+month', () => {
    expect(() => exportScopeSchema.parse({ weekFrom: 1 })).toThrow();
  });

  test('rejects weekFrom greater than weekTo', () => {
    expect(() => exportScopeSchema.parse({ year: 2026, month: 7, weekFrom: 3, weekTo: 1 })).toThrow();
  });

  test('accepts a fully valid scope', () => {
    expect(() =>
      exportScopeSchema.parse({ year: 2026, month: 7, weekFrom: 1, weekTo: 2 }),
    ).not.toThrow();
  });
});
