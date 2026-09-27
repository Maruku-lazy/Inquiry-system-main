import { useCallback, useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Pagination } from '../components/ui/Pagination';
import { InquiryFormModal } from '../components/ui/InquiryFormModal';
import { SearchInput } from '../components/ui/SearchInput';
import { InquiryBulkActionBar, type SelectionPreset } from '../components/ui/InquiryBulkActionBar';
import { UndoSnackbar, type SnackbarState } from '../components/ui/UndoSnackbar';
import { useAuth } from '../hooks/useAuth';
import { usePaginatedFetch } from '../hooks/usePaginatedFetch';
import { useUnseen } from '../hooks/useUnseen';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useFavorites } from '../hooks/useFavorites';
import { listTasks, markInquiryViewed, updateInquiry, getAssignableUsers, deleteInquiry, restoreInquiry } from '../api/inquiries';
import type { Inquiry, Priority, User } from '../types';
import { PRIORITY_COLORS, PRIORITY_LABELS } from '../types';
import { formatRelativeTime, shortId } from '../lib/format';

export function TasksPage() {
  const { user } = useAuth();
  const { refresh: refreshUnseen } = useUnseen();
  const { isStarred, toggleStar, setStarred } = useFavorites();
  const [openInquiry, setOpenInquiry] = useState<Inquiry | null>(null);
  const [assignableUsers, setAssignableUsers] = useState<User[]>([]);
  const [q, setQ] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [snackbar, setSnackbar] = useState<SnackbarState | null>(null);
  const debouncedQ = useDebouncedValue(q);

  const fetchPage = useCallback(
    (page: number, pageSize: number) => listTasks({ page, pageSize, q: debouncedQ || undefined }),
    [debouncedQ],
  );
  const { items, total, totalPages, page, pageSize, setPage, setPageSize, isLoading, isRefreshing, error, reload, patchItem } =
    usePaginatedFetch(fetchPage, [debouncedQ]);

  const isSales = user?.role === 'sales';

  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, pageSize, debouncedQ]);

  useEffect(() => {
    getAssignableUsers()
      .then(({ users }) => setAssignableUsers(users as User[]))
      .catch(() => setAssignableUsers([]));
  }, []);

  function handleOpen(inquiry: Inquiry) {
    setOpenInquiry(inquiry);
    patchItem(inquiry.id, { id: inquiry.id, isUnseen: false });
    markInquiryViewed(inquiry.id)
      .then(() => {
        refreshUnseen();
      })
      .catch(() => {
        /* non-critical */
      });
  }

  async function handleSubmit(values: Parameters<typeof updateInquiry>[1]) {
    if (!openInquiry) return;
    try {
      const res = await updateInquiry(openInquiry.id, values);
      if (res?.inquiry) {
        patchItem(openInquiry.id, res.inquiry);
      } else {
        reload();
      }
    } catch {
      reload();
    }
  }

  // --- Selection & Bulk Actions ---
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)));
    }
  };

  const handleSelectPreset = (preset: SelectionPreset) => {
    switch (preset) {
      case 'all':
        setSelectedIds(new Set(items.map((i) => i.id)));
        break;
      case 'none':
        setSelectedIds(new Set());
        break;
      case 'read':
        setSelectedIds(new Set(items.filter((i) => !i.isUnseen).map((i) => i.id)));
        break;
      case 'unread':
        setSelectedIds(new Set(items.filter((i) => i.isUnseen).map((i) => i.id)));
        break;
      case 'starred':
        setSelectedIds(new Set(items.filter((i) => isStarred(i.id)).map((i) => i.id)));
        break;
      case 'unstarred':
        setSelectedIds(new Set(items.filter((i) => !isStarred(i.id)).map((i) => i.id)));
        break;
    }
  };

  const handleBulkMarkAsComplete = async () => {
    const selectedItems = items.filter((i) => selectedIds.has(i.id));
    if (selectedItems.length === 0) return;
    selectedItems.forEach((i) => patchItem(i.id, { id: i.id, status: 'completed' }));
    setSelectedIds(new Set());

    await Promise.allSettled(selectedItems.map((i) => updateInquiry(i.id, { status: 'completed' })));
    reload();

    setSnackbar({
      id: String(Date.now()),
      message: `${selectedItems.length} tasks marked as completed.`,
      onUndo: async () => {
        await Promise.allSettled(selectedItems.map((i) => updateInquiry(i.id, { status: 'ongoing' })));
        reload();
      },
    });
  };

  const handleBulkSetPriority = async (priority: Priority) => {
    const selectedItems = items.filter((i) => selectedIds.has(i.id));
    if (selectedItems.length === 0) return;
    const previousPriorities = new Map(selectedItems.map((i) => [i.id, i.priority]));

    selectedItems.forEach((i) => patchItem(i.id, { id: i.id, priority }));
    await Promise.allSettled(selectedItems.map((i) => updateInquiry(i.id, { priority })));
    reload();

    setSnackbar({
      id: String(Date.now()),
      message: `Priority updated for ${selectedItems.length} tasks.`,
      onUndo: async () => {
        await Promise.allSettled(
          Array.from(previousPriorities.entries()).map(([id, prevPriority]) =>
            updateInquiry(id, { priority: prevPriority || undefined }),
          ),
        );
        reload();
      },
    });
  };

  const handleBulkToggleFavorite = (star: boolean) => {
    const ids = Array.from(selectedIds);
    setStarred(ids, star);
    setSnackbar({
      id: String(Date.now()),
      message: star ? `${ids.length} tasks starred.` : `${ids.length} tasks unstarred.`,
      onUndo: () => {
        setStarred(ids, !star);
      },
    });
  };

  // Sort tasks with pinned favorites on top
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const aStarred = isStarred(a.id);
      const bStarred = isStarred(b.id);
      if (aStarred && !bStarred) return -1;
      if (!aStarred && bStarred) return 1;
      return 0;
    });
  }, [items, isStarred]);

  async function handleDelete(inquiry: Inquiry) {
    if (!window.confirm(`Move the inquiry for "${inquiry.customerName}" to Trash?`)) return;
    await deleteInquiry(inquiry.id);
    setOpenInquiry(null);
    reload();

    setSnackbar({
      id: String(Date.now()),
      message: `Inquiry "${inquiry.customerName}" moved to Trash.`,
      onUndo: async () => {
        await restoreInquiry(inquiry.id);
        reload();
      },
    });
  }

  return (
    <DashboardLayout title="Tasks">
      <div className="mx-auto max-w-5xl animate-slide-up">
        {/* Top Utility Bar */}
        <InquiryBulkActionBar
          totalVisible={items.length}
          selectedCount={selectedIds.size}
          onToggleSelectAll={handleToggleSelectAll}
          onSelectPreset={handleSelectPreset}
          onClearSelection={() => setSelectedIds(new Set())}
          onRefresh={reload}
          isRefreshing={isRefreshing}
          onSetPriority={handleBulkSetPriority}
          onMarkAsComplete={handleBulkMarkAsComplete}
          completeActionLabel="Mark Complete"
          onToggleFavorite={handleBulkToggleFavorite}
          canDelete={false}
        />

        {error && (
          <div className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-950/30 dark:text-rose-400">{error}</div>
        )}

        <div className="mb-4">
          <SearchInput
            value={q}
            onChange={setQ}
            placeholder={isSales ? 'Search ID or customer name…' : 'Search ID, customer, or assigned rep…'}
          />
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center text-sm text-slate-400 dark:border-white/10 dark:bg-slate-900">
            Loading…
          </div>
        ) : sortedItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center text-sm text-slate-400 dark:border-white/10 dark:bg-slate-900">
            Nothing on your plate right now.
          </div>
        ) : (
          <>
            <ul className="space-y-2.5">
              {sortedItems.map((inquiry) => {
                const priority = (inquiry.effectivePriority ?? inquiry.priority) as Priority | null;
                const style = priority ? PRIORITY_COLORS[priority] : null;
                const isSelected = selectedIds.has(inquiry.id);
                const starred = isStarred(inquiry.id);

                return (
                  <li key={inquiry.id}>
                    <div
                      onClick={() => handleOpen(inquiry)}
                      className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-brand-500 bg-brand-50/40 ring-1 ring-brand-500/20 dark:border-brand-500 dark:bg-brand-950/20'
                          : starred
                          ? 'border-amber-300 bg-amber-50/20 dark:border-amber-800/40 dark:bg-amber-950/10'
                          : 'border-slate-200 bg-white hover:border-brand-300 hover:shadow-md dark:border-white/10 dark:bg-slate-900 dark:hover:border-brand-500/50'
                      }`}
                    >
                      {/* Checkbox and Star */}
                      <div className="flex items-center gap-2 pt-0.5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(inquiry.id)}
                          className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-2 focus:ring-brand-500/20 dark:border-white/20 dark:bg-slate-800 cursor-pointer"
                        />
                        <button
                          type="button"
                          onClick={() => toggleStar(inquiry.id)}
                          className={`p-0.5 rounded transition-colors ${
                            starred
                              ? 'text-amber-500 hover:text-amber-600'
                              : 'text-slate-300 hover:text-slate-400 dark:text-slate-600 dark:hover:text-slate-400'
                          }`}
                          title={starred ? 'Unstar task' : 'Star task (pins to top)'}
                        >
                          <svg viewBox="0 0 24 24" fill={starred ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
                          </svg>
                        </button>
                      </div>

                      {inquiry.isUnseen && (
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" aria-label="Unseen" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono-tabular text-xs font-semibold text-brand-600 dark:text-brand-400">
                            {shortId(inquiry.id)}
                          </span>
                          {starred && (
                            <span className="rounded bg-amber-100 px-1 py-0.2 text-[9px] font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 uppercase tracking-wider">
                              Pinned
                            </span>
                          )}
                          {priority && (
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${style?.bg} ${style?.text}`}>
                              {PRIORITY_LABELS[priority]}
                            </span>
                          )}
                          {!isSales && inquiry.assignedUser && (
                            <span className="text-xs text-slate-400">→ {inquiry.assignedUser.name}</span>
                          )}
                          <span className="ml-auto font-mono-tabular text-xs text-slate-400">
                            {formatRelativeTime(inquiry.updatedAt)}
                          </span>
                        </div>
                        <div className="mt-1 font-medium text-slate-900 dark:text-white">{inquiry.customerName}</div>
                        <div className="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400">{inquiry.details}</div>
                        {inquiry.remarks && (
                          <div className="mt-2 inline-block rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                            {inquiry.remarks}
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
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

      <InquiryFormModal
        open={openInquiry !== null}
        onClose={() => setOpenInquiry(null)}
        onSubmit={handleSubmit}
        inquiry={openInquiry}
        assignableUsers={assignableUsers}
        onDelete={handleDelete}
      />

      {/* Floating Undo Snackbar */}
      <UndoSnackbar snackbar={snackbar} onDismiss={() => setSnackbar(null)} />
    </DashboardLayout>
  );
}
