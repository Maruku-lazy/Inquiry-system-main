const { z } = require('zod');
const prisma = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');
const {
  inquiryVisibilityWhere,
  isUserIdInScope,
  canDeleteInquiry,
  getVisibleUserIds,
} = require('../utils/visibility');
const { parsePagination, paginatedResponse } = require('../utils/pagination');
const { logActivity } = require('../utils/activityLog');
const { resolveOrCreateCustomer, normalize } = require('../utils/customers');
const { augmentWithStaleness, computeStaleCutoffForQuery, isStale } = require('../utils/staleness');
const { isUnseen, computeTriggerAt } = require('../utils/unseen');
const { notificationReasons } = require('../utils/notificationReasons');
const { exportScopeSchema, resolveExportRange } = require('../utils/exportDateRange');
const { generateExport } = require('../services/export');
const { generateAnalyticsExport } = require('../services/analyticsExport');

const statusEnum = z.enum(['new', 'ongoing', 'completed']);
const priorityEnum = z.enum(['low', 'medium', 'high', 'critical']);
const sourceEnum = z.enum(['social', 'email', 'phone', 'physical']);
const inquiryTypeEnum = z.enum(['new_vehicle', 'parts', 'repair']);
const preferredTransactionEnum = z.enum(['financing', 'cash', 'trade_in', 'lease', 'other']);
const analyticsRoleSchema = z.enum(['all', 'admin', 'manager', 'leader', 'sales']);

// Treats '' and null as "not provided" before coercing to a Date, so a
// client sending null/empty-string for an unset date field never
// silently becomes the Unix epoch (new Date(null) === new Date(0)).
const optionalDate = z.preprocess(
  (v) => (v === null || v === '' ? undefined : v),
  z.coerce.date().optional(),
);
const nullableOptionalDate = z.preprocess(
  (v) => (v === '' ? null : v),
  z.coerce.date().nullable().optional(),
);

const INCLUDE_PARTICIPANTS = {
  // isActive on assignedUser lets the frontend flag "this person's account
  // is deactivated/deleted — you may want to reassign this" without a
  // separate lookup. Deleted accounts aren't hard-removed (see
  // schema.prisma User.deletedAt), so this join always resolves to a real
  // name even for someone who's since been deleted.
  assignedUser: { select: { id: true, name: true, role: true, isActive: true } },
  creator: { select: { id: true, name: true, role: true } },
  deletedByUser: { select: { id: true, name: true, role: true } },
};

const createInquirySchema = z.object({
  customerName: z.string().min(1),
  customerContact: z.string().min(1), // single field — holds either a phone or an email
  details: z.string().min(1),
  assignedTo: z.string().uuid().optional(), // defaults to the creator
  inquiryType: inquiryTypeEnum,
  priority: priorityEnum,
  unit: z.string().optional(),
  source: sourceEnum.optional(),
  preferredTransaction: preferredTransactionEnum.optional(),
  lastContactAt: optionalDate,
  reminderAt: optionalDate,
  // Legacy prototype-alignment fields, unused by Phase 2 UI but still accepted.
  subject: z.string().optional(),
  company: z.string().optional(),
  value: z.number().nonnegative().optional(),
});

const updateInquirySchema = z.object({
  status: statusEnum.optional(),
  details: z.string().min(1).optional(),
  customerName: z.string().min(1).optional(),
  customerContact: z.string().min(1).optional(),
  assignedTo: z.string().uuid().optional(), // reassignment, leader/manager/admin only
  inquiryType: inquiryTypeEnum.optional(),
  priority: priorityEnum.optional(),
  unit: z.string().optional(),
  source: sourceEnum.optional(),
  preferredTransaction: preferredTransactionEnum.optional(),
  lastContactAt: nullableOptionalDate,
  reminderAt: nullableOptionalDate,
  subject: z.string().optional(),
  company: z.string().optional(),
  value: z.number().nonnegative().optional(),
});

const dateRangeQuerySchema = z.object({
  date_from: z.coerce.date().optional(),
  date_to: z.coerce.date().optional(),
});

function dateRangeWhere(field, { date_from, date_to }) {
  if (!date_from && !date_to) return {};
  return {
    [field]: {
      ...(date_from && { gte: date_from }),
      ...(date_to && { lte: date_to }),
    },
  };
}

// -- Search + filters (Active / Completed / Deleted) ----------------------
// `postedYear`/`postedMonth` are deliberately NOT named `year`/`month` —
// those are already taken by the Completed tab's hierarchical drill-down
// (which filters completedAt, not createdAt). This filter always means
// "Date Posted" = createdAt, per spec, across all three tabs.
const searchFilterSchema = z.object({
  q: z.string().trim().max(200).optional(),
  type: inquiryTypeEnum.optional(),
  priority: priorityEnum.optional(),
  postedYear: z.coerce.number().int().min(2000).max(2100).optional(),
  postedMonth: z.coerce.number().int().min(1).max(12).optional(),
});

// Search box matches Inquiry ID (the short "INQ-XXXX" form shown in the
// UI, derived from the first 4 chars of the UUID), Customer Name, and —
// only for Leader/Manager/Admin — the assigned rep's name. Sales reps
// already only ever see their own inquiries, so searching by assignee is
// a no-op for them and is deliberately left out of their OR clause.
function buildSearchWhere(q, canSearchAssignee) {
  const raw = (q || '').trim();
  if (!raw) return {};

  const idFragment = raw.replace(/^inq-?/i, '').replace(/[\s-]/g, '');

  const or = [{ customerName: { contains: raw, mode: 'insensitive' } }];
  if (idFragment) or.push({ id: { startsWith: idFragment, mode: 'insensitive' } });
  if (canSearchAssignee) or.push({ assignedUser: { name: { contains: raw, mode: 'insensitive' } } });

  return { OR: or };
}

