import { useCallback, useEffect, useState } from 'react';
import { InquiryTable } from './InquiryTable';
import { Pagination } from './Pagination';
import { useAuth } from '../../hooks/useAuth';
import { usePaginatedFetch } from '../../hooks/usePaginatedFetch';
import { listContactInquiries, updateContact } from '../../api/contacts';
import type { Contact } from '../../types';
import { formatDate } from '../../lib/format';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { backdropClickHandler } from './modalBackdrop';

interface ContactDetailModalProps {
  open: boolean;
  onClose: () => void;
  contact: Contact | null;
  onRenamed: (updated: Contact) => void;
  onDelete: () => void;
}

export function ContactDetailModal({ open, onClose, contact, onRenamed, onDelete }: ContactDetailModalProps) {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchPage = useCallback(
    (page: number, pageSize: number) =>
      contact ? listContactInquiries(contact.id, { page, pageSize }) : Promise.reject(new Error('No contact')),
    [contact],
  );
  const { items, total, totalPages, page, pageSize, setPage, setPageSize, isLoading } = usePaginatedFetch(
    fetchPage,
    [contact?.id],
  );

  useEffect(() => {
    setEditing(false);
    setError(null);
    if (contact) setNameDraft(contact.name);
  }, [contact, open]);

  useEscapeKey(onClose, open);

  if (!open || !contact) return null;

  const canDelete = user?.role !== 'sales';
  const isSales = user?.role === 'sales';

  async function handleSaveName() {
    if (!contact || !nameDraft.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const { contact: updated } = await updateContact(contact.id, nameDraft.trim());
      onRenamed(updated);
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not rename this contact.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 px-4 py-8"
      onClick={backdropClickHandler(onClose)}
    >
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            {editing ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-lg font-semibold text-slate-900 outline-none focus:border-brand-500"
                />
                <button
                  type="button"
                  onClick={handleSaveName}
                  disabled={saving}
                  className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setNameDraft(contact.name);
                  }}
                  className="text-sm font-medium text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                {contact.name}
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="text-xs font-semibold text-brand-600 hover:text-brand-700"
                >
                  Edit
                </button>
              </h2>
            )}
            {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-4">
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Inquiries</dt>
            <dd className="mt-0.5 font-mono-tabular text-lg font-bold text-slate-900">{contact.totalInquiries}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">First Inquiry</dt>
            <dd className="mt-0.5 text-sm text-slate-800">{formatDate(contact.firstInquiryDate)}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Latest Inquiry</dt>
            <dd className="mt-0.5 text-sm text-slate-800">{formatDate(contact.lastInquiryDate)}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">First Logged By</dt>
            <dd className="mt-0.5 text-sm text-slate-800">{contact.firstLoggedBy?.name ?? 'Unknown'}</dd>
          </div>
        </dl>

        <h3 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Inquiry History
        </h3>
        {isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white py-12 text-center text-sm text-slate-400">
            Loading…
          </div>
        ) : (
          <>
            <InquiryTable inquiries={items} showAssignee={!isSales} emptyMessage="No inquiries in your scope for this contact." />
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

        {canDelete && (
          <div className="mt-4 flex justify-end border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onDelete}
              className="text-sm font-medium text-rose-500 hover:text-rose-600"
            >
              Delete Contact
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
