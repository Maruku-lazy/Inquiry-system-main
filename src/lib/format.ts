import type { InquiryStatus } from '../types';

export function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.round(diffMs / 60000);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  const diffMonth = Math.round(diffDay / 30);
  if (diffMonth < 12) return `${diffMonth}mo ago`;
  const diffYear = Math.round(diffMonth / 12);
  return `${diffYear}y ago`;
}

export function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// Full date + time, used for "last login" and other precise timestamps
// where "3d ago" isn't specific enough.
export function formatDateTime(isoDate: string | null): string {
  if (!isoDate) return 'Never';
  return new Date(isoDate).toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// Short, stable display id derived from the record's UUID — Prisma doesn't
// give us a sequential number, so we take the first 4 hex chars for a
// human-scannable label like "INQ-3F2A". Not used for lookups, display only.
export function shortId(id: string, prefix = 'INQ'): string {
  return `${prefix}-${id.slice(0, 4).toUpperCase()}`;
}

export const STATUS_STYLES: Record<InquiryStatus, { bg: string; text: string; dot: string }> = {
  new: { bg: 'bg-sky-50', text: 'text-sky-700', dot: 'bg-sky-500' },
  ongoing: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  completed: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
};