// Decorates a batch of inquiries with per-viewer staleness + unseen state
// in one extra query (InquirySeen rows for this user, for just these ids)
// rather than N+1 queries.
async function decorateWithUnseen(items, userId) {
  if (items.length === 0) return items;
  const seenRows = await prisma.inquirySeen.findMany({
    where: { userId, inquiryId: { in: items.map((i) => i.id) } },
    select: { inquiryId: true, lastSeenAt: true },
  });
  const seenMap = new Map(seenRows.map((r) => [r.inquiryId, r.lastSeenAt]));
  return items.map((item) => {
    const withStaleness = augmentWithStaleness(item);
    return { ...withStaleness, isUnseen: isUnseen(item, seenMap.get(item.id)) };
  });
}

// -- Active / Completed / Deleted tabs --------------------------------
// All three share the same shape: visibility-scoped, paginated, newest
// first. They differ only in the status/deletedAt slice of the `where`.

async function listByTab(req, res, tabWhere) {
  const { page, pageSize, skip, take } = parsePagination(req.query);
  const dateFilters = dateRangeQuerySchema.parse(req.query);
  const { q, type, priority, postedYear, postedMonth } = searchFilterSchema.parse(req.query);

  const postedRange = postedYear ? resolveExportRange({ year: postedYear, month: postedMonth }) : null;
  const canSearchAssignee = ['leader', 'manager', 'admin'].includes(req.user.role);

  const where = {
    ...(await inquiryVisibilityWhere(req.user)),
    ...tabWhere,
    ...dateRangeWhere('createdAt', dateFilters),
    ...(postedRange && { createdAt: { gte: postedRange.from, lt: postedRange.to } }),
    ...(type && { inquiryType: type }),
    ...(priority && { priority }),
    ...buildSearchWhere(q, canSearchAssignee),
  };

  const [items, total] = await Promise.all([
    prisma.inquiry.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip,
      take,
      include: INCLUDE_PARTICIPANTS,
    }),
    prisma.inquiry.count({ where }),
  ]);

  const decorated = await decorateWithUnseen(items, req.user.id);
  res.json(paginatedResponse(decorated, total, page, pageSize));
}

// GET /inquiries/active
const listActive = asyncHandler((req, res) =>
  listByTab(req, res, { status: { in: ['new', 'ongoing'] }, deletedAt: null }),
);

// GET /inquiries/completed  (also accepts ?year=&month= for the
// hierarchical drill-down — both optional, combine to filter completedAt)
const completedListQuerySchema = z.object({
  year: z.coerce.number().int().optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
});

const listCompleted = asyncHandler(async (req, res) => {
  const { year, month } = completedListQuerySchema.parse(req.query);
  const tabWhere = { status: 'completed', deletedAt: null };

  if (year) {
    const start = new Date(Date.UTC(year, month ? month - 1 : 0, 1));
    const end = month ? new Date(Date.UTC(year, month, 1)) : new Date(Date.UTC(year + 1, 0, 1));
    tabWhere.completedAt = { gte: start, lt: end };
  }

  await listByTab(req, res, tabWhere);
});

// GET /inquiries/deleted
const listDeleted = asyncHandler((req, res) => listByTab(req, res, { deletedAt: { not: null } }));

// -- Export (Excel / PDF / Word) ------------------------------------------
// Same tab slices as the three list endpoints above, but unpaginated (the
// full matching record set) and rendered to a downloadable file instead of
// JSON. Scope is an optional cascading Year -> Month -> Week filter on
// createdAt — see utils/exportDateRange.js for exactly how that resolves,
// and docs/export spec for why createdAt (not completedAt/deletedAt) is
// the scope field for every tab, including Completed and Deleted.
const TAB_WHERE = {
  active: { status: { in: ['new', 'ongoing'] }, deletedAt: null },
  completed: { status: 'completed', deletedAt: null },
  deleted: { deletedAt: { not: null } },
};

const exportQuerySchema = z.object({
  tab: z.enum(['active', 'completed', 'deleted']),
  format: z.enum(['xlsx', 'pdf', 'docx']),
});

// GET /inquiries/export
const exportInquiries = asyncHandler(async (req, res) => {
  const { tab, format } = exportQuerySchema.parse(req.query);
  const scope = exportScopeSchema.parse(req.query);
  const range = resolveExportRange(scope);

  const where = {
    ...(await inquiryVisibilityWhere(req.user)),
    ...TAB_WHERE[tab],
    ...(range && { createdAt: { gte: range.from, lt: range.to } }),
  };

  const items = await prisma.inquiry.findMany({
    where,
    orderBy: { createdAt: 'asc' },
    include: INCLUDE_PARTICIPANTS,
  });

  const { buffer, filename, contentType } = await generateExport({ format, tab, items, scope });

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
});

