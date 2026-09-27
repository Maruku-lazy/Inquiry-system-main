import { ApiError, getToken, request } from './client';
import type {
  Inquiry,
  InquiryStats,
  InquirySource,
  InquiryType,
  PaginatedResponse,
  PreferredTransaction,
  Priority,
  UserInquiryStats,
} from '../types';

export interface ListParams {
  page?: number;
  pageSize?: number;
  date_from?: string;
  date_to?: string;
  /** Matches Inquiry ID, Customer Name, and (Leader/Manager/Admin only) the assigned rep's name. */
  q?: string;
  type?: InquiryType;
  priority?: Priority;
  /** Filters on Date Posted (createdAt) — distinct from the Completed tab's own year/month drill-down on completedAt. */
  postedYear?: number;
  postedMonth?: number;
}

function toQueryParams(params: Record<string, string | number | undefined>) {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) out[k] = String(v);
  }
  return out;
}

export function listActiveInquiries(params: ListParams = {}): Promise<PaginatedResponse<Inquiry>> {
  return request('/inquiries/active', { params: toQueryParams({ ...params }) });
}

export interface CompletedListParams extends ListParams {
  year?: number;
  month?: number;
}

export function listCompletedInquiries(
  params: CompletedListParams = {},
): Promise<PaginatedResponse<Inquiry>> {
  return request('/inquiries/completed', { params: toQueryParams({ ...params }) });
}

export function listDeletedInquiries(params: ListParams = {}): Promise<PaginatedResponse<Inquiry>> {
  return request('/inquiries/deleted', { params: toQueryParams({ ...params }) });
}

// Active inquiries re-sorted as a work queue — effectively-critical first
// (real priority=critical OR gone stale), then the rest by priority.
export function listTasks(params: ListParams = {}): Promise<PaginatedResponse<Inquiry>> {
  return request('/inquiries/tasks', { params: toQueryParams({ ...params }) });
}

export function getCompletedYears(): Promise<{ years: { year: number; total: number }[] }> {
  return request('/inquiries/completed/years');
}

export function getCompletedMonths(
  year: number,
): Promise<{ year: number; months: { month: number; total: number }[] }> {
  return request(`/inquiries/completed/years/${year}/months`);
}

export function getInquiryStats(): Promise<InquiryStats> {
  return request('/inquiries/stats');
}

export function getInquiryStatsByUser(): Promise<{ stats: UserInquiryStats[] }> {
  return request('/inquiries/stats/by-user');
}

// Who the caller may assign an inquiry to — scoped server-side (leader's
// own team, or everyone for manager/admin). Empty for sales employees.
export function getAssignableUsers(): Promise<{ users: { id: string; name: string; role: string }[] }> {
  return request('/inquiries/assignable-users');
}

export interface CreateInquiryInput {
  customerName: string;
  customerContact: string;
  details: string;
  assignedTo?: string;
  inquiryType: InquiryType;
  priority: Priority;
  unit?: string;
  source?: InquirySource;
  preferredTransaction?: PreferredTransaction;
  lastContactAt?: string | null;
  reminderAt?: string | null;
}

export function createInquiry(input: CreateInquiryInput): Promise<{ inquiry: Inquiry }> {
  return request('/inquiries', { method: 'POST', body: input });
}

export interface UpdateInquiryInput {
  status?: Inquiry['status'];
  details?: string;
  customerName?: string;
  customerContact?: string;
  assignedTo?: string;
  inquiryType?: InquiryType;
  priority?: Priority;
  unit?: string;
  source?: InquirySource;
  preferredTransaction?: PreferredTransaction;
  lastContactAt?: string | null;
  reminderAt?: string | null;
}

export function updateInquiry(id: string, input: UpdateInquiryInput): Promise<{ inquiry: Inquiry }> {
  return request(`/inquiries/${id}`, { method: 'PATCH', body: input });
}

export function deleteInquiry(id: string): Promise<{ inquiry: Inquiry; message: string }> {
  return request(`/inquiries/${id}`, { method: 'DELETE' });
}

// Only valid on an already soft-deleted inquiry. No undo — the row is
// actually removed from the database.
export function permanentlyDeleteInquiry(id: string): Promise<{ message: string }> {
  return request(`/inquiries/${id}/permanent`, { method: 'DELETE' });
}

