import type { LoginAlertItem, NewlyAssignedItem } from '../api/inquiries';
import { PRIORITY_LABELS, INQUIRY_TYPE_LABELS } from '../types';

const REASON_LABEL: Record<LoginAlertItem['reasons'][number], string> = {
  overdue: 'overdue 3+ days',
  critical: 'critical priority',
  follow_up: 'needs follow-up',
};

// Fires a real OS-level desktop notification (the browser's Notification
// API) — this shows even when the tab isn't focused or is in the
// background, per spec. It can NOT show when the browser itself is fully
// closed; that needs Push API + a Service Worker, deliberately out of
// scope here since this app only ever runs on the local Toyota network
// with the browser open.
//
// Browsers only grant permission after the person allows it once (a
// one-time prompt); if they've previously denied it, this silently no-ops
// — there's nothing an app can do to force it back on, only the person
// re-enabling it from their browser's own site settings.
async function fireNotification(title: string, body: string, tagSuffix: string): Promise<void> {
  if (!('Notification' in window)) return;

  let permission = Notification.permission;
  if (permission === 'default') {
    permission = await Notification.requestPermission();
  }
  if (permission !== 'granted') return;

  const notification = new Notification(title, {
    body,
    // The app's actual logo mark (public/favicon.svg — same one used in
    // the Sidebar), so the popup is recognizable as InquireOS at a glance
    // rather than showing a generic blank/default icon.
    icon: '/favicon.svg',
    // A unique tag per call, not a fixed one — a fixed tag makes repeated
    // notifications silently collapse into "already shown" with no new
    // visible popup, since `renotify` defaults to false.
    tag: `inquireos-${tagSuffix}-${Date.now()}`,
    requireInteraction: false,
  });

  notification.onclick = () => {
    window.focus();
    // Notification click handlers run outside React's tree (no access to
    // react-router's navigate()), and can fire while the tab is in the
    // background or even after a full reload cleared React state — a
    // real navigation is the only reliable way to land on the right page
    // from here, not a hash change (this app uses BrowserRouter, not
    // HashRouter, so window.location.hash wouldn't route anywhere).
    window.location.href = '/inquiries/active';
    notification.close();
  };
}

// Called once per LOGIN (never on session-restore/refresh) — the full
// current picture of overdue/critical/follow-up inquiries assigned to
// this person, regardless of whether it's the same as last time.
export async function showLoginAlerts(items: LoginAlertItem[]): Promise<void> {
  if (items.length === 0) return;

  const title =
    items.length === 1
      ? `${items[0].customerName} needs attention`
      : `${items.length} inquiries need attention`;

  const body =
    items.length === 1
      ? items[0].reasons.map((r) => REASON_LABEL[r]).join(', ')
      : summarizeByReason(items);

  await fireNotification(title, body, 'login-alerts');
}

// Called every 60 seconds while the app is open — ONLY for inquiries that
// were newly assigned to this person since the last check (a brand new
// inquiry just came in, or an existing one got reassigned to them).
// Deliberately unconditional on staleness (a fresh inquiry can't be stale
// yet) — but DOES surface priority/type, since those are set at creation
// and are exactly what tells the person whether to drop everything or not.
export async function showNewlyAssignedAlert(items: NewlyAssignedItem[]): Promise<void> {
  if (items.length === 0) return;

  const title = items.length === 1 ? 'New inquiry assigned to you' : `${items.length} new inquiries assigned to you`;
  const body = items.length === 1 ? formatOne(items[0]) : items.slice(0, 5).map(formatOne).join('\n') +
    (items.length > 5 ? `\n+${items.length - 5} more` : '');

  await fireNotification(title, body, 'new-assignment');
}

// "Maria Santos — Critical, New Vehicle" — falls back gracefully since
// priority/type are optional Phase 1/2 fields that can be null.
function formatOne(item: NewlyAssignedItem): string {
  const details = [
    item.priority ? PRIORITY_LABELS[item.priority] : null,
    item.inquiryType ? INQUIRY_TYPE_LABELS[item.inquiryType] : null,
  ]
    .filter(Boolean)
    .join(', ');
  return details ? `${item.customerName} — ${details}` : item.customerName;
}

// One reason per line instead of a single bullet-separated run-on string —
// much easier to scan at a glance in a small OS notification popup,
// especially once counts get into double digits.
function summarizeByReason(items: LoginAlertItem[]): string {
  const counts: Record<LoginAlertItem['reasons'][number], number> = {
    overdue: 0,
    critical: 0,
    follow_up: 0,
  };
  for (const item of items) {
    for (const reason of item.reasons) counts[reason]++;
  }
  return (Object.keys(counts) as (keyof typeof counts)[])
    .filter((r) => counts[r] > 0)
    .map((r) => `${counts[r]} ${REASON_LABEL[r]}`)
    .join('\n');
}