// GET /inquiries/tasks — Active inquiries (new/ongoing) re-sorted as a
// work queue: effectively-critical first (real priority=critical OR gone
// stale), oldest-untouched within that group first; then the rest by
// priority, same tiebreak. Two plain queries instead of one raw-SQL
// ORDER BY CASE — see utils/staleness.js for why the cutoff-based split
// is provably equivalent to per-row staleness, computed without raw SQL.
const listTasks = asyncHandler(async (req, res) => {
  const { page, pageSize, skip, take } = parsePagination(req.query);
  const { q } = searchFilterSchema.pick({ q: true }).parse(req.query);
  const canSearchAssignee = ['leader', 'manager', 'admin'].includes(req.user.role);
  const baseWhere = {
    ...(await inquiryVisibilityWhere(req.user)),
    status: { in: ['new', 'ongoing'] },
    deletedAt: null,
    ...buildSearchWhere(q, canSearchAssignee),
  };
  const staleCutoff = computeStaleCutoffForQuery();

  const criticalWhere = { ...baseWhere, OR: [{ priority: 'critical' }, { updatedAt: { lt: staleCutoff } }] };
  const restWhere = { ...baseWhere, priority: { not: 'critical' }, updatedAt: { gte: staleCutoff } };

  const [criticalCount, restCount] = await Promise.all([
    prisma.inquiry.count({ where: criticalWhere }),
    prisma.inquiry.count({ where: restWhere }),
  ]);
  const total = criticalCount + restCount;

  let items = [];
  if (skip < criticalCount) {
    const takeFromCritical = Math.min(take, criticalCount - skip);
    const criticalItems = await prisma.inquiry.findMany({
      where: criticalWhere,
      orderBy: { updatedAt: 'asc' },
      skip,
      take: takeFromCritical,
      include: INCLUDE_PARTICIPANTS,
    });
    items = items.concat(criticalItems);

    const remaining = take - takeFromCritical;
    if (remaining > 0) {
      const restItems = await prisma.inquiry.findMany({
        where: restWhere,
        orderBy: [{ priority: 'desc' }, { updatedAt: 'asc' }],
        skip: 0,
        take: remaining,
        include: INCLUDE_PARTICIPANTS,
      });
      items = items.concat(restItems);
    }
  } else {
    const restItems = await prisma.inquiry.findMany({
      where: restWhere,
      orderBy: [{ priority: 'desc' }, { updatedAt: 'asc' }],
      skip: skip - criticalCount,
      take,
      include: INCLUDE_PARTICIPANTS,
    });
    items = restItems;
  }

  const decorated = await decorateWithUnseen(items, req.user.id);
  res.json(paginatedResponse(decorated, total, page, pageSize));
});

// GET /inquiries/unseen-summary — powers the sidebar/dashboard red dots.
// Fetches lightweight fields for the caller's whole active work queue
// (bounded to new/ongoing, not the full historical archive) rather than a
// raw-SQL correlated query, since the "unseen" trigger varies per row in a
// way Prisma's relation filters can't express directly. See utils/unseen.js.
const getUnseenSummary = asyncHandler(async (req, res) => {
  const where = { ...(await inquiryVisibilityWhere(req.user)), status: { in: ['new', 'ongoing'] }, deletedAt: null };

  const candidates = await prisma.inquiry.findMany({
    where,
    select: { id: true, status: true, assignedAt: true, updatedAt: true },
  });

  if (candidates.length === 0) return res.json({ hasUnseen: false });

  const seenRows = await prisma.inquirySeen.findMany({
    where: { userId: req.user.id, inquiryId: { in: candidates.map((c) => c.id) } },
    select: { inquiryId: true, lastSeenAt: true },
  });
  const seenMap = new Map(seenRows.map((r) => [r.inquiryId, r.lastSeenAt]));

  const hasUnseen = candidates.some((c) => isUnseen(c, seenMap.get(c.id)));
  res.json({ hasUnseen });
});

const NOTIFICATIONS_LIMIT = 20;

// GET /inquiries/notifications — powers the notification bell. Same
// unseen-detection as unseen-summary above, but returns the actual items
// (capped, most-recently-triggered first) instead of just a boolean, each
// tagged with why it's notifying:
//   'new'       — freshly assigned to this person
//   'follow_up' — just crossed into stale (mirrors the "FOLLOW UP NOW!"
//                 flag used elsewhere in the app — staleness always flips
//                 at a day's 00:00 boundary, see utils/staleness.js)
const getNotifications = asyncHandler(async (req, res) => {
  const where = { ...(await inquiryVisibilityWhere(req.user)), status: { in: ['new', 'ongoing'] }, deletedAt: null };

  const candidates = await prisma.inquiry.findMany({
    where,
    select: { id: true, customerName: true, status: true, assignedAt: true, updatedAt: true },
  });

  if (candidates.length === 0) return res.json({ items: [] });

  const seenRows = await prisma.inquirySeen.findMany({
    where: { userId: req.user.id, inquiryId: { in: candidates.map((c) => c.id) } },
    select: { inquiryId: true, lastSeenAt: true },
  });
  const seenMap = new Map(seenRows.map((r) => [r.inquiryId, r.lastSeenAt]));

  const now = new Date();
  const items = candidates
    .filter((c) => isUnseen(c, seenMap.get(c.id), now))
    .map((c) => ({
      id: c.id,
      shortId: `INQ-${c.id.slice(0, 4).toUpperCase()}`,
      customerName: c.customerName,
      reason: isStale(c, now) ? 'follow_up' : 'new',
      triggerAt: computeTriggerAt(c, now),
    }))
    .sort((a, b) => new Date(b.triggerAt).getTime() - new Date(a.triggerAt).getTime())
    .slice(0, NOTIFICATIONS_LIMIT);

  res.json({ items });
});

