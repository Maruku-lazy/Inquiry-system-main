import { useCallback, useState } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Pagination } from '../../components/ui/Pagination';
import { SearchInput } from '../../components/ui/SearchInput';
import { usePaginatedFetch } from '../../hooks/usePaginatedFetch';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { listActivityLog } from '../../api/logs';
import { ACTIVITY_ACTION_LABELS } from '../../types';
import type { ActivityLogEntry } from '../../types';
import { formatDateTime } from '../../lib/format';

function describeEntry(entry: ActivityLogEntry): string {
  // metadata is a loosely-typed JSON blob from the backend — build a
  // readable sentence from whatever fields are present rather than
  // assuming a fixed shape per action.
  const meta = entry.metadata ?? {};
  switch (entry.action) {
    case 'inquiry_created':
      return `logged an inquiry for "${meta.customerName ?? 'a customer'}"`;
    case 'inquiry_status_changed':
      return `changed the status of "${meta.customerName ?? 'an inquiry'}" from ${meta.from} to ${meta.to}`;
    case 'inquiry_updated':
      return `updated the inquiry for "${meta.customerName ?? 'a customer'}"`;
    case 'inquiry_deleted':
      return `deleted the inquiry for "${meta.customerName ?? 'a customer'}"`;
    case 'inquiry_restored':
      return `restored the inquiry for "${meta.customerName ?? 'a customer'}"`;
    case 'user_created':
      return `created the account for ${meta.name ?? 'a user'}`;
    case 'user_updated':
      return `updated the account for ${meta.name ?? 'a user'}`;
    case 'user_deactivated':
      return `deactivated the account for ${meta.name ?? 'a user'}`;
    case 'user_reactivated':
      return `reactivated the account for ${meta.name ?? 'a user'}`;
    case 'login':
    default:
      return ACTIVITY_ACTION_LABELS[entry.action] ?? 'performed an action';
  }
}

export function ActivityLogPage() {
  const [q, setQ] = useState('');
  const debouncedQ = useDebouncedValue(q);
  const fetchPage = useCallback(
    (page: number, pageSize: number) => listActivityLog({ page, pageSize, q: debouncedQ || undefined }),
    [debouncedQ],
  );
  const { items, total, totalPages, page, pageSize, setPage, setPageSize, isLoading, error } =
    usePaginatedFetch(fetchPage, [debouncedQ]);

  return (
    <DashboardLayout title="Logs — Activity">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900">Activity</h2>
          <p className="mt-1 text-sm text-slate-500">
            Every login, inquiry change, and account change, newest first. Entries older than 30
            days are automatically purged.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>
        )}

        <div className="mb-4">
          <SearchInput value={q} onChange={setQ} placeholder="Search actor name or action…" />
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center text-sm text-slate-400">
            Loading…
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center text-sm text-slate-400">
            No activity recorded yet.
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <ul className="divide-y divide-slate-50">
                {items.map((entry) => (
                  <li key={entry.id} className="flex items-start justify-between gap-4 px-5 py-3.5">
                    <p className="text-sm text-slate-700">
                      <span className="font-semibold text-slate-900">{entry.actor.name}</span>{' '}
                      {describeEntry(entry)}
                    </p>
                    <span className="shrink-0 font-mono-tabular text-xs text-slate-400">
                      {formatDateTime(entry.createdAt)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <Pagination
              page={page}
              pageSize={pageSize}
              total={total}
              totalPages={totalPages}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
