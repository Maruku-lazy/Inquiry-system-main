import { useEffect, useState, type FormEvent } from 'react';
import type {
  Inquiry,
  InquirySource,
  InquiryStatus,
  InquiryType,
  PreferredTransaction,
  Priority,
  User,
} from '../../types';
import {
  INQUIRY_TYPE_LABELS,
  PREFERRED_TRANSACTION_LABELS,
  PRIORITY_LABELS,
  SOURCE_LABELS,
  STATUS_LABELS,
} from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { backdropClickHandler } from './modalBackdrop';

interface InquiryFormValues {
  customerName: string;
  customerContact: string;
  details: string;
  status?: InquiryStatus;
  assignedTo?: string;
  inquiryType: InquiryType;
  priority: Priority;
  unit?: string;
  source?: InquirySource;
  preferredTransaction?: PreferredTransaction;
  lastContactAt?: string | null;
  reminderAt?: string | null;
}

interface InquiryFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: InquiryFormValues) => Promise<void>;
  inquiry?: Inquiry | null; // present when editing
  assignableUsers?: User[]; // sales reps this user can assign to (leader/manager/admin)
  onDelete?: (inquiry: Inquiry) => void;
}

const emptyForm = {
  customerName: '',
  customerContact: '',
  details: '',
  unit: '',
};

// <input type="date"> works with plain YYYY-MM-DD, not full ISO strings.
function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return '';
  return iso.slice(0, 10);
}

export function InquiryFormModal({
  open,
  onClose,
  onSubmit,
  inquiry,
  assignableUsers = [],
  onDelete,
}: InquiryFormModalProps) {
  const { user } = useAuth();
  const isEditing = Boolean(inquiry);
  const canReassign = assignableUsers.length > 0 && user?.role !== 'sales';

  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState<InquiryStatus>('new');
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [inquiryType, setInquiryType] = useState<InquiryType>('new_vehicle');
  const [priority, setPriority] = useState<Priority>('medium');
  const [source, setSource] = useState<InquirySource | ''>('');
  const [preferredTransaction, setPreferredTransaction] = useState<PreferredTransaction | ''>('');
  const [lastContactAt, setLastContactAt] = useState('');
  const [reminderAt, setReminderAt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (inquiry) {
      setForm({
        customerName: inquiry.customerName,
        customerContact: inquiry.customerContact,
        details: inquiry.details,
        unit: inquiry.unit ?? '',
      });
      setStatus(inquiry.status);
      setAssignedTo(inquiry.assignedTo);
      setInquiryType(inquiry.inquiryType ?? 'new_vehicle');
      setPriority(inquiry.priority ?? 'medium');
      setSource(inquiry.source ?? '');
      setPreferredTransaction(inquiry.preferredTransaction ?? '');
      setLastContactAt(toDateInputValue(inquiry.lastContactAt));
      setReminderAt(toDateInputValue(inquiry.reminderAt));
    } else {
      setForm(emptyForm);
      setStatus('new');
      setAssignedTo(user?.id ?? '');
      setInquiryType('new_vehicle');
      setPriority('medium');
      setSource('');
      setPreferredTransaction('');
      setLastContactAt('');
      setReminderAt('');
    }
    setError(null);
  }, [inquiry, open, user?.id]);

  useEscapeKey(onClose, open);

  if (!open) return null;
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        ...form,
        unit: form.unit || undefined,
        inquiryType,
        priority,
        source: source || undefined,
        preferredTransaction: preferredTransaction || undefined,
        // Only meaningful to send null when editing (clears a
        // previously-set date). On create there's nothing to clear, so an
        // empty field should be omitted entirely rather than sent as
        // null — the create schema doesn't accept null and would coerce
        // it to the Unix epoch instead of leaving the field unset.
        ...(lastContactAt || isEditing ? { lastContactAt: lastContactAt || null } : {}),
        ...(reminderAt || isEditing ? { reminderAt: reminderAt || null } : {}),
        ...(isEditing && { status }),
        ...(canReassign && assignedTo && { assignedTo }),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 dark:border-white/15 dark:bg-slate-800 dark:text-white';
  const labelClass = 'mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300';

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 backdrop-blur-xs px-4 py-6 sm:py-8 animate-fade-in"
      onClick={backdropClickHandler(onClose)}
    >
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 sm:p-6 shadow-2xl animate-modal-enter dark:bg-slate-900 dark:border dark:border-white/10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {isEditing ? 'Edit Inquiry' : 'Log New Inquiry'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 active:scale-95 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Customer name</label>
              <input
                required
                value={form.customerName}
                onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                className={inputClass}
                placeholder="Juan Dela Cruz"
              />
            </div>
            <div>
              <label className={labelClass}>Contact (phone or email)</label>
              <input
                required
                value={form.customerContact}
                onChange={(e) => setForm({ ...form, customerContact: e.target.value })}
                className={inputClass}
                placeholder="0917-555-0142"
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Inquiry details</label>
            <textarea
              required
              rows={3}
              value={form.details}
              onChange={(e) => setForm({ ...form, details: e.target.value })}
              className={`${inputClass} resize-none`}
              placeholder="What is the customer asking about?"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Type of Inquiry</label>
              <select
                required
                value={inquiryType}
                onChange={(e) => setInquiryType(e.target.value as InquiryType)}
                className={inputClass}
              >
                {Object.entries(INQUIRY_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Priority</label>
              <select
                required
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className={inputClass}
              >
                {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Unit</label>
              <input
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className={inputClass}
                placeholder="e.g. Vios 1.3 XE CVT"
              />
            </div>
            <div>
              <label className={labelClass}>Source</label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as InquirySource | '')}
                className={inputClass}
              >
                <option value="">— Not set —</option>
                {Object.entries(SOURCE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Preferred Transaction</label>
              <select
                value={preferredTransaction}
                onChange={(e) => setPreferredTransaction(e.target.value as PreferredTransaction | '')}
                className={inputClass}
              >
                <option value="">— Not set —</option>
                {Object.entries(PREFERRED_TRANSACTION_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Date of Last Contact</label>
              <input
                type="date"
                value={lastContactAt}
                onChange={(e) => setLastContactAt(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Reminder</label>
              <input
                type="date"
                value={reminderAt}
                onChange={(e) => setReminderAt(e.target.value)}
                className={inputClass}
              />
            </div>

            {isEditing && (
              <div>
                <label className={labelClass}>Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as InquiryStatus)}
                  className={inputClass}
                >
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {canReassign && (
            <div>
              <label className={labelClass}>Assigned to</label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className={inputClass}
              >
                <option value={user?.id}>{user?.name} (me)</option>
                {assignableUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>
          )}

          <div className="flex items-center justify-between gap-3 pt-2">
            <div>
              {isEditing && inquiry && onDelete && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onDelete(inquiry);
                  }}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-rose-600 transition-colors hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/30"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-rose-500">
                    <path d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>Move to Trash</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
              >
                {submitting ? 'Saving…' : isEditing ? 'Save changes' : 'Log inquiry'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
