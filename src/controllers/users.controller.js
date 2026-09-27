const { z } = require('zod');
const prisma = require('../config/db');
const { hashPassword } = require('../utils/password');
const { asyncHandler } = require('../middleware/errorHandler');
const { toSafeUser } = require('./auth.controller');
const { logActivity } = require('../utils/activityLog');

const roleEnum = z.enum(['admin', 'manager', 'leader', 'sales']);

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: roleEnum,
  managerId: z.string().uuid().nullable().optional(),
  leaderId: z.string().uuid().nullable().optional(),
});

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  role: roleEnum.optional(),
  managerId: z.string().uuid().nullable().optional(),
  leaderId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
});

// Enforces the hierarchy shape described in the spec:
//   leader.managerId must point at a user with role 'manager'
//   sales.leaderId must point at a user with role 'leader'
async function validateHierarchyLinks({ role, managerId, leaderId }) {
  if (role === 'leader' && managerId) {
    const manager = await prisma.user.findUnique({ where: { id: managerId } });
    if (!manager || manager.role !== 'manager') {
      const err = new Error('managerId must reference an existing user with role "manager"');
      err.status = 400;
      err.expose = true;
      throw err;
    }
  }

  if (role === 'sales' && leaderId) {
    const leader = await prisma.user.findUnique({ where: { id: leaderId } });
    if (!leader || leader.role !== 'leader') {
      const err = new Error('leaderId must reference an existing user with role "leader"');
      err.status = 400;
      err.expose = true;
      throw err;
    }
  }
}

// GET /users (admin only) — optional ?role=admin|manager|leader|sales filter
const listUsersQuerySchema = z.object({
  role: roleEnum.optional(),
});

const listUsers = asyncHandler(async (req, res) => {
  const { role } = listUsersQuerySchema.parse(req.query);
  const users = await prisma.user.findMany({
    // Deleted accounts (distinct from merely deactivated) never show here
    // or anywhere else in the UI — their historical records still resolve
    // fine elsewhere via the raw DB row, just not surfaced as a live account.
    where: { deletedAt: null, ...(role ? { role } : {}) },
    orderBy: { createdAt: 'asc' },
  });
  res.json({ users: users.map(toSafeUser) });
});

// POST /users (admin only)
const createUser = asyncHandler(async (req, res) => {
  const data = createUserSchema.parse(req.body);
  await validateHierarchyLinks(data);

  const passwordHash = await hashPassword(data.password);

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role,
      managerId: data.managerId ?? null,
      leaderId: data.leaderId ?? null,
    },
  });

  await logActivity({
    actorId: req.user.id,
    action: 'user_created',
    targetType: 'user',
    targetId: user.id,
    metadata: { name: user.name, role: user.role },
  });

  res.status(201).json({ user: toSafeUser(user) });
});

// PATCH /users/:id (admin only)
const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data = updateUserSchema.parse(req.body);

  if (data.role || data.managerId !== undefined || data.leaderId !== undefined) {
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'User not found' });
    await validateHierarchyLinks({
      role: data.role ?? existing.role,
      managerId: data.managerId !== undefined ? data.managerId : existing.managerId,
      leaderId: data.leaderId !== undefined ? data.leaderId : existing.leaderId,
    });
  }

  const updateData = { ...data };
  delete updateData.password;
  if (data.password) {
    updateData.passwordHash = await hashPassword(data.password);
  }

  const user = await prisma.user.update({ where: { id }, data: updateData });

  const isReactivation = data.isActive === true;
  await logActivity({
    actorId: req.user.id,
    action: isReactivation ? 'user_reactivated' : 'user_updated',
    targetType: 'user',
    targetId: user.id,
    metadata: { name: user.name },
  });

  res.json({ user: toSafeUser(user) });
});

// DELETE /users/:id (admin only)
// Soft-delete: flips isActive to false rather than a hard delete, since
// inquiries reference users via assignedTo/createdBy and hard-deleting
// would orphan historical inquiry records.
const deactivateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await prisma.user.update({
    where: { id },
    data: { isActive: false },
  });

  await logActivity({
    actorId: req.user.id,
    action: 'user_deactivated',
    targetType: 'user',
    targetId: user.id,
    metadata: { name: user.name },
  });

  res.json({ user: toSafeUser(user), message: 'User deactivated' });
});

// POST /users/:id/delete-account (admin only)
// The "Delete Account" action from User Management's edit view — distinct
// from Deactivate (reversible, still shows in lists). This is one-way from
// the UI's perspective (no "undelete" button), but the row is never
// actually removed — see the deletedAt field comment in schema.prisma for
// why. Their existing inquiries/activity history are completely untouched;
// a supervisor just needs to notice and reassign anything still pointing
// at this account (the frontend surfaces an "Account deleted" hint on the
// inquiry's assignee for this reason).
const deleteUserAccount = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (id === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own account' });
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing || existing.deletedAt) {
    return res.status(404).json({ error: 'User not found' });
  }

  const user = await prisma.user.update({
    where: { id },
    data: { isActive: false, deletedAt: new Date() },
  });

  await logActivity({
    actorId: req.user.id,
    action: 'user_deleted',
    targetType: 'user',
    targetId: user.id,
    metadata: { name: user.name, role: user.role },
  });

  res.json({ user: toSafeUser(user), message: 'Account deleted' });
});

module.exports = { listUsers, createUser, updateUser, deactivateUser, deleteUserAccount };
