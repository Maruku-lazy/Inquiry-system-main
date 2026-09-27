import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { InquiryTable } from '../../components/ui/InquiryTable';
import { Pagination } from '../../components/ui/Pagination';
import { InquiryFormModal } from '../../components/ui/InquiryFormModal';
import { ExportModal } from '../../components/ui/ExportModal';
import { EMPTY_INQUIRY_FILTERS, InquiryFilterBar, type InquiryFiltersState } from '../../components/ui/InquiryFilterBar';
import { InquiryBulkActionBar, type SelectionPreset } from '../../components/ui/InquiryBulkActionBar';
import { UndoSnackbar, type SnackbarState } from '../../components/ui/UndoSnackbar';
import { useAuth } from '../../hooks/useAuth';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { usePaginatedFetch } from '../../hooks/usePaginatedFetch';
import { useFavorites } from '../../hooks/useFavorites';
import {
  deleteInquiry,
  getAssignableUsers,
  getCompletedYears,
  listCompletedInquiries,
  markInquiryViewed,
  restoreInquiry,
  updateInquiry,
} from '../../api/inquiries';
import type { Inquiry, Priority, User } from '../../types';

export function CompletedInquiriesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isStarred, toggleStar, setStarred } = useFavorites();
  const [view, setView] = useState<'list' | 'hierarchy'>('list');
  const [exportOpen, setExportOpen] = useState(false);
  const [years, setYears] = useState<{ year: number; total: number }[]>([]);
  const [yearsLoading, setYearsLoading] = useState(false);
  const [yearsError, setYearsError] = useState<string | null>(null);
  const [editingInquiry, setEditingInquiry] = useState<Inquiry | null>(null);
  const [assignableUsers, setAssignableUsers] = useState<User[]>([]);
  const [filters, setFilters] = useState<InquiryFiltersState>(EMPTY_INQUIRY_FILTERS);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [snackbar, setSnackbar] = useState<SnackbarState | null>(null);
  const debouncedQ = useDebouncedValue(filters.q);

  const fetchPage = useCallback(
    (page: number, pageSize: number) =>
      listCompletedInquiries({
        page,
        pageSize,
        q: debouncedQ || undefined,
        type: filters.type || undefined,
        priority: filters.priority || undefined,
        postedYear: filters.postedYear ? Number(filters.postedYear) : undefined,
        postedMonth: filters.postedMonth ? Number(filters.postedMonth) : undefined,
      }),
    [debouncedQ, filters.type, filters.priority, filters.postedYear, filters.postedMonth],
  );
  const { items, total, totalPages, page, pageSize, setPage, setPageSize, isLoading, isRefreshing, error, reload, patchItem } =
    usePaginatedFetch(fetchPage, [debouncedQ, filters.type, filters.priority, filters.postedYear, filters.postedMonth]);

  const isSales = user?.role === 'sales';

  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, pageSize, debouncedQ, filters.type, filters.priority, filters.postedYear, filters.postedMonth]);

  useEffect(() => {
    if (view !== 'hierarchy') return;
    setYearsLoading(true);
    setYearsError(null);
    getCompletedYears()
      .then(({ years: data }) => setYears(data))
      .catch(() => setYearsError('Could not load years. Try refreshing the page.'))
      .finally(() => setYearsLoading(false));
  }, [view]);

  useEffect(() => {
    if (isSales) return;
    getAssignableUsers()
      .then(({ users }) => setAssignableUsers(users as User[]))
      .catch(() => setAssignableUsers([]));
  }, [isSales]);

  async function handleSubmit(values: Parameters<typeof updateInquiry>[1]) {
    if (!editingInquiry) return;
    await updateInquiry(editingInquiry.id, values);
    reload();
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

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleBulkMarkAsRead = async () => {
    const unreadToMark = items.filter((i) => selectedIds.has(i.id) && i.isUnseen);
    if (unreadToMark.length === 0) return;
    unreadToMark.forEach((i) => patchItem(i.id, { id: i.id, isUnseen: false }));
    await Promise.allSettled(unreadToMark.map((i) => markInquiryViewed(i.id)));
    reload();
  };

  const handleBulkMarkAsUnread = () => {
    items.filter((i) => selectedIds.has(i.id)).forEach((i) => patchItem(i.id, { id: i.id, isUnseen: true }));
    setSnackbar({
      id: String(Date.now()),
      message: `${selectedIds.size} inquiries marked as unread.`,
    });
  };

  const handleBulkReopenToActive = async () => {
    const selectedItems = items.filter((i) => selectedIds.has(i.id));
    if (selectedItems.length === 0) return;
    selectedItems.forEach((i) => patchItem(i.id, { id: i.id, status: 'ongoing' }));
    setSelectedIds(new Set());

    await Promise.allSettled(selectedItems.map((i) => updateInquiry(i.id, { status: 'ongoing' })));
    reload();

    setSnackbar({
      id: String(Date.now()),
      message: `${selectedItems.length} inquiries reopened to Active.`,
      onUndo: async () => {
        await Promise.allSettled(selectedItems.map((i) => updateInquiry(i.id, { status: 'completed' })));
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
      message: `Priority updated for ${selectedItems.length} inquiries.`,
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
      message: star ? `${ids.length} inquiries starred.` : `${ids.length} inquiries unstarred.`,
      onUndo: () => {
        setStarred(ids, !star);
      },
    });
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!window.confirm(`Delete the ${ids.length} selected completed inquiries? You can restore them later from Deleted.`)) {
      return;
    }
    setSelectedIds(new Set());
    await Promise.allSettled(ids.map((id) => deleteInquiry(id)));
    reload();

    setSnackbar({
      id: String(Date.now()),
      message: `${ids.length} inquiries moved to Trash.`,
      onUndo: async () => {
        await Promise.allSettled(ids.map((id) => restoreInquiry(id)));
        reload();
      },
    });
  };

  async function handleDelete(inquiry: Inquiry) {
    if (!window.confirm(`Move the inquiry for "${inquiry.customerName}" to Trash?`)) return;
    await deleteInquiry(inquiry.id);
    setEditingInquiry(null);
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
    <DashboardLayout title="Inquiries — Completed">
      <div className="mx-auto max-w-6xl animate-slide-up">
        {/* Top Utility Bar */}
        <InquiryBulkActionBar
          totalVisible={items.length}
          selectedCount={selectedIds.size}
          onToggleSelectAll={handleToggleSelectAll}
          onSelectPreset={handleSelectPreset}
          onClearSelection={handleClearSelection}
          onRefresh={reload}
          isRefreshing={isRefreshing}
          onSetPriority={handleBulkSetPriority}
          onMarkAsRead={handleBulkMarkAsRead}
          onMarkAsUnread={handleBulkMarkAsUnread}
          onMarkAsComplete={handleBulkReopenToActive}
          completeActionLabel="Reopen to Active"
          onToggleFavorite={handleBulkToggleFavorite}
          onDelete={handleBulkDelete}
          deleteActionLabel="Move to Trash"
          canDelete={user?.role === 'admin' || user?.role === 'manager' || user?.role === 'leader'}
        >
          <button
            type="button"
            onClick={() => setExportOpen(true)}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 shadow-xs transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-95 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200"
          >
            Export
          </button>
          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setView('list')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                view === 'list'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              List view
            </button>
            <button
              type="button"
              onClick={() => setView('hierarchy')}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                view === 'hierarchy'
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              Hierarchical view
            </button>
          </div>
        </InquiryBulkActionBar>

        {view === 'list' ? (
          <>
            {error && (
              <div className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-950/30 dark:text-rose-400">{error}</div>
            )}
            <InquiryFilterBar value={filters} onChange={setFilters} canSearchAssignee={!isSales} />

            {isLoading ? (
              <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center text-sm text-slate-400 dark:border-white/10 dark:bg-slate-900">
                Loading…
              </div>
            ) : (
              <>
                <InquiryTable
                  inquiries={items}
                  showAssignee={!isSales}
                  emptyMessage="No completed inquiries yet."
                  enableSelection
                  selectedIds={selectedIds}
                  onToggleSelect={handleToggleSelect}
                  isStarred={isStarred}
                  onToggleStar={toggleStar}
                  onSelect={setEditingInquiry}
                />
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
          </>
        ) : (
          <>
            {yearsError && (
              <div className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-950/30 dark:text-rose-400">{yearsError}</div>
            )}
            {yearsLoading ? (
              <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center text-sm text-slate-400 dark:border-white/10 dark:bg-slate-900">
                Loading archive…
              </div>
            ) : years.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center text-sm text-slate-400 dark:border-white/10 dark:bg-slate-900">
                No archived inquiries found.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {years.map((y) => (
                  <button
                    key={y.year}
                    type="button"
                    onClick={() => navigate(`/inquiries/completed/${y.year}`)}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-xs transition hover:border-brand-500 hover:shadow-md dark:border-white/10 dark:bg-slate-900 dark:hover:border-brand-500"
                  >
                    <div>
                      <p className="text-lg font-bold text-slate-900 dark:text-white">{y.year}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {y.total} {y.total === 1 ? 'inquiry' : 'inquiries'}
                      </p>
                    </div>
                    <span className="text-brand-600 dark:text-brand-400">→</span>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <InquiryFormModal
        open={Boolean(editingInquiry)}
        onClose={() => setEditingInquiry(null)}
        onSubmit={handleSubmit}
        inquiry={editingInquiry}
        assignableUsers={assignableUsers}
        onDelete={handleDelete}
      />

      <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} tab="completed" />

      {/* Floating Undo Snackbar */}
      <UndoSnackbar snackbar={snackbar} onDismiss={() => setSnackbar(null)} />
    </DashboardLayout>
  );
}
