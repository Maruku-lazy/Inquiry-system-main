import { useMemo, type ReactNode } from 'react';
import type { Inquiry } from '../../types';
import { INQUIRY_TYPE_LABELS, PRIORITY_COLORS, PRIORITY_LABELS } from '../../types';
import { formatDate, formatRelativeTime, shortId } from '../../lib/format';

interface InquiryTableProps {
  inquiries: Inquiry[];
  showAssignee?: boolean;
  onSelect?: (inquiry: Inquiry) => void;
  renderActions?: (inquiry: Inquiry) => ReactNode;
  emptyMessage?: string;
  showUnseenDots?: boolean;
  // Selection and Starring
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  isStarred?: (id: string) => boolean;
  onToggleStar?: (id: string) => void;
  enableSelection?: boolean;
}

function ActiveCompletedBadge({ status }: { status: Inquiry['status'] }) {
  const isCompleted = status === 'completed';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
        isCompleted
          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
          : 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${isCompleted ? 'bg-emerald-500' : 'bg-sky-500'}`} />
      {isCompleted ? 'Completed' : 'Active'}
    </span>
  );
}

export function InquiryTable({
  inquiries,
  showAssignee = false,
  onSelect,
  renderActions,
  emptyMessage = 'No inquiries match this view yet.',
  showUnseenDots = false,
  selectedIds,
  onToggleSelect,
  isStarred,
  onToggleStar,
  enableSelection = false,
}: InquiryTableProps) {
  // Sort favorited inquiries so they pin to the very top
  const sortedInquiries = useMemo(() => {
    if (!isStarred) return inquiries;
    return [...inquiries].sort((a, b) => {
      const aStarred = isStarred(a.id);
      const bStarred = isStarred(b.id);
      if (aStarred && !bStarred) return -1;
      if (!aStarred && bStarred) return 1;
      return 0;
    });
  }, [inquiries, isStarred]);

  if (inquiries.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center dark:border-white/10 dark:bg-slate-900">
        <p className="text-sm text-slate-500 dark:text-slate-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div>
      {/* Mobile view: Touch-friendly cards */}
      <div className="space-y-3 md:hidden">
        {sortedInquiries.map((inquiry) => {
          const priorityStyle = inquiry.priority ? PRIORITY_COLORS[inquiry.priority] : null;
          const isSelected = selectedIds?.has(inquiry.id) ?? false;
          const starred = isStarred?.(inquiry.id) ?? false;

          return (
            <div
              key={inquiry.id}
              onClick={() => onSelect?.(inquiry)}
              className={`relative rounded-xl border p-4 shadow-xs transition-all ${
                isSelected
                  ? 'border-brand-500 bg-brand-50/40 ring-1 ring-brand-500/20 dark:border-brand-500 dark:bg-brand-950/20'
                  : starred
                  ? 'border-amber-300 bg-amber-50/20 dark:border-amber-800/40 dark:bg-amber-950/10'
                  : 'border-slate-200 bg-white hover:border-slate-300 dark:border-white/10 dark:bg-slate-900 dark:hover:border-slate-700'
              } ${onSelect ? 'cursor-pointer active:scale-[0.99]' : ''}`}
            >
              {showUnseenDots && inquiry.isUnseen && (
                <span
                  className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900"
                  aria-label="Unseen"
                />
              )}

              {/* Mobile Card Top Row: Checkbox, Star & Pinned Tag */}
              {enableSelection && (
                <div
                  className="mb-2.5 flex items-center justify-between border-b border-slate-100 pb-2 dark:border-white/5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelect?.(inquiry.id)}
                      className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-2 focus:ring-brand-500/20 dark:border-white/20 dark:bg-slate-800 cursor-pointer"
                      aria-label={`Select ${inquiry.customerName}`}
                    />
                    <button
                      type="button"
                      onClick={() => onToggleStar?.(inquiry.id)}
                      className={`p-1 rounded-md transition-colors ${
                        starred
                          ? 'text-amber-500 hover:text-amber-600'
                          : 'text-slate-300 hover:text-slate-400 dark:text-slate-600 dark:hover:text-slate-400'
                      }`}
                      title={starred ? 'Unstar' : 'Star (pins to top)'}
                    >
                      <svg viewBox="0 0 24 24" fill={starred ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
                      </svg>
                    </button>
                    {starred && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                        Pinned
                      </span>
                    )}
                  </div>
                  <span className="font-mono-tabular text-xs font-semibold text-brand-600 dark:text-brand-400">
                    {shortId(inquiry.id)}
                  </span>
                </div>
              )}

              <div className="flex items-start justify-between gap-2 pr-4">
                <div>
                  {!enableSelection && (
                    <span className="font-mono-tabular text-xs font-semibold text-brand-600 dark:text-brand-400">
                      {shortId(inquiry.id)}
                    </span>
                  )}
                  <h3 className="font-semibold text-slate-900 dark:text-white">{inquiry.customerName}</h3>
                  {inquiry.customerContact && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">{inquiry.customerContact}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <ActiveCompletedBadge status={inquiry.status} />
                  {inquiry.priority && (
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${priorityStyle?.bg} ${priorityStyle?.text}`}
                    >
                      {PRIORITY_LABELS[inquiry.priority]}
                    </span>
                  )}
                </div>
              </div>

              {inquiry.details && (
                <p className="mt-2.5 line-clamp-2 text-xs text-slate-600 bg-slate-50 rounded-lg p-2 dark:bg-slate-800/60 dark:text-slate-300">
                  {inquiry.details}
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5 text-xs text-slate-500 dark:border-white/5 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {inquiry.inquiryType ? INQUIRY_TYPE_LABELS[inquiry.inquiryType] : 'General'}
                  </span>
                  {showAssignee && inquiry.assignedUser && (
                    <>
                      <span>•</span>
                      <span className="text-slate-600 dark:text-slate-400">Assignee: {inquiry.assignedUser.name}</span>
                    </>
                  )}
                </div>
                <span className="font-mono-tabular text-slate-400 dark:text-slate-500">
                  {formatRelativeTime(inquiry.updatedAt)}
                </span>
              </div>

              {renderActions && (
                <div
                  className="mt-3 flex justify-end border-t border-slate-100 pt-2 dark:border-white/5"
                  onClick={(e) => e.stopPropagation()}
                >
                  {renderActions(inquiry)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop & Tablet view: Multi-column Table */}
      <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white md:block shadow-sm dark:border-white/10 dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-white/5 dark:bg-slate-800/60 dark:text-slate-400">
              {enableSelection && (
                <th className="w-14 px-3 py-3 text-center">
                  <span className="sr-only">Select</span>
                </th>
              )}
              <th className="px-4 py-3">Inquiry</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Priority</th>
              {showAssignee && <th className="px-4 py-3">Assigned To</th>}
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Posted</th>
              <th className="px-4 py-3">Last Contact</th>
              <th className="px-4 py-3 text-right">Updated</th>
              {renderActions && <th className="px-4 py-3 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {sortedInquiries.map((inquiry) => {
              const priorityStyle = inquiry.priority ? PRIORITY_COLORS[inquiry.priority] : null;
              const isSelected = selectedIds?.has(inquiry.id) ?? false;
              const starred = isStarred?.(inquiry.id) ?? false;

              return (
                <tr
                  key={inquiry.id}
                  className={`border-b border-slate-50 last:border-0 transition-colors ${
                    isSelected
                      ? 'bg-brand-50/50 dark:bg-brand-950/30'
                      : starred
                      ? 'bg-amber-50/25 dark:bg-amber-950/15 hover:bg-amber-50/40 dark:hover:bg-amber-950/25'
                      : 'hover:bg-slate-50/70 dark:border-white/5 dark:hover:bg-slate-800/40'
                  }`}
                >
                  {/* Selection Checkbox and Star Column */}
                  {enableSelection && (
                    <td
                      className="w-14 px-3 py-4 align-top text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onToggleSelect?.(inquiry.id)}
                          className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-2 focus:ring-brand-500/20 dark:border-white/20 dark:bg-slate-800 cursor-pointer"
                          aria-label={`Select ${inquiry.customerName}`}
                        />
                        <button
                          type="button"
                          onClick={() => onToggleStar?.(inquiry.id)}
                          className={`p-0.5 rounded transition-colors ${
                            starred
                              ? 'text-amber-400 hover:text-amber-500'
                              : 'text-slate-300 hover:text-slate-400 dark:text-slate-600 dark:hover:text-slate-400'
                          }`}
                          title={starred ? 'Unstar inquiry' : 'Star inquiry (pins to top)'}
                        >
                          <svg viewBox="0 0 24 24" fill={starred ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  )}

                  <td
                    onClick={() => onSelect?.(inquiry)}
                    className={`relative max-w-[220px] px-4 py-4 align-top ${onSelect ? 'cursor-pointer' : ''}`}
                  >
                    {showUnseenDots && inquiry.isUnseen && (
                      <span
                        className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900"
                        aria-label="Unseen"
                      />
                    )}
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono-tabular text-xs font-semibold text-brand-600 dark:text-brand-400">
                        {shortId(inquiry.id)}
                      </span>
                      {starred && (
                        <span className="rounded bg-amber-100 px-1 py-0.2 text-[9px] font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 uppercase tracking-wider">
                          Pinned
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400">{inquiry.details}</div>
                  </td>
                  <td
                    onClick={() => onSelect?.(inquiry)}
                    className={`px-4 py-4 align-top ${onSelect ? 'cursor-pointer' : ''}`}
                  >
                    <div className="font-medium text-slate-900 dark:text-white">{inquiry.customerName}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{inquiry.customerContact}</div>
                  </td>
                  <td className="px-4 py-4 align-top text-sm text-slate-600 dark:text-slate-300">
                    {inquiry.inquiryType ? INQUIRY_TYPE_LABELS[inquiry.inquiryType] : '—'}
                  </td>
                  <td className="px-4 py-4 align-top">
                    {inquiry.priority ? (
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${priorityStyle?.bg} ${priorityStyle?.text}`}
                      >
                        {PRIORITY_LABELS[inquiry.priority]}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  {showAssignee && (
                    <td className="px-4 py-4 align-top text-sm text-slate-700 dark:text-slate-300">
                      {inquiry.assignedUser?.name ?? '—'}
                    </td>
                  )}
                  <td className="px-4 py-4 align-top">
                    <ActiveCompletedBadge status={inquiry.status} />
                  </td>
                  <td className="px-4 py-4 align-top text-xs text-slate-500 dark:text-slate-400">
                    {formatDate(inquiry.createdAt)}
                  </td>
                  <td className="px-4 py-4 align-top text-xs text-slate-500 dark:text-slate-400">
                    {inquiry.lastContactAt ? formatDate(inquiry.lastContactAt) : '—'}
                  </td>
                  <td className="px-4 py-4 align-top text-right font-mono-tabular text-xs text-slate-400 dark:text-slate-500">
                    {formatRelativeTime(inquiry.updatedAt)}
                  </td>
                  {renderActions && (
                    <td className="px-4 py-4 align-top text-right">{renderActions(inquiry)}</td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