// -- Phase 3: login desktop-notification alerts ---------------------------
// GET /inquiries/login-alerts — called once right after a FRESH login
// (not on every page load/session restore — the frontend only calls this
// from AuthContext's login(), never from the silent bootstrap/token-restore
// path) to power the browser Notification popup. See
// utils/notificationReasons.js for exactly what qualifies as overdue /
// critical / follow-up, and why 'overdue' is Marketing/Sales-only.
const getLoginAlerts = asyncHandler(async (req, res) => {
  const now = new Date();

  const candidates = await prisma.inquiry.findMany({
    where: {
      assignedTo: req.user.id,
      status: { in: ['new', 'ongoing'] },
      deletedAt: null,
    },
    select: { id: true, customerName: true, priority: true, status: true, updatedAt: true },
  });

  const items = candidates
    .map((inq) => ({
      id: inq.id,
      shortId: `INQ-${inq.id.slice(0, 4).toUpperCase()}`,
      customerName: inq.customerName,
      reasons: notificationReasons(inq, req.user.role, now),
    }))
    .filter((item) => item.reasons.length > 0);

  res.json({ items });
});

// GET /inquiries/newly-assigned?since=<ISO timestamp> — powers the
// 60-second desktop-notification poll while the app stays open. Distinct
// from getLoginAlerts above: this is unconditional on priority/staleness —
// a brand new inquiry has none of those yet — it's purely "has anything
// been assigned to me (created fresh, or reassigned to me) since I last
// checked." assignedAt covers both cases; see the schema comment on it.
const newlyAssignedQuerySchema = z.object({ since: z.string().datetime() });

const getNewlyAssigned = asyncHandler(async (req, res) => {
  const { since } = newlyAssignedQuerySchema.parse(req.query);

  const items = await prisma.inquiry.findMany({
    where: {
      assignedTo: req.user.id,
      assignedAt: { gt: new Date(since) },
      deletedAt: null,
    },
    orderBy: { assignedAt: 'asc' },
    select: { id: true, customerName: true, assignedAt: true, priority: true, inquiryType: true },
  });

  res.json({
    items: items.map((inq) => ({
      id: inq.id,
      shortId: `INQ-${inq.id.slice(0, 4).toUpperCase()}`,
      customerName: inq.customerName,
      assignedAt: inq.assignedAt,
      priority: inq.priority,
      inquiryType: inq.inquiryType,
    })),
  });
});

// -- Completed hierarchy aggregates ------------------------------------
// Cheap COUNT-based aggregates for the Year -> Month drill-down. Built
// with a raw query (Prisma's groupBy can't EXTRACT from a date), but the
// visibility scope is still applied as a normal parameterized filter.

// GET /inquiries/completed/years
const listCompletedYears = asyncHandler(async (req, res) => {
  const visibleIds = await getVisibleUserIds(req.user);

  const rows = await prisma.$queryRawUnsafe(
    `
    SELECT EXTRACT(YEAR FROM "completedAt")::int AS year, COUNT(*)::int AS total
    FROM "Inquiry"
    WHERE status = 'completed' AND "deletedAt" IS NULL AND "completedAt" IS NOT NULL
    ${visibleIds ? `AND "assignedTo" = ANY($1)` : ''}
    GROUP BY year
    ORDER BY year DESC
    `,
    ...(visibleIds ? [visibleIds] : []),
  );

  res.json({ years: rows });
});

// GET /inquiries/completed/years/:year/months
const listCompletedMonths = asyncHandler(async (req, res) => {
  const year = Number(req.params.year);
  if (!Number.isInteger(year)) return res.status(400).json({ error: 'Invalid year' });

  const visibleIds = await getVisibleUserIds(req.user);

  const rows = await prisma.$queryRawUnsafe(
    `
    SELECT EXTRACT(MONTH FROM "completedAt")::int AS month, COUNT(*)::int AS total
    FROM "Inquiry"
    WHERE status = 'completed' AND "deletedAt" IS NULL AND "completedAt" IS NOT NULL
      AND EXTRACT(YEAR FROM "completedAt") = $1
    ${visibleIds ? `AND "assignedTo" = ANY($2)` : ''}
    GROUP BY month
    ORDER BY month ASC
    `,
    ...(visibleIds ? [year, visibleIds] : [year]),
  );

  res.json({ year, months: rows });
});

// -- Aggregate stats (dashboard cards, per-user breakdowns) -------------
// COUNT-based, never fetches full rows — this is what Dashboard/User
// Management use instead of pulling the entire visible inquiry list.

// GET /inquiries/stats
const getStats = asyncHandler(async (req, res) => {
  const where = { ...(await inquiryVisibilityWhere(req.user)), deletedAt: null };

  const [total, newCount, ongoing, completed] = await Promise.all([
    prisma.inquiry.count({ where }),
    prisma.inquiry.count({ where: { ...where, status: 'new' } }),
    prisma.inquiry.count({ where: { ...where, status: 'ongoing' } }),
    prisma.inquiry.count({ where: { ...where, status: 'completed' } }),
  ]);

  res.json({ total, new: newCount, ongoing, completed });
});

