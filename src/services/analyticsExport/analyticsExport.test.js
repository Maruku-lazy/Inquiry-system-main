const { generateAnalyticsExport } = require('./index');

describe('generateAnalyticsExport', () => {
  const mockAnalytics = {
    year: 2026,
    month: 8,
    role: 'all',
    summary: { total: 29, new: 3, ongoing: 8, completed: 11, pending: 0, completionRate: 38 },
    criticalCount: 2,
    monthly: [
      { month: 1, label: 'Jan', new: 0, ongoing: 0, completed: 0, total: 0 },
      { month: 8, label: 'Aug', new: 3, ongoing: 8, completed: 11, total: 29 },
    ],
    weekly: [
      { week: 'Wk 1', total: 6, resolved: 2 },
      { week: 'Wk 2', total: 5, resolved: 3 },
      { week: 'Wk 3', total: 10, resolved: 5 },
      { week: 'Wk 4', total: 8, resolved: 1 },
    ],
    sources: [
      { source: 'social', label: 'Social Media', total: 12 },
      { source: 'email', label: 'Email', total: 8 },
      { source: 'phone', label: 'Phone', total: 6 },
      { source: 'physical', label: 'Physical', total: 3 },
    ],
    leaders: [
      {
        detail: {
          id: 'leader-1',
          name: 'Alice Chen',
          teamName: "Alice Chen's Team",
          avatarInitials: 'AC',
          specialistsCount: 3,
        },
        total: 15,
        new: 2,
        active: 2,
        pending: 0,
        done: 5,
        resRate: '33% Res.',
        rateNum: 33,
      },
    ],
    specialists: [
      {
        id: 'spec-1',
        name: 'Bob Martinez',
        team: "Alice Chen's Team",
        leader: 'Alice Chen',
        total: 5,
        new: 1,
        inProgress: 1,
        pending: 0,
        resolved: 2,
        rate: 40,
      },
    ],
  };

  test('generates valid XLSX export buffer with single month and weekly volume', async () => {
    const result = await generateAnalyticsExport('xlsx', mockAnalytics);
    expect(result.contentType).toContain('spreadsheetml');
    expect(result.filename).toMatch(/^Analytics_August_2026\.xlsx$/);
    expect(Buffer.isBuffer(result.buffer)).toBe(true);
    expect(result.buffer.length).toBeGreaterThan(100);
  });

  test('generates valid DOCX export buffer with single month and weekly volume', async () => {
    const result = await generateAnalyticsExport('docx', mockAnalytics);
    expect(result.contentType).toContain('wordprocessingml');
    expect(result.filename).toMatch(/^Analytics_August_2026\.docx$/);
    expect(Buffer.isBuffer(result.buffer)).toBe(true);
    expect(result.buffer.length).toBeGreaterThan(100);
  });
});
