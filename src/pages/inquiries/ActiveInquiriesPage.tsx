import { useCallback, useEffect, useState } from 'react';
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
import { useUnseen } from '../../hooks/useUnseen';
import { usePaginatedFetch } from '../../hooks/usePaginatedFetch';
import { useFavorites } from '../../hooks/useFavorites';
import { canDeleteInquiry } from '../../lib/permissions';
import {
  createInquiry,
  deleteInquiry,
  getAssignableUsers,
  listActiveInquiries,
  markInquiryViewed,
  restoreInquiry,
  updateInquiry,
} from '../../api/inquiries';
import type { Inquiry, Priority, User } from '../../types';

export function ActiveInquiriesPage() {
  const { user } = useAuth();
  const { refresh: refreshUnseen } = useUnseen();
  const { isStarred, toggleStar, setStarred } = useFavorites();
  const [modalOpen, setModalOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [editingInquiry, setEditingInquiry] = useState<Inquiry | null>(null);
  const [assignableUsers, setAssignableUsers] = useState<User[]>([]);
  const [filters, setFilters] = useState<InquiryFiltersState>(EMPTY_INQUIRY_FILTERS);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [snackbar, setSnackbar] = useState<SnackbarState | null>(null);
  const debouncedQ = useDebouncedValue(filters.q);

  const fetchPage = useCallback(
    (page: number, pageSize: number) =>
      listActiveInquiries({
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

  // Clear selections when query, page or filters change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, pageSize, debouncedQ, filters.type, filters.priority, filters.postedYear, filters.postedMonth]);

  useEffect(() => {
    if (isSales) return;
    getAssignableUsers()
      .then(({ users }) => setAssignableUsers(users as User[]))
      .catch(() => setAssignableUsers([]));
  }, [isSales]);

  function openCreate() {
    setEditingInquiry(null);
    setModalOpen(true);
  }

  function openEdit(inquiry: Inquiry) {
    setEditingInquiry(inquiry);
    setModalOpen(true);
    patchItem(inquiry.id, { id: inquiry.id, isUnseen: false });
    markInquiryViewed(inquiry.id)
      .then(() => {
        refreshUnseen();
        reload();
      })
      .catch(() => {
        /* non-critical */
      });
  }

  async function handleSubmit(values: Parameters<typeof createInquiry>[0] & { status?: Inquiry['status'] }) {
    if (editingInquiry) {
      await updateInquiry(editingInquiry.id, values);
    } else {
      await createInquiry(values);
    }
    reload();
  }

  async function handleDelete(inquiry: Inquiry) {
    if (!window.confirm(`Delete the inquiry for "${inquiry.customerName}"? You can restore it later from Deleted.`)) {
      return;
    }
    await deleteInquiry(inquiry.id);
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
    refreshUnseen();
    reload();
  };

  const handleBulkMarkAsUnread = () => {
    // Client-side visual toggle for unread
    items.filter((i) => selectedIds.has(i.id)).forEach((i) => patchItem(i.id, { id: i.id, isUnseen: true }));
    setSnackbar({
      id: String(Date.now()),
      message: `${selectedIds.size} inquiries marked as unread.`,
    });
  };

  const handleBulkMarkAsComplete = async () => {
    const selectedItems = items.filter((i) => selectedIds.has(i.id));
    if (selectedItems.length === 0) return;
    const previousStatuses = new Map(selectedItems.map((i) => [i.id, i.status]));
    selectedItems.forEach((i) => patchItem(i.id, { id: i.id, status: 'completed' }));
    setSelectedIds(new Set());

    await Promise.allSettled(selectedItems.map((i) => updateInquiry(i.id, { status: 'completed' })));
    reload();

    setSnackbar({
      id: String(Date.now()),
      message: `${selectedItems.length} inquiries marked as completed.`,
      onUndo: async () => {
        await Promise.allSettled(
          Array.from(previousStatuses.entries()).map(([id, status]) =>
            updateInquiry(id, { status }),
          ),
        );
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

  const handleBulkMarkImportant = () => {
    // Star and set priority to high
    handleBulkToggleFavorite(true);
    handleBulkSetPriority('high');
  };

  const handleBulkSetReminder = () => {
    setSnackbar({
      id: String(Date.now()),
      message: `Reminder set for ${selectedIds.size} inquiries.`,
    });
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!window.confirm(`Delete the ${ids.length} selected inquiries? You can restore them later from Deleted.`)) {
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

  return (
    <DashboardLayout title="Inquiries — Active">
      <div className="mx-auto max-w-6xl animate-slide-up">
        {/* Top Utility Bar: Master Selector + 3-Dot Overflow Menu placed alongside Export and Create buttons */}
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
          onMarkAsComplete={handleBulkMarkAsComplete}
          completeActionLabel="Mark as Complete"
          onToggleFavorite={handleBulkToggleFavorite}
          onMarkImportant={handleBulkMarkImportant}
          onSetReminder={handleBulkSetReminder}
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
          <button
            type="button"
            onClick={openCreate}
            className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-xs transition-all hover:bg-brand-700 active:scale-95 whitespace-nowrap"
          >
            + Log Inquiry
          </button>
        </InquiryBulkActionBar>

        {error && (
          <div className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-950/30 dark:text-rose-400">{error}</div>
        )}

        {/* Search & Filters */}
        <InquiryFilterBar value={filters} onChange={setFilters} canSearchAssignee={!isSales} />

        {isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center text-sm text-slate-400 dark:border-white/10 dark:bg-slate-900">
            Loading inquiries…
          </div>
        ) : (
          <>
            <InquiryTable
              inquiries={items}
              showAssignee={!isSales}
              showUnseenDots
              enableSelection
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              isStarred={isStarred}
              onToggleStar={toggleStar}
              onSelect={openEdit}
              renderActions={(inquiry) =>
                user && canDeleteInquiry(user, inquiry) ? (
                  <button
                    type="button"
                    onClick={() => handleDelete(inquiry)}
                    className="text-xs font-semibold text-rose-500 hover:text-rose-600"
                  >
                    Delete
                  </button>
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

      <InquiryFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        inquiry={editingInquiry}
        assignableUsers={assignableUsers}
        onDelete={handleDelete}
      />

      <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} tab="active" />

      {/* Floating Undo Snackbar */}
      <UndoSnackbar snackbar={snackbar} onDismiss={() => setSnackbar(null)} />
    </DashboardLayout>
  );
}