// GET /inquiries/stats/by-user — per-assignee counts within the caller's
// visibility scope. Used for the leader/manager "per-employee breakdown"
// and the User Management / User Information detail popup.
const getStatsByUser = asyncHandler(async (req, res) => {
  const where = { ...(await inquiryVisibilityWhere(req.user)), deletedAt: null };

  const rows = await prisma.inquiry.groupBy({
    by: ['assignedTo', 'status'],
    where,
    _count: { _all: true },
  });

  const byUser = new Map();
  for (const row of rows) {
    const entry =
      byUser.get(row.assignedTo) ?? { userId: row.assignedTo, total: 0, new: 0, ongoing: 0, completed: 0 };
    entry.total += row._count._all;
    entry[row.status] = row._count._all;
    byUser.set(row.assignedTo, entry);
  }

  // Bounded by distinct assignees (at most ~200 org-wide), not by inquiry
  // row count — safe even at 50k inquiries. Non-admin roles can't hit
  // GET /users directly, so this is the only way the frontend learns
  // assignee names for the breakdown without a full inquiry-list fetch.
  const userIds = Array.from(byUser.keys());
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, role: true },
  });
  const userById = new Map(users.map((u) => [u.id, u]));

  const stats = Array.from(byUser.values()).map((entry) => ({
    ...entry,
    user: userById.get(entry.userId) ?? null,
  }));

  res.json({ stats });
});

