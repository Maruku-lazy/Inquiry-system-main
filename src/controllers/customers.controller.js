const { z } = require('zod');
const prisma = require('../config/db');
const { asyncHandler } = require('../middleware/errorHandler');
const { inquiryVisibilityWhere } = require('../utils/visibility');
const { parsePagination, paginatedResponse } = require('../utils/pagination');
const { logActivity } = require('../utils/activityLog');
const { normalize } = require('../utils/customers');

// Every stat here is computed within the CALLER'S OWN visibility scope,
// not globally — a leader viewing Contacts sees this customer's history
// only across their own team's inquiries, consistent with how every other
// list in the app enforces server-side visibility. A manager/admin's scope
// is unrestricted, so for them this is effectively the customer's full
// history anyway.

const listContactsQuerySchema = z.object({ q: z.string().trim().max(200).optional() });

// GET /contacts — paginated, sorted alphabetically (case-insensitive).
// Optional ?q= filters by contact name (contains, case-insensitive).
const listContacts = asyncHandler(async (req, res) => {
  const { page, pageSize, skip, take } = parsePagination(req.query);
  const { q } = listContactsQuerySchema.parse(req.query);
  const where = { ...(await inquiryVisibilityWhere(req.user)), deletedAt: null, customerId: { not: null } };

  // Aggregate in the DB (bounded by distinct-customer count, not inquiry
  // count) rather than pulling raw inquiry rows into Node.
  const grouped = await prisma.inquiry.groupBy({
    by: ['customerId'],
    where,
    _count: { _all: true },
    _min: { createdAt: true },
    _max: { createdAt: true },
  });

  const customers = await prisma.customer.findMany({
    where: { id: { in: grouped.map((g) => g.customerId) }, deletedAt: null },
    include: { firstLoggedBy: { select: { id: true, name: true, role: true } } },
  });
  const customerById = new Map(customers.map((c) => [c.id, c]));

  const merged = grouped
    .map((g) => {
      const customer = customerById.get(g.customerId);
      if (!customer) return null; // contact itself soft-deleted
      return {
        id: customer.id,
        name: customer.name,
        totalInquiries: g._count._all,
        firstInquiryDate: g._min.createdAt,
        lastInquiryDate: g._max.createdAt,
        firstLoggedBy: customer.firstLoggedBy,
      };
    })
    .filter(Boolean)
    .filter((c) => !q || c.name.toLowerCase().includes(q.toLowerCase()))
    // Alphabetical, case-insensitive — "chester" and "Chester" already
    // collapse to one row (see resolveOrCreateCustomer), and this sorts
    // any two different display-cased names the same way regardless of
    // case (localeCompare with sensitivity:'base' ignores case entirely).
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

  const total = merged.length;
  const items = merged.slice(skip, skip + take);

  res.json(paginatedResponse(items, total, page, pageSize));
});

// GET /contacts/:id — summary (used by the detail modal's header).
const getContact = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: { firstLoggedBy: { select: { id: true, name: true, role: true } } },
  });
  if (!customer || customer.deletedAt) return res.status(404).json({ error: 'Contact not found' });

  const where = { ...(await inquiryVisibilityWhere(req.user)), deletedAt: null, customerId: id };
  const agg = await prisma.inquiry.aggregate({
    where,
    _count: { _all: true },
    _min: { createdAt: true },
    _max: { createdAt: true },
  });

  if (agg._count._all === 0) {
    // Exists, but nothing in this caller's visibility scope — treat as
    // not found rather than leaking that the name exists elsewhere.
    return res.status(404).json({ error: 'Contact not found' });
  }

  res.json({
    contact: {
      id: customer.id,
      name: customer.name,
      totalInquiries: agg._count._all,
      firstInquiryDate: agg._min.createdAt,
      lastInquiryDate: agg._max.createdAt,
      firstLoggedBy: customer.firstLoggedBy,
    },
  });
});

// GET /contacts/:id/inquiries — paginated inquiry history, newest first.
const listContactInquiries = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { page, pageSize, skip, take } = parsePagination(req.query);
  const where = { ...(await inquiryVisibilityWhere(req.user)), deletedAt: null, customerId: id };

  const [items, total] = await Promise.all([
    prisma.inquiry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: {
        assignedUser: { select: { id: true, name: true, role: true, isActive: true } },
        creator: { select: { id: true, name: true, role: true } },
      },
    }),
    prisma.inquiry.count({ where }),
  ]);

  res.json(paginatedResponse(items, total, page, pageSize));
});

// PATCH /contacts/:id — rename. Anyone who can see at least one of this
// contact's inquiries (within their own scope) may correct the name.
const updateContactSchema = z.object({ name: z.string().min(1) });

const updateContact = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name } = updateContactSchema.parse(req.body);

  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer || customer.deletedAt) return res.status(404).json({ error: 'Contact not found' });

  const scopeWhere = { ...(await inquiryVisibilityWhere(req.user)), deletedAt: null, customerId: id };
  const visibleCount = await prisma.inquiry.count({ where: scopeWhere });
  if (visibleCount === 0) return res.status(404).json({ error: 'Contact not found' });

  const normalizedName = normalize(name);
  if (normalizedName !== customer.normalizedName) {
    const collision = await prisma.customer.findFirst({
      where: { normalizedName, deletedAt: null, id: { not: id } },
    });
    if (collision) {
      return res.status(409).json({ error: `A contact named "${collision.name}" already exists` });
    }
  }

  const updated = await prisma.customer.update({
    where: { id },
    data: { name: name.trim(), normalizedName },
  });

  await logActivity({
    actorId: req.user.id,
    action: 'contact_updated',
    targetType: 'contact',
    targetId: updated.id,
    metadata: { name: updated.name },
  });

  res.json({ contact: updated });
});

// DELETE /contacts/:id — soft delete. Restricted to leader/manager/admin:
// a contact is shared across whoever has logged inquiries for them, so a
// single sales employee shouldn't be able to remove a record others rely
// on. (This mirrors the spirit of the inquiry-delete permission tiers —
// flagged as a judgment call, not an explicit spec requirement.)
const deleteContact = asyncHandler(async (req, res) => {
  if (req.user.role === 'sales') {
    return res.status(403).json({ error: 'Only leaders, managers, or admins can delete a contact' });
  }

  const { id } = req.params;
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer || customer.deletedAt) return res.status(404).json({ error: 'Contact not found' });

  const scopeWhere = { ...(await inquiryVisibilityWhere(req.user)), deletedAt: null, customerId: id };
  const visibleCount = await prisma.inquiry.count({ where: scopeWhere });
  if (visibleCount === 0) return res.status(404).json({ error: 'Contact not found' });

  const updated = await prisma.customer.update({ where: { id }, data: { deletedAt: new Date() } });

  await logActivity({
    actorId: req.user.id,
    action: 'contact_deleted',
    targetType: 'contact',
    targetId: updated.id,
    metadata: { name: updated.name },
  });

  res.json({ message: 'Contact deleted' });
});

module.exports = { listContacts, getContact, listContactInquiries, updateContact, deleteContact };
