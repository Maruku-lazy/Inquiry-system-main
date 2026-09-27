const { z } = require('zod');
const prisma = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');
const { logActivity } = require('../utils/activityLog');

const USER_FIELDS = { id: true, name: true, role: true };

// GET /organization/chart — every role. Returns a scoped slice of the
// hierarchy shaped the same way regardless of who's asking:
//   { managers: [ { id, name, isSelf, leaders: [ { id, name, isSelf, salesReps: [...] } ] } ] }
// Admin sees the whole org; everyone else sees only their own branch (their
// manager, their leader, their peers) — this is a "where do I stand" view,
// not a full directory (that's User Information, admin-only).
const getChart = asyncHandler(async (req, res) => {
  const { role, id } = req.user;

  if (role === 'admin') {
    const [managers, leaders, salesReps] = await Promise.all([
      prisma.user.findMany({ where: { role: 'manager', deletedAt: null }, select: USER_FIELDS, orderBy: { name: 'asc' } }),
      prisma.user.findMany({ where: { role: 'leader', deletedAt: null }, select: { ...USER_FIELDS, managerId: true }, orderBy: { name: 'asc' } }),
      prisma.user.findMany({ where: { role: 'sales', deletedAt: null }, select: { ...USER_FIELDS, leaderId: true }, orderBy: { name: 'asc' } }),
    ]);

    const chart = managers.map((manager) => ({
      ...manager,
      isSelf: false,
      leaders: leaders
        .filter((l) => l.managerId === manager.id)
        .map((leader) => ({
          ...leader,
          isSelf: false,
          salesReps: salesReps
            .filter((s) => s.leaderId === leader.id)
            .map((s) => ({ ...s, isSelf: false })),
        })),
    }));

    return res.json({ managers: chart });
  }

  if (role === 'manager') {
    const me = await prisma.user.findUnique({ where: { id }, select: USER_FIELDS });
    const leaders = await prisma.user.findMany({
      where: { role: 'leader', managerId: id, deletedAt: null },
      select: USER_FIELDS,
      orderBy: { name: 'asc' },
    });
    const salesReps = await prisma.user.findMany({
      where: { role: 'sales', leaderId: { in: leaders.map((l) => l.id) }, deletedAt: null },
      select: { ...USER_FIELDS, leaderId: true },
      orderBy: { name: 'asc' },
    });

    return res.json({
      managers: [
        {
          ...me,
          isSelf: true,
          leaders: leaders.map((leader) => ({
            ...leader,
            isSelf: false,
            salesReps: salesReps.filter((s) => s.leaderId === leader.id).map((s) => ({ ...s, isSelf: false })),
          })),
        },
      ],
    });
  }

  if (role === 'leader') {
    const me = await prisma.user.findUnique({ where: { id }, select: { ...USER_FIELDS, managerId: true } });
    const manager = me.managerId
      ? await prisma.user.findUnique({ where: { id: me.managerId }, select: USER_FIELDS })
      : null;
    const salesReps = await prisma.user.findMany({
      where: { role: 'sales', leaderId: id, deletedAt: null },
      select: USER_FIELDS,
      orderBy: { name: 'asc' },
    });

    return res.json({
      managers: [
        {
          id: manager?.id ?? null,
          name: manager?.name ?? 'No manager assigned',
          isSelf: false,
          leaders: [
            {
              id: me.id,
              name: me.name,
              isSelf: true,
              salesReps: salesReps.map((s) => ({ ...s, isSelf: false })),
            },
          ],
        },
      ],
    });
  }

  // sales
  const me = await prisma.user.findUnique({ where: { id }, select: { ...USER_FIELDS, leaderId: true } });
  const leader = me.leaderId
    ? await prisma.user.findUnique({ where: { id: me.leaderId }, select: { ...USER_FIELDS, managerId: true } })
    : null;
  const manager = leader?.managerId
    ? await prisma.user.findUnique({ where: { id: leader.managerId }, select: USER_FIELDS })
    : null;
  const peers = me.leaderId
    ? await prisma.user.findMany({
        where: { role: 'sales', leaderId: me.leaderId, deletedAt: null },
        select: USER_FIELDS,
        orderBy: { name: 'asc' },
      })
    : [me];

  res.json({
    managers: [
      {
        id: manager?.id ?? null,
        name: manager?.name ?? 'No manager assigned',
        isSelf: false,
        leaders: [
          {
            id: leader?.id ?? null,
            name: leader?.name ?? 'No leader assigned',
            isSelf: false,
            salesReps: peers.map((p) => ({ ...p, isSelf: p.id === id })),
          },
        ],
      },
    ],
  });
});

// -- Team Management (manager only) --------------------------------------

// GET /organization/my-team — data needed to render the "Assign Marketing"
// picker per leader: the manager's own leaders, plus every sales rep
// that's either unassigned or already under one of those leaders (the
// only pool a manager is allowed to reassign from — see assignSalesToLeader).
const getMyTeam = asyncHandler(async (req, res) => {
  const leaders = await prisma.user.findMany({
    where: { role: 'leader', managerId: req.user.id, deletedAt: null },
    select: USER_FIELDS,
    orderBy: { name: 'asc' },
  });
  const leaderIds = leaders.map((l) => l.id);

  const salesReps = await prisma.user.findMany({
    where: {
      role: 'sales',
      deletedAt: null,
      OR: [{ leaderId: null }, { leaderId: { in: leaderIds } }],
    },
    select: { ...USER_FIELDS, leaderId: true },
    orderBy: { name: 'asc' },
  });

  res.json({ leaders, salesReps });
});

// PATCH /organization/assign-sales — moves one sales rep to one of the
// manager's own leaders (or unassigns them with leaderId: null). Scoped
// tightly: a manager can only pull from unassigned reps or reps already
// under one of their own leaders, and can only assign into their own
// leaders — never poaching from another manager's team.
const assignSalesSchema = z.object({
  salesId: z.string().uuid(),
  leaderId: z.string().uuid().nullable(),
});

const assignSalesToLeader = asyncHandler(async (req, res) => {
  const { salesId, leaderId } = assignSalesSchema.parse(req.body);

  const sales = await prisma.user.findUnique({ where: { id: salesId } });
  if (!sales || sales.role !== 'sales' || sales.deletedAt) {
    return res.status(404).json({ error: 'Marketing agent not found' });
  }

  if (sales.leaderId) {
    const currentLeader = await prisma.user.findUnique({ where: { id: sales.leaderId } });
    if (!currentLeader || currentLeader.managerId !== req.user.id) {
      return res.status(403).json({ error: 'This agent is not part of your team' });
    }
  }

  if (leaderId) {
    const targetLeader = await prisma.user.findUnique({ where: { id: leaderId } });
    if (!targetLeader || targetLeader.role !== 'leader' || targetLeader.managerId !== req.user.id) {
      return res.status(403).json({ error: 'You can only assign to a leader under you' });
    }
  }

  const updated = await prisma.user.update({ where: { id: salesId }, data: { leaderId } });

  await logActivity({
    actorId: req.user.id,
    action: 'user_updated',
    targetType: 'user',
    targetId: updated.id,
    metadata: { name: updated.name, field: 'leaderId' },
  });

  res.json({ user: { id: updated.id, name: updated.name, leaderId: updated.leaderId } });
});

module.exports = { getChart, getMyTeam, assignSalesToLeader };