// -- Analytics (Phase 3, built by a teammate) ------------------------------
// A separate, higher-level view from getStats/getStatsByUser above: a
// year (+optional month) snapshot of volume, status split, and source
// breakdown, with an independent role filter layered on top of the
// caller's own visibility (an admin/manager/leader can narrow the view to
// e.g. "just Sales Agents"; a Sales Agent can only ever see 'all', which
// for them is just their own scope anyway).
// Shared by getAnalytics (below) and the analytics export endpoint — the
// exact same computation either way, so the exported file always matches
// what's on screen. `req` here is only ever used for req.user.
async function computeAnalytics(req) {
  const requestedYear = Number(req.query.year);
  const requestedMonth = req.query.month ? Number(req.query.month) : null;

  const year =
    Number.isInteger(requestedYear) && requestedYear >= 2000 && requestedYear <= 2100
      ? requestedYear
      : new Date().getFullYear();

  const month =
    Number.isInteger(requestedMonth) && requestedMonth >= 1 && requestedMonth <= 12 ? requestedMonth : null;

  const role = analyticsRoleSchema.parse(req.query.role || 'all');

  // Determine the users the current viewer is allowed to see, then
  // intersect with the requested role filter (if any).
  const visibleIds = await getVisibleUserIds(req.user);
  let assigneeIds = visibleIds !== null ? visibleIds : null;

  if (role !== 'all') {
    const roleUsers = await prisma.user.findMany({
      where: { role, ...(assigneeIds ? { id: { in: assigneeIds } } : {}) },
      select: { id: true },
    });
    assigneeIds = roleUsers.map((u) => u.id);
  }

  const start = month ? new Date(Date.UTC(year, month - 1, 1)) : new Date(Date.UTC(year, 0, 1));
  const end = month ? new Date(Date.UTC(year, month, 1)) : new Date(Date.UTC(year + 1, 0, 1));

  const baseWhere = {
    deletedAt: null,
    createdAt: { gte: start, lt: end },
    ...(assigneeIds ? { assignedTo: { in: assigneeIds } } : {}),
  };

  const [total, newCount, ongoing, completed, criticalCount] = await Promise.all([
    prisma.inquiry.count({ where: baseWhere }),
    prisma.inquiry.count({ where: { ...baseWhere, status: 'new' } }),
    prisma.inquiry.count({ where: { ...baseWhere, status: 'ongoing' } }),
    prisma.inquiry.count({ where: { ...baseWhere, status: 'completed' } }),
    prisma.inquiry.count({ where: { ...baseWhere, status: { not: 'completed' }, priority: 'critical' } }),
  ]);

  const pending = 0; // reserved for a future distinct "pending customer response" status
  const completionRate = total === 0 ? 0 : Math.round((completed / total) * 100);

  // Pipeline estimate based on active inquiries in this period
  const activeCount = total - completed;
  const pipelineEstimate = activeCount * 15000;
  const pipeline =
    pipelineEstimate >= 1000000
      ? `$${(pipelineEstimate / 1000000).toFixed(1)}M`
      : `$${Math.round(pipelineEstimate / 1000)}K`;

  // Fetch all inquiries in baseWhere for detailed grouping (monthly, weekly, leader teams, specialists)
  const periodInquiries = await prisma.inquiry.findMany({
    where: baseWhere,
    select: { id: true, createdAt: true, status: true, priority: true, assignedTo: true },
  });

  // Monthly activity
  const monthlyMap = new Map();
  for (const inq of periodInquiries) {
    const monthNumber = inq.createdAt.getUTCMonth() + 1;
    if (!monthlyMap.has(monthNumber)) {
      monthlyMap.set(monthNumber, { month: monthNumber, new: 0, ongoing: 0, completed: 0, total: 0 });
    }
    const entry = monthlyMap.get(monthNumber);
    entry.total += 1;
    if (inq.status === 'new') entry.new += 1;
    if (inq.status === 'ongoing') entry.ongoing += 1;
    if (inq.status === 'completed') entry.completed += 1;
  }

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fullMonthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const monthly = monthNames.map((label, index) => {
    const monthNumber = index + 1;
    return monthlyMap.get(monthNumber) ?? { month: monthNumber, label, new: 0, ongoing: 0, completed: 0, total: 0 };
  });
  for (const entry of monthly) entry.label = entry.label ?? monthNames[entry.month - 1];

  // Weekly activity for the current period (1-7, 8-14, 15-21, 22-end)
  const weekly = [
    { week: 'Wk 1', total: 0, resolved: 0 },
    { week: 'Wk 2', total: 0, resolved: 0 },
    { week: 'Wk 3', total: 0, resolved: 0 },
    { week: 'Wk 4', total: 0, resolved: 0 },
  ];
  for (const inq of periodInquiries) {
    const d = inq.createdAt.getUTCDate();
    const wIdx = d <= 7 ? 0 : d <= 14 ? 1 : d <= 21 ? 2 : 3;
    weekly[wIdx].total += 1;
    if (inq.status === 'completed') weekly[wIdx].resolved += 1;
  }

  // Sources
  const sourceRows = await prisma.inquiry.groupBy({
    by: ['source'],
    where: baseWhere,
    _count: { _all: true },
  });
  sourceRows.sort((a, b) => b._count._all - a._count._all);

  const sourceLabels = { social: 'Social Media', email: 'Email', phone: 'Phone', physical: 'Physical' };
  const sources = sourceRows.map((row) => ({
    source: row.source ?? 'unknown',
    label: sourceLabels[row.source] ?? 'Unknown',
    total: row._count._all,
  }));

  // Leaders & Specialists breakdown from actual database users
  const getInitials = (name) =>
    name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  const dbLeaders = await prisma.user.findMany({
    where: {
      role: 'leader',
      deletedAt: null,
      ...(assigneeIds ? { id: { in: assigneeIds } } : {}),
    },
    include: {
      salesReps: {
        where: { deletedAt: null },
        orderBy: { name: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  });

  const leaders = [];
  const specialists = [];

  for (const leader of dbLeaders) {
    const teamUserIds = [leader.id, ...leader.salesReps.map((r) => r.id)];
    const teamInquiries = periodInquiries.filter((i) => teamUserIds.includes(i.assignedTo));

    const teamTotal = teamInquiries.length;
    const teamNew = teamInquiries.filter((i) => i.status === 'new').length;
    const teamActive = teamInquiries.filter((i) => i.status === 'ongoing').length;
    const teamPending = 0;
    const teamDone = teamInquiries.filter((i) => i.status === 'completed').length;
    const teamRate = teamTotal > 0 ? Math.round((teamDone / teamTotal) * 100) : 0;
    const teamName = `${leader.name}'s Team`;

    const members = leader.salesReps.map((rep) => {
      const repInqs = periodInquiries.filter((i) => i.assignedTo === rep.id);
      const repTotal = repInqs.length;
      const repNew = repInqs.filter((i) => i.status === 'new').length;
      const repOngoing = repInqs.filter((i) => i.status === 'ongoing').length;
      const repDone = repInqs.filter((i) => i.status === 'completed').length;
      const repRate = repTotal > 0 ? Math.round((repDone / repTotal) * 100) : 0;

      const memberMetric = {
        id: rep.id,
        name: rep.name,
        avatarInitials: getInitials(rep.name),
        total: repTotal,
        new: repNew,
        inProgress: repOngoing,
        pending: 0,
        resolved: repDone,
        rate: repRate,
      };

      specialists.push({
        ...memberMetric,
        team: teamName,
        leader: leader.name,
      });

      return memberMetric;
    });

    const statusDistribution = [
      { id: 'new', label: 'New', count: teamNew, color: '#06b6d4' },
      { id: 'ongoing', label: 'In Progress', count: teamActive, color: '#d97706' },
      { id: 'pending', label: 'Pending', count: teamPending, color: '#8b5cf6' },
      { id: 'completed', label: 'Resolved', count: teamDone, color: '#047857' },
      { id: 'cancelled', label: 'Cancelled', count: 0, color: '#64748b' },
    ];

    leaders.push({
      detail: {
        id: leader.id,
        name: leader.name,
        teamName,
        avatarInitials: getInitials(leader.name),
        specialistsCount: leader.salesReps.length,
        monthLabel: month ? fullMonthNames[month - 1] : 'Full Year',
        year,
        members,
        statusDistribution,
      },
      total: teamTotal,
      new: teamNew,
      active: teamActive,
      pending: teamPending,
      done: teamDone,
      resRate: `${teamRate}% Res.`,
      rateNum: teamRate,
    });
  }

  // Also include any sales reps who do not belong to a leader
  const unassignedSales = await prisma.user.findMany({
    where: {
      role: 'sales',
      leaderId: null,
      deletedAt: null,
      ...(assigneeIds ? { id: { in: assigneeIds } } : {}),
    },
    orderBy: { name: 'asc' },
  });

  for (const rep of unassignedSales) {
    const repInqs = periodInquiries.filter((i) => i.assignedTo === rep.id);
    const repTotal = repInqs.length;
    const repDone = repInqs.filter((i) => i.status === 'completed').length;
    specialists.push({
      id: rep.id,
      name: rep.name,
      avatarInitials: getInitials(rep.name),
      total: repTotal,
      new: repInqs.filter((i) => i.status === 'new').length,
      inProgress: repInqs.filter((i) => i.status === 'ongoing').length,
      pending: 0,
      resolved: repDone,
      rate: repTotal > 0 ? Math.round((repDone / repTotal) * 100) : 0,
      team: 'Direct Sales',
      leader: 'Direct',
    });
  }

  return {
    year,
    month,
    role,
    summary: { total, new: newCount, ongoing, completed, pending, completionRate },
    monthly,
    sources,
    weekly,
    criticalCount,
    pipeline,
    leaders,
    specialists,
  };
}

const getAnalytics = asyncHandler(async (req, res) => {
  const result = await computeAnalytics(req);
  res.json(result);
});

// GET /inquiries/analytics/export?format=xlsx|pdf|docx&year=&month=&role=
// Exports exactly what's currently on screen — reuses computeAnalytics so
// the file can never drift from the page. No separate scope picker (year/
// month/week) like the Inquiries export has: Analytics already has its
// Year/Month/Role filters visible on the page itself, so the export just
// captures whatever's currently selected there.
const analyticsExportFormatSchema = z.object({ format: z.enum(['xlsx', 'pdf', 'docx']) });

const getAnalyticsExport = asyncHandler(async (req, res) => {
  const { format } = analyticsExportFormatSchema.parse(req.query);
  const analytics = await computeAnalytics(req);

  const { buffer, filename, contentType } = await generateAnalyticsExport(format, analytics);

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
});

// -- Assignable users for the create/reassign dropdown -------------------
// Distinct from GET /users (admin-only, full org). This is scoped to
// exactly who the caller is allowed to assign an inquiry to, and is safe
// for leader/manager/admin to call directly — the list size is bounded by
// org headcount (~200), not inquiry volume.
const listAssignableUsers = asyncHandler(async (req, res) => {
  const { role, id } = req.user;

  if (role === 'sales') {
    // Sales employees can't reassign — nothing to offer.
    return res.json({ users: [] });
  }

  let where;
  if (role === 'leader') {
    // A leader's own marketing agents — this is the "Assign Marketing"
    // pool when logging or editing an inquiry.
    where = { role: 'sales', leaderId: id, isActive: true };
  } else {
    // manager / admin — anyone the inquiry could actually be worked by.
    // Bounded by org size, not inquiry count, so a single query is fine.
    where = { role: { in: ['leader', 'sales'] }, isActive: true };
  }

  const users = await prisma.user.findMany({
    where,
    select: { id: true, name: true, role: true },
    orderBy: { name: 'asc' },
  });

  res.json({ users });
});

// -- Mutations ------------------------------------------------------------

// POST /inquiries/:id/view — call this whenever a user opens an inquiry's
// detail (Active/Completed/Tasks/Dashboard). Does two things atomically:
// (1) records this user as having seen it now (clears their red dot), and
// (2) if the viewer IS the assignee and status is still 'new', auto-
// promotes it to 'ongoing' — see phase3 spec §3 for why only the
// assignee's own view counts, not a leader/manager just glancing at it.
const markInquiryViewed = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = await prisma.inquiry.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) return res.status(404).json({ error: 'Inquiry not found' });

  const inScope = await isUserIdInScope(req.user, existing.assignedTo);
  if (!inScope) return res.status(403).json({ error: 'You do not have access to this inquiry' });

  await prisma.inquirySeen.upsert({
    where: { userId_inquiryId: { userId: req.user.id, inquiryId: id } },
    create: { userId: req.user.id, inquiryId: id },
    update: { lastSeenAt: new Date() },
  });

  let inquiry;
  if (req.user.id === existing.assignedTo && existing.status === 'new') {
    inquiry = await prisma.inquiry.update({
      where: { id },
      data: { status: 'ongoing' },
      include: INCLUDE_PARTICIPANTS,
    });
    await logActivity({
      actorId: req.user.id,
      action: 'inquiry_status_changed',
      targetType: 'inquiry',
      targetId: inquiry.id,
      metadata: {
        customerName: inquiry.customerName,
        field: 'status',
        from: 'new',
        to: 'ongoing',
        trigger: 'auto-view',
      },
    });
  } else {
    inquiry = await prisma.inquiry.findUnique({ where: { id }, include: INCLUDE_PARTICIPANTS });
  }

  res.json({ inquiry: augmentWithStaleness(inquiry) });
});

