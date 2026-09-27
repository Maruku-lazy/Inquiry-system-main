const { notificationReasons } = require('./notificationReasons');

// A base inquiry that matches none of the three trigger conditions, so
// each test below only turns on the one thing it's checking.
function freshInquiry(overrides = {}) {
  return {
    status: 'ongoing',
    priority: 'low',
    updatedAt: new Date(), // "now" — not stale, not overdue
    ...overrides,
  };
}

describe('notificationReasons', () => {
  test('a completely fresh inquiry has no reasons', () => {
    expect(notificationReasons(freshInquiry(), 'sales', new Date())).toEqual([]);
  });

  test('critical priority notifies regardless of role', () => {
    const inquiry = freshInquiry({ priority: 'critical' });
    for (const role of ['sales', 'leader', 'manager', 'admin']) {
      expect(notificationReasons(inquiry, role, new Date())).toContain('critical');
    }
  });

  test('follow_up (stale) notifies regardless of role', () => {
    const staleInquiry = freshInquiry({ updatedAt: new Date(2020, 0, 1) });
    const now = new Date(2020, 0, 10);
    for (const role of ['sales', 'leader', 'manager', 'admin']) {
      expect(notificationReasons(staleInquiry, role, now)).toContain('follow_up');
    }
  });

  test('overdue ONLY notifies the sales role, per spec — not leaders/managers/admins', () => {
    const overdueInquiry = freshInquiry({ updatedAt: new Date(2020, 0, 1) });
    const now = new Date(2020, 0, 10);

    expect(notificationReasons(overdueInquiry, 'sales', now)).toContain('overdue');
    expect(notificationReasons(overdueInquiry, 'leader', now)).not.toContain('overdue');
    expect(notificationReasons(overdueInquiry, 'manager', now)).not.toContain('overdue');
    expect(notificationReasons(overdueInquiry, 'admin', now)).not.toContain('overdue');
  });

  test('an inquiry can match multiple reasons at once', () => {
    const inquiry = freshInquiry({ priority: 'critical', updatedAt: new Date(2020, 0, 1) });
    const now = new Date(2020, 0, 10);
    const reasons = notificationReasons(inquiry, 'sales', now);
    expect(reasons).toEqual(expect.arrayContaining(['overdue', 'critical', 'follow_up']));
    expect(reasons).toHaveLength(3);
  });

  test('completed inquiries never notify for overdue or follow_up, even if old', () => {
    const inquiry = freshInquiry({ status: 'completed', updatedAt: new Date(2020, 0, 1) });
    const now = new Date(2020, 0, 10);
    const reasons = notificationReasons(inquiry, 'sales', now);
    expect(reasons).not.toContain('overdue');
    expect(reasons).not.toContain('follow_up');
  });
});