export function restoreInquiry(id: string): Promise<{ inquiry: Inquiry; message: string }> {
  return request(`/inquiries/${id}/restore`, { method: 'POST' });
}

// Call whenever a user opens an inquiry's detail. Clears their unseen dot
// for it, and — only if they're the assignee and it's still 'new' —
// auto-promotes it to 'ongoing' server-side.
export function markInquiryViewed(id: string): Promise<{ inquiry: Inquiry }> {
  return request(`/inquiries/${id}/view`, { method: 'POST' });
}

// Powers the sidebar/dashboard red dots — does the current user have any
// unseen item (newly assigned, or newly gone stale) in their scope?
export function getUnseenSummary(): Promise<{ hasUnseen: boolean }> {
  return request('/inquiries/unseen-summary');
}

export type NotificationReason = 'new' | 'follow_up';

export interface NotificationItem {
  id: string;
  shortId: string;
  customerName: string;
  reason: NotificationReason;
  triggerAt: string;
}

// Powers the Topbar notification bell — the same unseen items as
// getUnseenSummary, but the actual list, each tagged 'new' (freshly
// assigned) or 'follow_up' (just went stale, per the FOLLOW UP NOW! flag
// used elsewhere — always flips at a day's 00:00 boundary).
export function getNotifications(): Promise<{ items: NotificationItem[] }> {
  return request('/inquiries/notifications');
}

export type LoginAlertReason = 'overdue' | 'critical' | 'follow_up';

export interface LoginAlertItem {
  id: string;
  shortId: string;
  customerName: string;
  reasons: LoginAlertReason[];
}

// Phase 3 — called once right after a FRESH login (never on silent
// session-restore) to power the desktop Notification popup. 'overdue' only
// ever appears for Marketing/Sales agents; 'critical'/'follow_up' can
// appear for any role's assigned inquiries. See
// backend/src/utils/notificationReasons.js.
export function getLoginAlerts(): Promise<{ items: LoginAlertItem[] }> {
  return request('/inquiries/login-alerts');
}

export interface NewlyAssignedItem {
  id: string;
  shortId: string;
  customerName: string;
  assignedAt: string;
  priority: Priority | null;
  inquiryType: InquiryType | null;
}

// Powers the 60-second desktop-notification poll while the app stays
// open. Unconditional on priority/staleness (unlike getLoginAlerts) — a
// brand new inquiry has neither yet. `since` is an ISO timestamp; only
// inquiries assigned to this person after that instant come back.
export function getNewlyAssigned(since: string): Promise<{ items: NewlyAssignedItem[] }> {
  return request(`/inquiries/newly-assigned?since=${encodeURIComponent(since)}`);
}

// -- Export (Excel / PDF / Word) -------------------------------------------

export type ExportFormat = 'xlsx' | 'pdf' | 'docx';
export type ExportTab = 'active' | 'completed' | 'deleted';

// Optional cascading scope: year alone -> that whole year; +month -> that
// month only; +weekFrom/weekTo -> specific day-of-month week block(s)
// within that month (1-7, 8-14, 15-21, 22-28, 29-end of month — NOT
// Mon-Sun calendar weeks). Omit everything for the full, unfiltered
// record set.
export interface ExportScope {
  year?: number;
  month?: number;
  weekFrom?: number;
  weekTo?: number;
}

const EXPORT_CONTENT_TYPES: Record<ExportFormat, string> = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

