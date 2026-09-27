import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { StatCard } from '../components/ui/StatCard';
import { InquiryTable } from '../components/ui/InquiryTable';
import { DashboardCalendar } from '../components/ui/DashboardCalendar';
import { useAuth } from '../hooks/useAuth';
import { useUnseen } from '../hooks/useUnseen';
import { getInquiryStats, getInquiryStatsByUser, listActiveInquiries, markInquiryViewed } from '../api/inquiries';
import type { Inquiry, InquiryStats, UserInquiryStats } from '../types';
import { ROLE_LABELS } from '../types';

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

const EMPTY_STATS: InquiryStats = { total: 0, new: 0, ongoing: 0, completed: 0 };

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { hasUnseen, refresh: refreshUnseen } = useUnseen();

  const [stats, setStats] = useState<InquiryStats>(EMPTY_STATS);
  const [byUser, setByUser] = useState<UserInquiryStats[]>([]);
  const [recent, setRecent] = useState<Inquiry[]>([]);
  const [calendarInquiries, setCalendarInquiries] = useState<Inquiry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isSales = user?.role === 'sales';

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    // Three cheap, bounded requests instead of one unbounded list fetch:
    // aggregate totals, aggregate per-user breakdown, and a 5-row page for
    // "Recent" — never pulls the full visible inquiry set into the browser.
    Promise.all([
      getInquiryStats(),
      isSales ? Promise.resolve({ stats: [] }) : getInquiryStatsByUser(),
      listActiveInquiries({ page: 1, pageSize: 50 }),
    ])
      .then(([statsRes, byUserRes, recentRes]) => {
        if (cancelled) return;
        setStats(statsRes);
        setByUser(byUserRes.stats);
        setCalendarInquiries(recentRes.items);
        setRecent(recentRes.items.slice(0, 5));
      })
      .catch(() => {
        if (!cancelled) setError('Could not load dashboard data. Try refreshing the page.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isSales]);

  if (!user) return null;

  // Marks it seen (clearing the dot for this user) and, if this user is
  // the assignee and it's still 'new', auto-promotes it to 'ongoing' —
  // then routes to wherever it actually lives.
  async function handleOpenRecent(inquiry: Inquiry) {
    try {
      await markInquiryViewed(inquiry.id);
    } finally {
      refreshUnseen();
      navigate(inquiry.status === 'completed' ? '/inquiries/completed' : '/inquiries/active');
    }
  }

  return (
    <DashboardLayout title="Home">
      <div className="mx-auto max-w-6xl animate-slide-up">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900 sm:text-2xl dark:text-white">
            {greeting()}, {user.name.split(' ')[0]} 👋
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {ROLE_LABELS[user.role]} ·{' '}
            {new Date().toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-950/30 dark:text-rose-400">{error}</div>
        )}

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <div className="relative">
            {hasUnseen && (
              <span
                className="absolute -right-1 -top-1 z-10 h-3 w-3 rounded-full bg-rose-500 ring-2 ring-white"
                aria-label="Unseen items"
              />
            )}
            <StatCard label="New" value={stats.new} tone="sky" onClick={() => navigate('/inquiries/active')} />
          </div>
          <StatCard label="Ongoing" value={stats.ongoing} tone="amber" onClick={() => navigate('/inquiries/active')} />
          <StatCard label="Completed" value={stats.completed} tone="emerald" onClick={() => navigate('/inquiries/completed')} />
          <StatCard label="Total" value={stats.total} tone="brand" onClick={() => navigate('/inquiries/active')} />
        </div>

        {!isSales && byUser.length > 0 && (
          <div className="mt-8">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Per-Employee Breakdown
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {byUser
                .slice()
                .sort((a, b) => b.total - a.total)
                .map((entry) => (
                  <div key={entry.userId} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-900">
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">
                      {entry.user?.name ?? 'Unknown'}
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="font-mono-tabular text-xl font-bold text-slate-900 dark:text-white">
                        {entry.total}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">assigned</span>
                      {entry.ongoing > 0 && (
                        <span className="ml-auto rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                          {entry.ongoing} ongoing
                        </span>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
        <div className="mt-8">
          <DashboardCalendar inquiries={calendarInquiries} />
        </div>
        
        <div className="mt-8 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Recent Inquiries
          </h3>
          <button
            type="button"
            onClick={() => navigate('/inquiries/active')}
            className="text-sm font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
          >
            View all →
          </button>
        </div>
        <div className="mt-3">
          {isLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center text-sm text-slate-400 dark:border-white/10 dark:bg-slate-900">
              Loading inquiries…
            </div>
          ) : (
            <InquiryTable
              inquiries={recent}
              showAssignee={!isSales}
              showUnseenDots
              onSelect={handleOpenRecent}
            />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