// POST /inquiries
const createInquiry = asyncHandler(async (req, res) => {
  const data = createInquirySchema.parse(req.body);
  const assignedTo = data.assignedTo || req.user.id;

  const allowed = await isUserIdInScope(req.user, assignedTo);
  if (!allowed) {
    return res.status(403).json({ error: 'You cannot assign an inquiry to that user' });
  }

  // Case-insensitive contact matching — "chester" and "Chester" resolve to
  // the same Customer row. See utils/customers.js for the matching rule.
  const customer = await resolveOrCreateCustomer(prisma, data.customerName, req.user.id);

  const inquiry = await prisma.inquiry.create({
    data: { ...data, assignedTo, createdBy: req.user.id, customerId: customer.id },
    include: INCLUDE_PARTICIPANTS,
  });

  await logActivity({
    actorId: req.user.id,
    action: 'inquiry_created',
    targetType: 'inquiry',
    targetId: inquiry.id,
    metadata: { customerName: inquiry.customerName },
  });

  res.status(201).json({ inquiry });
});

// PATCH /inquiries/:id
const updateInquiry = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data = updateInquirySchema.parse(req.body);

  const existing = await prisma.inquiry.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) return res.status(404).json({ error: 'Inquiry not found' });

  const inScope = await isUserIdInScope(req.user, existing.assignedTo);
  if (!inScope) {
    return res.status(403).json({ error: 'You do not have access to this inquiry' });
  }

  if (data.assignedTo && req.user.role === 'sales') {
    return res.status(403).json({ error: 'Sales employees cannot reassign inquiries' });
  }
  if (data.assignedTo) {
    const targetInScope = await isUserIdInScope(req.user, data.assignedTo);
    if (!targetInScope) {
      return res.status(403).json({ error: 'You cannot reassign to a user outside your scope' });
    }
  }

  // completedAt tracks status transitions specifically, not general edits.
  const statusChanged = data.status && data.status !== existing.status;
  const updateData = { ...data };
  if (statusChanged) {
    updateData.completedAt = data.status === 'completed' ? new Date() : null;
  }

  // assignedAt tracks reassignment specifically (not every edit) — it's
  // the trigger instant the unseen-notification system uses to detect a
  // "freshly assigned to you" state. See utils/unseen.js.
  if (data.assignedTo && data.assignedTo !== existing.assignedTo) {
    updateData.assignedAt = new Date();
  }

  // If the customer name changed, re-resolve — either match a different
  // existing contact or spin up a new one. A pure case-only correction
  // (e.g. "chester" -> "Chester") re-matches the same contact via
  // normalizedName, so this doesn't fragment history for simple fixes.
  if (data.customerName && normalize(data.customerName) !== normalize(existing.customerName)) {
    const customer = await resolveOrCreateCustomer(prisma, data.customerName, req.user.id);
    updateData.customerId = customer.id;
  }

  const inquiry = await prisma.inquiry.update({
    where: { id },
    data: updateData,
    include: INCLUDE_PARTICIPANTS,
  });

  await logActivity({
    actorId: req.user.id,
    action: statusChanged ? 'inquiry_status_changed' : 'inquiry_updated',
    targetType: 'inquiry',
    targetId: inquiry.id,
    metadata: statusChanged
      ? { customerName: inquiry.customerName, field: 'status', from: existing.status, to: data.status }
      : { customerName: inquiry.customerName },
  });

  res.json({ inquiry });
});

