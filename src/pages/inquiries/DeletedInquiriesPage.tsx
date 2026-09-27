import { useCallback, useEffect, useState } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { InquiryTable } from '../../components/ui/InquiryTable';
import { Pagination } from '../../components/ui/Pagination';
import { InquiryDetailModal } from '../../components/ui/InquiryDetailModal';
import { ExportModal } from '../../components/ui/ExportModal';
import { EMPTY_INQUIRY_FILTERS, InquiryFilterBar, type InquiryFiltersState } from '../../components/ui/InquiryFilterBar';
import { InquiryBulkActionBar, type SelectionPreset } from '../../components/ui/InquiryBulkActionBar';
import { UndoSnackbar, type SnackbarState } from '../../components/ui/UndoSnackbar';
import { useAuth } from '../../hooks/useAuth';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { usePaginatedFetch } from '../../hooks/usePaginatedFetch';
import { canDeleteInquiry } from '../../lib/permissions';
import { deleteInquiry, listDeletedInquiries, permanentlyDeleteInquiry, restoreInquiry } from '../../api/inquiries';
import type { Inquiry } from '../../types';
import { formatDateTime } from '../../lib/format';

export function DeletedInquiriesPage() {
  const { user } = useAuth();
  const [detailInquiry, setDetailInquiry] = useState<Inquiry | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [filters, setFilters] = useState<InquiryFiltersState>(EMPTY_INQUIRY_FILTERS);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [snackbar, setSnackbar] = useState<SnackbarState | null>(null);
  const debouncedQ = useDebouncedValue(filters.q);

  const fetchPage = useCallback(
    (page: number, pageSize: number) =>
      listDeletedInquiries({
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

  const { items, total, totalPages, page, pageSize, setPage, setPageSize, isLoading, isRefreshing, error, reload } =
    usePaginatedFetch(fetchPage, [debouncedQ, filters.type, filters.priority, filters.postedYear, filters.postedMonth]);

  const isSales = user?.role === 'sales';
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, pageSize, debouncedQ, filters.type, filters.priority, filters.postedYear, filters.postedMonth]);

  async function handleRestore(inquiry: Inquiry) {
    if (!window.confirm(`Restore the inquiry for "${inquiry.customerName}"?`)) return;
    await restoreInquiry(inquiry.id);
    setDetailInquiry(null);
    reload();

    setSnackbar({
      id: String(Date.now()),
      message: `Inquiry "${inquiry.customerName}" restored.`,
      onUndo: async () => {
        await deleteInquiry(inquiry.id);
        reload();
      },
    });
  }

  async function handleDeleteForever(inquiry: Inquiry) {
    if (
      !window.confirm(
        `Permanently delete the inquiry for "${inquiry.customerName}"? This cannot be undone — it will be gone from the database forever.`,
      )
    ) {
      return;
    }
    await permanentlyDeleteInquiry(inquiry.id);
    setDetailInquiry(null);
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
      default:
        setSelectedIds(new Set(items.map((i) => i.id)));
        break;
    }
  };

  const handleBulkRestore = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setSelectedIds(new Set());
    await Promise.allSettled(ids.map((id) => restoreInquiry(id)));
    reload();

    setSnackbar({
      id: String(Date.now()),
      message: `${ids.length} inquiries restored.`,
      onUndo: async () => {
        await Promise.allSettled(ids.map((id) => deleteInquiry(id)));
        reload();
      },
    });
  };

  const handleBulkPermanentDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (
      !window.confirm(
        `Permanently delete ${ids.length} inquiries? This CANNOT be undone and will erase them forever.`,
      )
    ) {
      return;
    }
    setSelectedIds(new Set());
    await Promise.allSettled(ids.map((id) => permanentlyDeleteInquiry(id)));
    reload();
  };

  return (
    <DashboardLayout title="Inquiries — Deleted">
      <div className="mx-auto max-w-6xl animate-slide-up">
        {/* Top Utility Bar */}
        <InquiryBulkActionBar
          totalVisible={items.length}
          selectedCount={selectedIds.size}
          onToggleSelectAll={handleToggleSelectAll}
          onSelectPreset={handleSelectPreset}
          onClearSelection={() => setSelectedIds(new Set())}
          onRefresh={reload}
          isRefreshing={isRefreshing}
          onMarkAsComplete={handleBulkRestore}
          completeActionLabel="Restore Selected"
          onDelete={isAdmin ? handleBulkPermanentDelete : undefined}
          deleteActionLabel="Permanently Delete"
          canDelete={isAdmin}
          onPermanentDelete={isAdmin ? handleBulkPermanentDelete : undefined}
          permanentDeleteActionLabel="Delete Forever"
        >
          <button
            type="button"
            onClick={() => setExportOpen(true)}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-600 shadow-xs transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-95 dark:border-white/10 dark:bg-slate-800 dark:text-slate-200"
          >
            Export
          </button>
        </InquiryBulkActionBar>

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
              emptyMessage="Nothing in Deleted."
              enableSelection
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              onSelect={setDetailInquiry}
              renderActions={(inquiry) =>
                user && canDeleteInquiry(user, inquiry) ? (
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleRestore(inquiry)}
                        className="text-xs font-semibold text-brand-600 hover:text-brand-700"
                      >
                        Restore
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteForever(inquiry)}
                        className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                      >
                        Delete Forever
                      </button>
                    </div>
                    {inquiry.deletedByUser && (
                      <span className="text-[11px] text-slate-400">
                        by {inquiry.deletedByUser.name} · {formatDateTime(inquiry.deletedAt)}
                      </span>
                    )}
                  </div>
                ) : null
              }
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
      </div>

      <InquiryDetailModal
        open={detailInquiry !== null}
        onClose={() => setDetailInquiry(null)}
        inquiry={detailInquiry}
        onRestore={
          detailInquiry && user && canDeleteInquiry(user, detailInquiry)
            ? () => handleRestore(detailInquiry)
            : undefined
        }
        onDeleteForever={
          detailInquiry && user && canDeleteInquiry(user, detailInquiry)
            ? () => handleDeleteForever(detailInquiry)
            : undefined
        }
      />

      <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} tab="deleted" />

      {/* Floating Undo Snackbar */}
      <UndoSnackbar snackbar={snackbar} onDismiss={() => setSnackbar(null)} />
    </DashboardLayout>
  );
}
