const { z } = require('zod');
const prisma = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');
const { parsePagination, paginatedResponse } = require('../utils/pagination');

const activityQuerySchema = z.object({ q: z.string().trim().max(200).optional() });

// GET /logs/activity — admin only. Newest first, paginated. See
// docs/phase2_logs_inquiries_spec.md §4 — rows older than 30 days are
// purged by a nightly job (src/jobs/purgeActivityLogs.js), so this table
// never grows unbounded regardless of how long the system has been live.
// Optional ?q= matches the actor's name or the action/description text.
const listActivity = asyncHandler(async (req, res) => {
  const { page, pageSize, skip, take } = parsePagination(req.query);
  const { q } = activityQuerySchema.parse(req.query);

  const where = q
    ? {
        OR: [
          { actor: { name: { contains: q, mode: 'insensitive' } } },
          { action: { contains: q, mode: 'insensitive' } },
        ],
      }
    : {};

  const [items, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: { actor: { select: { id: true, name: true, role: true } } },
    }),
    prisma.activityLog.count({ where }),
  ]);

  res.json(paginatedResponse(items, total, page, pageSize));
});

// GET /logs/inquiries — admin only. A simplified, org-wide, newest-first
// feed of inquiry records (no visibility scoping — admin sees everything
// by design), filterable Active/Completed, paginated. This is distinct
// from the top-level Inquiries page: that one is the working page every
// role uses day-to-day; this one is a flat oversight feed.
// Optional ?q= matches customer name or the assigned rep's name.
const logsInquiriesQuerySchema = z.object({
  view: z.enum(['active', 'completed']).default('active'),
  q: z.string().trim().max(200).optional(),
});

const listInquiriesLog = asyncHandler(async (req, res) => {
  const { page, pageSize, skip, take } = parsePagination(req.query);
  const { view, q } = logsInquiriesQuerySchema.parse(req.query);

  const where = {
    ...(view === 'completed'
      ? { status: 'completed', deletedAt: null }
      : { status: { in: ['new', 'ongoing'] }, deletedAt: null }),
    ...(q && {
      OR: [
        { customerName: { contains: q, mode: 'insensitive' } },
        { assignedUser: { name: { contains: q, mode: 'insensitive' } } },
      ],
    }),
  };

  const [items, total] = await Promise.all([
    prisma.inquiry.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip,
      take,
      select: {
        id: true,
        customerName: true,
        status: true,
        updatedAt: true,
        createdAt: true,
        assignedUser: { select: { id: true, name: true, role: true } },
      },
    }),
    prisma.inquiry.count({ where }),
  ]);

  res.json(paginatedResponse(items, total, page, pageSize));
});

module.exports = { listActivity, listInquiriesLog };
