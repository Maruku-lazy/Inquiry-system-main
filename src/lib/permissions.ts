import type { Inquiry, User } from '../types';

// Mirrors backend/src/utils/visibility.js canDeleteInquiry(). For
// leader/sales, any inquiry that shows up in their (already scoped) list
// is one they're allowed to delete — the only extra restriction is for
// managers, who can SEE every inquiry but should only delete/restore ones
// assigned to a leader or sales employee, not another manager's or an
// admin's.
export function canDeleteInquiry(user: User, inquiry: Inquiry): boolean {
  if (user.role === 'admin') return true;
  if (user.role === 'manager') {
    return inquiry.assignedUser?.role === 'leader' || inquiry.assignedUser?.role === 'sales';
  }
  return true;
}
