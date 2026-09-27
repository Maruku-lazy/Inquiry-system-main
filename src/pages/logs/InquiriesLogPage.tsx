import { useCallback, useState } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { Pagination } from '../../components/ui/Pagination';
import { SearchInput } from '../../components/ui/SearchInput';
import { usePaginatedFetch } from '../../hooks/usePaginatedFetch';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { listInquiriesLog } from '../../api/logs';
import { formatDateTime, shortId } from '../../lib/format';

export function InquiriesLogPage() {
  const [tab, setTab] = useState<'active' | 'completed'>('active');
  const [q, setQ] = useState('');
  const debouncedQ = useDebouncedValue(q);

  const fetchPage = useCallback(
    (page: number, pageSize: number) =>
      listInquiriesLog({ page, pageSize, view: tab, q: debouncedQ || undefined }),
    [tab, debouncedQ],
  );
  const { items, total, totalPages, page, pageSize, setPage, setPageSize, isLoading, error } =
    usePaginatedFetch(fetchPage, [tab, debouncedQ]);

  return (
    <DashboardLayout title="Logs — Inquiries">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Inquiries — Org-wide feed</h2>
            <p className="mt-1 text-sm text-slate-500">
              A simplified, newest-first view of every inquiry, regardless of who it's assigned to.
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setTab('active')}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                tab === 'active' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => setTab('completed')}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                tab === 'completed' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              Completed
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>
        )}

        <div className="mb-4">
          <SearchInput value={q} onChange={setQ} placeholder="Search customer or assigned rep…" />
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center text-sm text-slate-400">
            Loading…
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center text-sm text-slate-400">
            Nothing here yet.
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <ul className="divide-y divide-slate-50">
                {items.map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between gap-4 px-5 py-3">
                    <div className="min-w-0">
                      <span className="font-mono-tabular text-xs font-semibold text-brand-600">
                        {shortId(entry.id)}
                      </span>{' '}
                      <span className="text-sm text-slate-800">{entry.customerName}</span>
                      <span className="ml-2 text-xs text-slate-400">→ {entry.assignedUser.name}</span>
                    </div>
                    <span className="shrink-0 font-mono-tabular text-xs text-slate-400">
                      {formatDateTime(entry.updatedAt)}
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
