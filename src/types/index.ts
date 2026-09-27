// Mirrors backend/prisma/schema.prisma enums and shapes exactly.
// If the schema changes, update here first — everything else consumes these.

export type Role = 'admin' | 'manager' | 'leader' | 'sales';

export type InquiryStatus = 'new' | 'ongoing' | 'completed';

export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type InquiryType = 'new_vehicle' | 'parts' | 'repair';
export type InquirySource = 'social' | 'email' | 'phone' | 'physical';
export type PreferredTransaction = 'financing' | 'cash' | 'trade_in' | 'lease' | 'other';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  managerId: string | null;
  leaderId: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface InquiryParticipant {
  id: string;
  name: string;
  role: Role;
  // Present on assignedUser only — lets the UI flag "this person's account
  // is deactivated/deleted, consider reassigning" without a separate call.
  isActive?: boolean;
}

export interface Inquiry {
  id: string;
  customerName: string;
  customerContact: string;
  details: string;
  status: InquiryStatus;
  assignedTo: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  deletedAt: string | null;
  deletedBy: string | null;
  inquiryType: InquiryType | null;
  priority: Priority | null;
  unit: string | null;
  source: InquirySource | null;
  preferredTransaction: PreferredTransaction | null;
  lastContactAt: string | null;
  reminderAt: string | null;
  assignedUser?: InquiryParticipant;
  creator?: InquiryParticipant;
  deletedByUser?: InquiryParticipant;

  // Phase 3 — computed per-request, never stored. Present on Active/Tasks
  // responses; absent (undefined) elsewhere. The real `priority` is never
  // overwritten by staleness — see backend/docs/phase3 spec §2.
  assignedAt?: string;
  isStale?: boolean;
  effectivePriority?: Priority | null;
  remarks?: string | null; // "FOLLOW UP NOW!" when stale, else null
  isUnseen?: boolean; // for the current logged-in user specifically
}

// Simplified shape returned by GET /logs/inquiries — deliberately not the
// full Inquiry record, since that page is a lightweight oversight feed.
export interface InquiryLogEntry {
  id: string;
  customerName: string;
  status: InquiryStatus;
  createdAt: string;
  updatedAt: string;
  assignedUser: InquiryParticipant;
}

export type ActivityAction =
  | 'login'
  | 'inquiry_created'
  | 'inquiry_status_changed'
  | 'inquiry_updated'
  | 'inquiry_deleted'
  | 'inquiry_restored'
  | 'inquiry_permanently_deleted'
  | 'user_created'
  | 'user_updated'
  | 'user_deactivated'
  | 'user_reactivated'
  | 'user_deleted'
  | 'contact_updated'
  | 'contact_deleted';

export interface ActivityLogEntry {
  id: string;
  actorId: string;
  actor: InquiryParticipant;
  action: ActivityAction;
  targetType: 'inquiry' | 'user' | 'contact';
  targetId: string;
  metadata: Record<string, string> | null;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface InquiryStats {
  total: number;
  new: number;
  ongoing: number;
  completed: number;
}

export interface UserInquiryStats extends InquiryStats {
  userId: string;
  user: InquiryParticipant | null;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface ApiErrorBody {
  error: string;
  details?: { path: string; message: string }[];
}

// Display labels — the org's job titles differ slightly from the backend's
// short role codes. Keep that mapping in exactly one place.
export const ROLE_LABELS: Record<Role, string> = {
  admin: 'System Administrator',
  manager: 'Sales Manager',
  leader: 'Sales Marketing Leader',
  sales: 'Sales Marketing Agent',
};

export const STATUS_LABELS: Record<InquiryStatus, string> = {
  new: 'New',
  ongoing: 'Ongoing',
  completed: 'Completed',
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export const PRIORITY_COLORS: Record<Priority, { bg: string; text: string }> = {
  low: { bg: 'bg-slate-100', text: 'text-slate-600' },
  medium: { bg: 'bg-sky-50', text: 'text-sky-700' },
  high: { bg: 'bg-amber-50', text: 'text-amber-700' },
  critical: { bg: 'bg-rose-50', text: 'text-rose-700' },
};

export const INQUIRY_TYPE_LABELS: Record<InquiryType, string> = {
  new_vehicle: 'New Vehicle',
  parts: 'Parts',
  repair: 'Repair',
};

export const SOURCE_LABELS: Record<InquirySource, string> = {
  social: 'Social',
  email: 'Email',
  phone: 'Phone',
  physical: 'Physical',
};

export const PREFERRED_TRANSACTION_LABELS: Record<PreferredTransaction, string> = {
  financing: 'Financing',
  cash: 'Cash',
  trade_in: 'Trade-in',
  lease: 'Lease',
  other: 'Other',
};

export const ACTIVITY_ACTION_LABELS: Record<ActivityAction, string> = {
  login: 'logged in',
  inquiry_created: 'created an inquiry',
  inquiry_status_changed: 'changed inquiry status',
  inquiry_updated: 'updated an inquiry',
  inquiry_deleted: 'deleted an inquiry',
  inquiry_restored: 'restored an inquiry',
  inquiry_permanently_deleted: 'permanently deleted an inquiry',
  user_created: 'created an account',
  user_updated: 'updated an account',
  user_deactivated: 'deactivated an account',
  user_reactivated: 'reactivated an account',
  user_deleted: 'deleted an account',
  contact_updated: 'renamed a contact',
  contact_deleted: 'deleted a contact',
};

// Team Chart — a scoped slice of the hierarchy shaped identically
// regardless of the viewer's role (see GET /organization/chart).
export interface OrgChartSalesRep {
  id: string;
  name: string;
  isSelf: boolean;
}

export interface OrgChartLeader {
  id: string | null;
  name: string;
  isSelf: boolean;
  salesReps: OrgChartSalesRep[];
}

export interface OrgChartManager {
  id: string | null;
  name: string;
  isSelf: boolean;
  leaders: OrgChartLeader[];
}

export interface OrgChart {
  managers: OrgChartManager[];
}

// Contacts — one row per real-world customer, deduplicated case-insensitively.
export interface Contact {
  id: string;
  name: string;
  totalInquiries: number;
  firstInquiryDate: string;
  lastInquiryDate: string;
  firstLoggedBy: InquiryParticipant | null;
}

// Small, distinct color per role — used consistently across User Management
// and User Information so a role is recognizable by color at a glance.
export const ROLE_COLORS: Record<Role, { bg: string; text: string; dot: string }> = {
  admin: { bg: 'bg-violet-50', text: 'text-violet-700', dot: 'bg-violet-500' },
  manager: { bg: 'bg-brand-50', text: 'text-brand-700', dot: 'bg-brand-500' },
  leader: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  sales: { bg: 'bg-teal-50', text: 'text-teal-700', dot: 'bg-teal-500' },
};
