const prisma = require('../config/db');

/**
 * Server-side visibility rules for the 4-tier hierarchy:
 *   admin   -> full access (not part of the sales chain, but Phase 1 lets
 *              admins view inquiries too; they already have full
 *              administrative access)
 *   manager -> all inquiries, across every leader/team
 *   leader  -> inquiries assigned to sales employees under them
 *   sales   -> only their own assigned inquiries
 *
 * This is the ONLY place inquiry visibility should be computed. Every route
 * that touches inquiries must call through here rather than re-implementing
 * the rule — that's how we guarantee the "never rely on frontend filtering"
 * requirement actually holds server-side.
 */

// Returns null to mean "no restriction" (admin/manager), or an array of
// user ids whose inquiries the given user may see/act on.
async function getVisibleUserIds(user) {
  if (user.role === 'admin' || user.role === 'manager') {
    return null;
  }

  if (user.role === 'leader') {
    const reps = await prisma.user.findMany({
      where: { leaderId: user.id },
      select: { id: true },
    });
    // A leader also sees inquiries they personally created/were assigned,
    // in case one is ever assigned directly to them.
    return [user.id, ...reps.map((r) => r.id)];
  }

  // sales
  return [user.id];
}

// Builds a Prisma `where` clause fragment for filtering inquiries by the
// current user's visibility scope. Merge this into any GET /inquiries query.
async function inquiryVisibilityWhere(user) {
  const visibleIds = await getVisibleUserIds(user);
  if (visibleIds === null) return {};
  return { assignedTo: { in: visibleIds } };
}

// Checks whether `user` is allowed to assign/view/edit an inquiry belonging
// to `targetUserId` (the inquiry's assignedTo). Used on create (is the
// requested assignee in scope?) and on update (does this inquiry belong to
// someone the user can see?).
async function isUserIdInScope(user, targetUserId) {
  const visibleIds = await getVisibleUserIds(user);
  if (visibleIds === null) return true;
  return visibleIds.includes(targetUserId);
}

// Delete/restore permission — deliberately narrower than plain visibility.
// A manager can SEE every inquiry org-wide, but per spec should only be
// able to delete/restore ones assigned to a leader or sales employee, not
// another manager's or an admin's. Admins can delete/restore anything.
async function canDeleteInquiry(user, inquiry) {
  if (user.role === 'admin') return true;

  if (user.role === 'manager') {
    const assignee = await prisma.user.findUnique({ where: { id: inquiry.assignedTo } });
    return !!assignee && (assignee.role === 'leader' || assignee.role === 'sales');
  }

  // Leaders and sales employees: same rule as normal visibility scope
  // (own inquiries, or — for leaders — their team's).
  return isUserIdInScope(user, inquiry.assignedTo);
}

module.exports = {
  getVisibleUserIds,
  inquiryVisibilityWhere,
  isUserIdInScope,
  canDeleteInquiry,
};
