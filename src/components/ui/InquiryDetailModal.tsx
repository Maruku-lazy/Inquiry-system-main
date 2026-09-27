import type { Inquiry } from '../../types';
import {
  INQUIRY_TYPE_LABELS,
  PREFERRED_TRANSACTION_LABELS,
  PRIORITY_COLORS,
  PRIORITY_LABELS,
  SOURCE_LABELS,
  STATUS_LABELS,
} from '../../types';
import { formatDate, formatDateTime, shortId } from '../../lib/format';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { backdropClickHandler } from './modalBackdrop';

interface InquiryDetailModalProps {
  open: boolean;
  onClose: () => void;
  inquiry: Inquiry | null;
  onRestore?: () => void;
  onDeleteForever?: () => void;
  onDelete?: () => void;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-800 dark:text-slate-200">{value}</dd>
    </div>
  );
}

export function InquiryDetailModal({
  open,
  onClose,
  inquiry,
  onRestore,
  onDeleteForever,
  onDelete,
}: InquiryDetailModalProps) {
  useEscapeKey(onClose, open);
  if (!open || !inquiry) return null;

  const priorityStyle = inquiry.priority ? PRIORITY_COLORS[inquiry.priority] : null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 backdrop-blur-xs px-4 py-8 animate-fade-in"
      onClick={backdropClickHandler(onClose)}
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl animate-modal-enter dark:bg-slate-900 dark:border dark:border-white/10">
        <div className="flex items-start justify-between">
          <div>
            <div className="font-mono-tabular text-xs font-semibold text-brand-600 dark:text-brand-400">{shortId(inquiry.id)}</div>
            <h2 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">{inquiry.customerName}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 active:scale-95 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:bg-slate-800/80 dark:text-slate-200">{inquiry.details}</p>

        <dl className="mt-5 grid grid-cols-2 gap-4">
          <Field label="Contact" value={inquiry.customerContact} />
          <Field label="Status" value={STATUS_LABELS[inquiry.status]} />
          <Field label="Type" value={inquiry.inquiryType ? INQUIRY_TYPE_LABELS[inquiry.inquiryType] : '—'} />
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Priority</dt>
            <dd className="mt-0.5">
              {inquiry.priority ? (
                <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${priorityStyle?.bg} ${priorityStyle?.text}`}>
                  {PRIORITY_LABELS[inquiry.priority]}
                </span>
              ) : (
                '—'
              )}
            </dd>
          </div>
          <Field label="Unit" value={inquiry.unit ?? '—'} />
          <Field label="Source" value={inquiry.source ? SOURCE_LABELS[inquiry.source] : '—'} />
          <Field
            label="Preferred Transaction"
            value={inquiry.preferredTransaction ? PREFERRED_TRANSACTION_LABELS[inquiry.preferredTransaction] : '—'}
          />
          <Field label="Assigned To" value={inquiry.assignedUser?.name ?? '—'} />
          <Field label="Date Posted" value={formatDate(inquiry.createdAt)} />
          <Field label="Last Contact" value={inquiry.lastContactAt ? formatDate(inquiry.lastContactAt) : '—'} />
          <Field label="Reminder" value={inquiry.reminderAt ? formatDate(inquiry.reminderAt) : '—'} />
        </dl>

        {inquiry.deletedAt && (
          <div className="mt-5 rounded-lg bg-rose-50 px-3 py-2.5 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
            Deleted by <span className="font-semibold">{inquiry.deletedByUser?.name ?? 'Unknown'}</span> ·{' '}
            {formatDateTime(inquiry.deletedAt)}
          </div>
        )}

        {(onRestore || onDeleteForever || onDelete) && (
          <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-white/10">
            <div>
              {onDelete && !inquiry.deletedAt && (
                <button
                  type="button"
                  onClick={onDelete}
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
              {onDeleteForever && (
                <button
                  type="button"
                  onClick={onDeleteForever}
                  className="rounded-lg px-4 py-2 text-sm font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                >
                  Delete Forever
                </button>
              )}
              {onRestore && (
                <button
                  type="button"
                  onClick={onRestore}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
                >
                  Restore
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
