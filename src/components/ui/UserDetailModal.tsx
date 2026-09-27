import { useMemo } from 'react';
import type { User, InquiryStats } from '../../types';
import { RoleBadge } from './RoleBadge';
import { formatDate, formatDateTime } from '../../lib/format';
import { getAllDescendantSales, getDirectReports } from '../../lib/hierarchy';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { backdropClickHandler } from './modalBackdrop';

interface UserDetailModalProps {
  open: boolean;
  onClose: () => void;
  user: User | null;
  allUsers: User[];
  stats: InquiryStats;
  // When true, hides admin-only actions (edit, deactivate, assign) — used
  // by the read-only User Information view. User Management passes these
  // handlers to enable them.
  readOnly?: boolean;
  onEdit?: () => void;
  onToggleActive?: () => void;
  onAssign?: () => void; // "Assign Marketing" / "Assign Leaders"
}

function initialsOf(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('');
}

export function UserDetailModal({
  open,
  onClose,
  user,
  allUsers,
  stats,
  readOnly = false,
  onEdit,
  onToggleActive,
  onAssign,
}: UserDetailModalProps) {
  const reports = useMemo(() => (user ? getDirectReports(allUsers, user) : []), [allUsers, user]);
  const allSales = useMemo(
    () => (user ? getAllDescendantSales(allUsers, user) : []),
    [allUsers, user],
  );

  useEscapeKey(onClose, open);
  if (!open || !user) return null;

  const isManager = user.role === 'manager';
  const isLeader = user.role === 'leader';
  const assignLabel = isManager ? 'Assign Leaders' : 'Assign Marketing';

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 backdrop-blur-xs px-4 animate-fade-in"
      onClick={backdropClickHandler(onClose)}
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl animate-modal-enter dark:bg-slate-900 dark:border dark:border-white/10">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-brand-100 text-lg font-bold text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
              {initialsOf(user.name)}
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{user.name}</h2>
              <div className="mt-1 flex items-center gap-2">
                <RoleBadge role={user.role} compact />
                <span
                  className={`text-xs font-semibold ${user.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}
                >
                  {user.isActive ? 'Active' : 'Deactivated'}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 active:scale-95 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60 dark:border dark:border-white/5">
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Email</dt>
            <dd className="mt-0.5 truncate text-sm text-slate-800 dark:text-slate-200">{user.email}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Account created
            </dt>
            <dd className="mt-0.5 text-sm text-slate-800 dark:text-slate-200">{formatDate(user.createdAt)}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Last login
            </dt>
            <dd className="mt-0.5 font-mono-tabular text-sm text-slate-800 dark:text-slate-200">
              {formatDateTime(user.lastLoginAt)}
            </dd>
          </div>
        </dl>

        {/* Inquiry stats */}
        <div className="mt-5">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Inquiries
          </h3>
          <div className="grid grid-cols-4 gap-2">
            <div className="rounded-lg bg-slate-50 p-3 text-center dark:bg-slate-800/80 dark:border dark:border-white/5">
              <div className="font-mono-tabular text-lg font-bold text-slate-900 dark:text-white">{stats.total}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Total</div>
            </div>
            <div className="rounded-lg bg-sky-50 p-3 text-center dark:bg-sky-950/40 dark:border dark:border-sky-800/30">
              <div className="font-mono-tabular text-lg font-bold text-sky-700 dark:text-sky-300">{stats.new}</div>
              <div className="text-[11px] text-sky-600 dark:text-sky-400">New</div>
            </div>
            <div className="rounded-lg bg-amber-50 p-3 text-center dark:bg-amber-950/40 dark:border dark:border-amber-800/30">
              <div className="font-mono-tabular text-lg font-bold text-amber-700 dark:text-amber-300">{stats.ongoing}</div>
              <div className="text-[11px] text-amber-600 dark:text-amber-400">Ongoing</div>
            </div>
            <div className="rounded-lg bg-emerald-50 p-3 text-center dark:bg-emerald-950/40 dark:border dark:border-emerald-800/30">
              <div className="font-mono-tabular text-lg font-bold text-emerald-700 dark:text-emerald-300">
                {stats.completed}
              </div>
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400">Completed</div>
            </div>
          </div>
        </div>

        {(isManager || isLeader) && (
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {isManager ? `Leaders (${reports.length})` : `Marketing Agents (${reports.length})`}
              </h3>
              {isManager && (
                <span className="text-[11px] font-medium text-slate-400">
                  {allSales.length} agents across team
                </span>
              )}
            </div>
            {reports.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-400">
                No one assigned yet.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                {reports.map((r) => (
                  <li key={r.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span className="font-medium text-slate-800">{r.name}</span>
                    <span
                      className={`text-[11px] font-semibold ${r.isActive ? 'text-emerald-600' : 'text-slate-400'}`}
                    >
                      {r.isActive ? 'Active' : 'Deactivated'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {!readOnly && (
          <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
            {(isManager || isLeader) && onAssign && (
              <button
                type="button"
                onClick={onAssign}
                className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-100"
              >
                {assignLabel}
              </button>
            )}
            {onToggleActive && (
              <button
                type="button"
                onClick={onToggleActive}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-rose-600"
              >
                {user.isActive ? 'Deactivate' : 'Reactivate'}
              </button>
            )}
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
              >
                Edit account
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
