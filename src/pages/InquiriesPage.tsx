import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { InquiryTable } from '../components/ui/InquiryTable';
import { FilterBar } from '../components/ui/FilterBar';
import { InquiryFormModal } from '../components/ui/InquiryFormModal';
import { useAuth } from '../hooks/useAuth';
import { createInquiry, listInquiries, updateInquiry, type InquiryFilters } from '../api/inquiries';
import type { Inquiry, User } from '../types';

export function InquiriesPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const filters: InquiryFilters = {
    status: (searchParams.get('status') as InquiryFilters['status']) || undefined,
    date_from: searchParams.get('date_from') || undefined,
    date_to: searchParams.get('date_to') || undefined,
  };

  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingInquiry, setEditingInquiry] = useState<Inquiry | null>(null);

  const load = useCallback(() => {
    setIsLoading(true);
    setError(null);
    listInquiries(filters)
      .then(({ inquiries: data }) => setInquiries(data))
      .catch(() => setError('Could not load inquiries. Try refreshing the page.'))
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.status, filters.date_from, filters.date_to]);

  useEffect(() => {
    load();
  }, [load]);

  function updateFilters(next: InquiryFilters) {
    const params: Record<string, string> = {};
    if (next.status) params.status = next.status;
    if (next.date_from) params.date_from = next.date_from;
    if (next.date_to) params.date_to = next.date_to;
    setSearchParams(params);
  }

  // Derived from currently-loaded inquiries — the only source of teammate
  // identities a non-admin role has access to (the /users endpoint is
  // admin-only, per spec). Good enough for reassigning within inquiries
  // that are already visible; a rep with zero inquiries won't show up here.
  const assignableUsers: User[] = useMemo(() => {
    if (!user || user.role === 'sales') return [];
    const seen = new Map<string, User>();
    for (const inquiry of inquiries) {
      const u = inquiry.assignedUser;
      if (u && u.id !== user.id && !seen.has(u.id)) {
        seen.set(u.id, { id: u.id, name: u.name, role: u.role } as User);
      }
    }
    return Array.from(seen.values());
  }, [inquiries, user]);

  const isSales = user?.role === 'sales';

  function openCreate() {
    setEditingInquiry(null);
    setModalOpen(true);
  }

  function openEdit(inquiry: Inquiry) {
    setEditingInquiry(inquiry);
    setModalOpen(true);
  }

  async function handleSubmit(values: {
    customerName: string;
    customerContact: string;
    details: string;
    status?: Inquiry['status'];
    assignedTo?: string;
  }) {
    if (editingInquiry) {
      await updateInquiry(editingInquiry.id, values);
    } else {
      await createInquiry(values);
    }
    load();
  }

  return (
    <DashboardLayout title="Inquiries">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {isSales ? 'My Inquiries' : 'Team Inquiries'}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {isSales
                ? 'Inquiries assigned to you.'
                : 'Everything visible in your scope of the hierarchy.'}
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            + Log Inquiry
          </button>
        </div>

        <div className="mb-4">
          <FilterBar filters={filters} onChange={updateFilters} />
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>
        )}

        {isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center text-sm text-slate-400">
            Loading inquiries…
          </div>
        ) : (
          <InquiryTable inquiries={inquiries} showAssignee={!isSales} onSelect={openEdit} />
        )}
      </div>

      <InquiryFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        inquiry={editingInquiry}
        assignableUsers={assignableUsers}
      />
    </DashboardLayout>
  );
}