// DELETE /inquiries/:id — soft delete
const deleteInquiry = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = await prisma.inquiry.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) return res.status(404).json({ error: 'Inquiry not found' });

  const allowed = await canDeleteInquiry(req.user, existing);
  if (!allowed) {
    return res.status(403).json({ error: 'You do not have permission to delete this inquiry' });
  }

  const inquiry = await prisma.inquiry.update({
    where: { id },
    data: { deletedAt: new Date(), deletedBy: req.user.id },
    include: INCLUDE_PARTICIPANTS,
  });

  await logActivity({
    actorId: req.user.id,
    action: 'inquiry_deleted',
    targetType: 'inquiry',
    targetId: inquiry.id,
    metadata: { customerName: inquiry.customerName },
  });

  res.json({ inquiry, message: 'Inquiry moved to Deleted' });
});

// POST /inquiries/:id/restore
const restoreInquiry = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = await prisma.inquiry.findUnique({ where: { id } });
  if (!existing || !existing.deletedAt) {
    return res.status(404).json({ error: 'Inquiry not found in Deleted' });
  }

  // Same permission rule as delete — whoever could delete it can restore it.
  const allowed = await canDeleteInquiry(req.user, existing);
  if (!allowed) {
    return res.status(403).json({ error: 'You do not have permission to restore this inquiry' });
  }

  const inquiry = await prisma.inquiry.update({
    where: { id },
    data: { deletedAt: null, deletedBy: null },
    include: INCLUDE_PARTICIPANTS,
  });

  await logActivity({
    actorId: req.user.id,
    action: 'inquiry_restored',
    targetType: 'inquiry',
    targetId: inquiry.id,
    metadata: { customerName: inquiry.customerName },
  });

  res.json({ inquiry, message: 'Inquiry restored' });
});

// DELETE /inquiries/:id/permanent — only callable on an already
// soft-deleted inquiry (must go through Deleted first). This is a genuine,
// irreversible hard delete — no undo, unlike the soft delete above.
// Same permission tier as soft-delete/restore.
const permanentlyDeleteInquiry = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const existing = await prisma.inquiry.findUnique({ where: { id } });
  if (!existing || !existing.deletedAt) {
    return res.status(404).json({ error: 'Inquiry not found in Deleted' });
  }

  const allowed = await canDeleteInquiry(req.user, existing);
  if (!allowed) {
    return res.status(403).json({ error: 'You do not have permission to permanently delete this inquiry' });
  }

  // Log before the row is gone — targetId is a plain string, not an FK, so
  // the log entry survives the inquiry's actual removal.
  await logActivity({
    actorId: req.user.id,
    action: 'inquiry_permanently_deleted',
    targetType: 'inquiry',
    targetId: existing.id,
    metadata: { customerName: existing.customerName },
  });

  await prisma.$transaction([
    prisma.inquirySeen.deleteMany({ where: { inquiryId: id } }),
    prisma.inquiry.delete({ where: { id } }),
  ]);

  res.json({ message: 'Inquiry permanently deleted' });
});

module.exports = {
  listActive,
  listCompleted,
  listDeleted,
  exportInquiries,
  listTasks,
  listCompletedYears,
  listCompletedMonths,
  getStats,
  getStatsByUser,
  getAnalytics,
  getAnalyticsExport,
  getUnseenSummary,
  getNotifications,
  getLoginAlerts,
  getNewlyAssigned,
  listAssignableUsers,
  createInquiry,
  updateInquiry,
  deleteInquiry,
  restoreInquiry,
  permanentlyDeleteInquiry,
  markInquiryViewed,
};