// Downloads are a binary file, not JSON — this bypasses the shared
// request() helper (which always parses a JSON body) and triggers a
// normal browser save using the filename the server sent back.
export async function exportInquiries(
  tab: ExportTab,
  format: ExportFormat,
  scope: ExportScope = {},
): Promise<void> {
  const params = new URLSearchParams({ tab, format });
  if (scope.year) params.set('year', String(scope.year));
  if (scope.month) params.set('month', String(scope.month));
  if (scope.weekFrom) params.set('weekFrom', String(scope.weekFrom));
  if (scope.weekTo) params.set('weekTo', String(scope.weekTo));

  const API_BASE = import.meta.env.VITE_API_URL || '/api';
  const token = getToken();

  const res = await fetch(`${API_BASE}/inquiries/export?${params.toString()}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body ?? { error: 'Export failed' });
  }

  // Guard against ever downloading a file that isn't actually what it
  // claims to be (e.g. a proxy or error path returning an HTML/JSON body
  // with a 200 status) — this is what used to cause exports that
  // "download fine" but a PDF/Office viewer then refuses to open.
  const responseContentType = res.headers.get('content-type') ?? '';
  if (!responseContentType.startsWith(EXPORT_CONTENT_TYPES[format])) {
    throw new ApiError(res.status, {
      error: `The server didn't return a valid .${format} file (got "${responseContentType}"). Please try again, and check the server logs if it keeps happening.`,
    });
  }

  const blob = await res.blob();
  const disposition = res.headers.get('content-disposition') ?? '';
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match ? match[1] : `export.${format}`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// -- Analytics (Phase 3, built by a teammate) -------------------------------

export type AnalyticsRole = 'all' | 'admin' | 'manager' | 'leader' | 'sales';

export interface AnalyticsMonthly {
  month: number;
  label: string;
  new: number;
  ongoing: number;
  completed: number;
  total: number;
}

export interface AnalyticsSource {
  source: string;
  label: string;
  total: number;
}

export interface AnalyticsWeekly {
  week: string;
  total: number;
  resolved: number;
}

export interface AnalyticsLeaderCard {
  detail: {
    id: string;
    name: string;
    teamName: string;
    avatarInitials: string;
    specialistsCount: number;
    monthLabel: string;
    year: number;
    members: {
      id: string;
      name: string;
      avatarInitials: string;
      total: number;
      new: number;
      inProgress: number;
      pending: number;
      resolved: number;
      rate: number;
    }[];
    statusDistribution: {
      id: string;
      label: string;
      count: number;
      color: string;
    }[];
  };
  total: number;
  new: number;
  active: number;
  pending: number;
  done: number;
  resRate: string;
  rateNum: number;
}

export interface AnalyticsSpecialist {
  id: string;
  name: string;
  avatarInitials: string;
  total: number;
  new: number;
  inProgress: number;
  pending: number;
  resolved: number;
  rate: number;
  team: string;
  leader: string;
}

export interface AnalyticsResponse {
  year: number;
  month: number | null;
  role: AnalyticsRole;
  summary: {
    total: number;
    new: number;
    ongoing: number;
    completed: number;
    pending: number;
    completionRate: number;
  };
  monthly: AnalyticsMonthly[];
  sources: AnalyticsSource[];
  weekly?: AnalyticsWeekly[];
  criticalCount?: number;
  pipeline?: string;
  leaders?: AnalyticsLeaderCard[];
  specialists?: AnalyticsSpecialist[];
}

export function getAnalytics(year: number, month?: number, role: AnalyticsRole = 'all'): Promise<AnalyticsResponse> {
  return request('/inquiries/analytics', { params: toQueryParams({ year, month, role }) });
}

// Exports exactly what's currently on screen — same year/month/role the
// Analytics page is already filtered to, no separate scope picker needed
// (unlike exportInquiries, which has its own Year/Month/Week modal).
export async function exportAnalytics(
  year: number,
  month: number | undefined,
  role: AnalyticsRole,
  format: ExportFormat,
): Promise<void> {
  const params = new URLSearchParams({ format, year: String(year), role });
  if (month) params.set('month', String(month));

  const API_BASE = import.meta.env.VITE_API_URL || '/api';
  const token = getToken();

  const res = await fetch(`${API_BASE}/inquiries/analytics/export?${params.toString()}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(res.status, body ?? { error: 'Export failed' });
  }

  const responseContentType = res.headers.get('content-type') ?? '';
  if (!responseContentType.startsWith(EXPORT_CONTENT_TYPES[format])) {
    throw new ApiError(res.status, {
      error: `The server didn't return a valid .${format} file (got "${responseContentType}").`,
    });
  }

  const blob = await res.blob();
  const disposition = res.headers.get('content-disposition') ?? '';
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match ? match[1] : `analytics.${format}`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
