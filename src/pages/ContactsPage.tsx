import { useCallback, useState } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Pagination } from '../components/ui/Pagination';
import { ContactDetailModal } from '../components/ui/ContactDetailModal';
import { SearchInput } from '../components/ui/SearchInput';
import { usePaginatedFetch } from '../hooks/usePaginatedFetch';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { deleteContact, listContacts } from '../api/contacts';
import type { Contact } from '../types';
import { formatDate } from '../lib/format';

export function ContactsPage() {
  const [selected, setSelected] = useState<Contact | null>(null);
  const [q, setQ] = useState('');
  const debouncedQ = useDebouncedValue(q);

  const fetchPage = useCallback(
    (page: number, pageSize: number) => listContacts({ page, pageSize, q: debouncedQ || undefined }),
    [debouncedQ],
  );
  const { items, total, totalPages, page, pageSize, setPage, setPageSize, isLoading, error, reload } =
    usePaginatedFetch(fetchPage, [debouncedQ]);

  function handleRenamed(updated: Contact) {
    setSelected(updated);
    reload();
  }

  async function handleDelete() {
    if (!selected) return;
    if (!window.confirm(`Delete the contact "${selected.name}"? Their inquiry history stays in the database.`)) {
      return;
    }
    await deleteContact(selected.id);
    setSelected(null);
    reload();
  }

  return (
    <DashboardLayout title="Contacts">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900">Contacts</h2>
          <p className="mt-1 text-sm text-slate-500">
            Every customer within your scope, sorted alphabetically. Tap a name for full history.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>
        )}

        <div className="mb-4">
          <SearchInput value={q} onChange={setQ} placeholder="Search contact name…" />
        </div>

        {isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center text-sm text-slate-400">
            Loading…
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center text-sm text-slate-400">
            No contacts yet — they're created automatically the first time you log an inquiry for a customer.
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3">Name</th>
                    <th className="px-5 py-3 text-center">Inquiries</th>
                    <th className="px-5 py-3">First Inquiry</th>
                    <th className="px-5 py-3">Latest Inquiry</th>
                    <th className="px-5 py-3">First Logged By</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => setSelected(c)}
                      className="cursor-pointer border-b border-slate-50 last:border-0 hover:bg-slate-50"
                    >
                      <td className="px-5 py-3.5 font-medium text-slate-900">{c.name}</td>
                      <td className="px-5 py-3.5 text-center font-mono-tabular text-slate-700">
                        {c.totalInquiries}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-500">{formatDate(c.firstInquiryDate)}</td>
                      <td className="px-5 py-3.5 text-xs text-slate-500">{formatDate(c.lastInquiryDate)}</td>
                      <td className="px-5 py-3.5 text-slate-600">{c.firstLoggedBy?.name ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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

      <ContactDetailModal
        open={selected !== null}
        onClose={() => setSelected(null)}
        contact={selected}
        onRenamed={handleRenamed}
        onDelete={handleDelete}
      />
    </DashboardLayout>
  );
}
