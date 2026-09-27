import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { InquiryTable } from '../../components/ui/InquiryTable';
import { Pagination } from '../../components/ui/Pagination';
import { InquiryFormModal } from '../../components/ui/InquiryFormModal';
import { useAuth } from '../../hooks/useAuth';
import { usePaginatedFetch } from '../../hooks/usePaginatedFetch';
import { getAssignableUsers, listCompletedInquiries, updateInquiry } from '../../api/inquiries';
import type { Inquiry, User } from '../../types';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function CompletedMonthPage() {
  const { year, month } = useParams<{ year: string; month: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [editingInquiry, setEditingInquiry] = useState<Inquiry | null>(null);
  const [assignableUsers, setAssignableUsers] = useState<User[]>([]);

  const fetchPage = useCallback(
    (page: number, pageSize: number) =>
      listCompletedInquiries({ page, pageSize, year: Number(year), month: Number(month) }),
    [year, month],
  );

  const { items, total, totalPages, page, pageSize, setPage, setPageSize, isLoading, error, reload } =
    usePaginatedFetch(fetchPage, [year, month]);

  const monthLabel = month ? MONTH_NAMES[Number(month) - 1] : '';
  const isSales = user?.role === 'sales';

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

  return (
    <DashboardLayout title={`Completed — ${monthLabel} ${year}`}>
      <div className="mx-auto max-w-6xl">
        <button
          type="button"
          onClick={() => navigate(`/inquiries/completed/${year}`)}
          className="mb-4 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          ← Back to {year}
        </button>

        {error && (
          <div className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>
        )}

        {isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center text-sm text-slate-400">
            Loading…
          </div>
        ) : (
          <>
            <InquiryTable
              inquiries={items}
              showAssignee={!isSales}
              emptyMessage={`No completed inquiries in ${monthLabel} ${year}.`}
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
      </div>

      <InquiryFormModal
        open={editingInquiry !== null}
        onClose={() => setEditingInquiry(null)}
        onSubmit={handleSubmit}
        inquiry={editingInquiry}
        assignableUsers={assignableUsers}
      />
    </DashboardLayout>
  );
}
