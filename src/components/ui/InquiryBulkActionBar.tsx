import { useState, useRef, useEffect, type ReactNode } from 'react';
import type { Priority } from '../../types';
import { PRIORITY_LABELS } from '../../types';

export type SelectionPreset = 'all' | 'none' | 'read' | 'unread' | 'starred' | 'unstarred';

interface InquiryBulkActionBarProps {
  totalVisible: number;
  selectedCount: number;
  onToggleSelectAll: () => void;
  onSelectPreset: (preset: SelectionPreset) => void;
  onClearSelection: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  // Bulk Actions
  onSetPriority?: (priority: Priority) => void;
  onMarkAsRead?: () => void;
  onMarkAsUnread?: () => void;
  onMarkAsComplete?: () => void;
  completeActionLabel?: string;
  onToggleFavorite?: (star: boolean) => void;
  onMarkImportant?: () => void;
  onSetReminder?: () => void;
  onDelete?: () => void;
  deleteActionLabel?: string;
  canDelete?: boolean;
  onPermanentDelete?: () => void;
  permanentDeleteActionLabel?: string;
  // Right-side actions slot (Export, Create button, view toggles)
  children?: ReactNode;
}

export function InquiryBulkActionBar({
  totalVisible,
  selectedCount,
  onToggleSelectAll,
  onSelectPreset,
  onClearSelection,
  onRefresh,
  isRefreshing = false,
  onSetPriority,
  onMarkAsRead,
  onMarkAsUnread,
  onMarkAsComplete,
  completeActionLabel = 'Mark as Complete',
  onToggleFavorite,
  onMarkImportant,
  onSetReminder,
  onDelete,
  deleteActionLabel = 'Move to Trash',
  canDelete = true,
  onPermanentDelete,
  permanentDeleteActionLabel = 'Delete Forever',
  children,
}: InquiryBulkActionBarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [priorityMenuOpen, setPriorityMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const priorityRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const checkboxRef = useRef<HTMLInputElement>(null);

  const isAllSelected = totalVisible > 0 && selectedCount === totalVisible;
  const isIndeterminate = selectedCount > 0 && selectedCount < totalVisible;

  // Sync indeterminate property on the master HTML checkbox element
  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  // Click outside listeners for dropdown menus
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (priorityRef.current && !priorityRef.current.contains(e.target as Node)) {
        setPriorityMenuOpen(false);
      }
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreMenuOpen(false);
      }
    }
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePreset = (preset: SelectionPreset) => {
    onSelectPreset(preset);
    setDropdownOpen(false);
  };

  const handlePrioritySelect = (priority: Priority) => {
    onSetPriority?.(priority);
    setPriorityMenuOpen(false);
  };

  return (
    <div className="relative z-30 mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white/90 p-2 sm:px-3.5 sm:py-2.5 shadow-xs backdrop-blur-md transition-all dark:border-white/10 dark:bg-slate-900/90">
      {/* Left: Master Checkbox + Dropdown + Refresh + Contextual Actions (Priority + 3-Dot Menu) */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Master Selector Group */}
        <div ref={dropdownRef} className="relative flex items-center rounded-xl bg-slate-100/90 p-0.5 dark:bg-slate-800/80">
          <label className="flex items-center justify-center px-2 py-1.5 cursor-pointer rounded-lg hover:bg-white dark:hover:bg-slate-700/80 transition-colors">
            <input
              ref={checkboxRef}
              type="checkbox"
              checked={isAllSelected}
              onChange={onToggleSelectAll}
              className="h-4 w-4 rounded-md border-slate-300 text-brand-600 focus:ring-2 focus:ring-brand-500/20 dark:border-white/20 dark:bg-slate-900 dark:checked:bg-brand-600 cursor-pointer"
              aria-label="Select all visible items"
            />
          </label>
          <button
            type="button"
            onClick={() => setDropdownOpen((prev) => !prev)}
            className="flex items-center justify-center px-1.5 py-1.5 rounded-lg text-slate-500 hover:bg-white hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700/80 dark:hover:text-white transition-colors"
            title="Selection options"
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
              <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* Preset Dropdown Menu */}
          {dropdownOpen && (
            <div className="absolute left-0 top-full mt-1.5 z-50 w-36 rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl animate-fade-in dark:border-white/10 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => handlePreset('all')}
                className="w-full px-3.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                All
              </button>
              <button
                type="button"
                onClick={() => handlePreset('none')}
                className="w-full px-3.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                None
              </button>
              <div className="my-1 border-t border-slate-100 dark:border-white/5" />
              <button
                type="button"
                onClick={() => handlePreset('read')}
                className="w-full px-3.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Read
              </button>
              <button
                type="button"
                onClick={() => handlePreset('unread')}
                className="w-full px-3.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Unread
              </button>
              <div className="my-1 border-t border-slate-100 dark:border-white/5" />
              <button
                type="button"
                onClick={() => handlePreset('starred')}
                className="w-full px-3.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Starred
              </button>
              <button
                type="button"
                onClick={() => handlePreset('unstarred')}
                className="w-full px-3.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Unstarred
              </button>
            </div>
          )}
        </div>

        {/* Refresh Button */}
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 active:scale-95 transition-all dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            title="Refresh list"
            aria-label="Refresh list"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={`h-4 w-4 ${isRefreshing ? 'animate-spin text-brand-600' : ''}`}
            >
              <path
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 0 0 4.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 0 1-15.357-2m15.357 2H15"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}

        {/* Selection Status or Item Counter */}
        {selectedCount > 0 ? (
          <div className="flex items-center gap-1.5 pl-1 animate-fade-in">
            <span className="text-xs font-bold text-brand-600 dark:text-brand-400 whitespace-nowrap">
              {selectedCount} selected
            </span>
            <button
              type="button"
              onClick={onClearSelection}
              className="text-[11px] font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline underline-offset-2"
            >
              (Clear)
            </button>
          </div>
        ) : (
          <span className="hidden sm:inline pl-1 text-xs text-slate-400 dark:text-slate-500">
            {totalVisible} {totalVisible === 1 ? 'item' : 'items'}
          </span>
        )}

        {/* Contextual Bulk Action Bar: Priority Button + 3-Dot Menu */}
        {selectedCount > 0 && (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-white/10 animate-fade-in">
            {/* Priority Selector Button */}
            {onSetPriority && (
              <div ref={priorityRef} className="relative">
                <button
                  type="button"
                  onClick={() => setPriorityMenuOpen((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-xs hover:bg-slate-50 active:scale-95 transition-all dark:border-white/10 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  title="Change priority for selected"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5 text-amber-500">
                    <path d="M3 3v18h18 M7 14l4-4 4 4 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>Priority</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3 text-slate-400">
                    <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {priorityMenuOpen && (
                  <div className="absolute left-0 top-full mt-1.5 z-50 w-36 rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl animate-fade-in dark:border-white/10 dark:bg-slate-900">
                    {(['low', 'medium', 'high', 'critical'] as Priority[]).map((p) => {
                      const dotColor =
                        p === 'critical'
                          ? 'bg-rose-500'
                          : p === 'high'
                          ? 'bg-amber-500'
                          : p === 'medium'
                          ? 'bg-sky-500'
                          : 'bg-slate-400';
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => handlePrioritySelect(p)}
                          className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                          <span className={`h-2 w-2 rounded-full ${dotColor}`} />
                          <span>{PRIORITY_LABELS[p]}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 3-Dot Overflow Menu (⋮) */}
            <div ref={moreRef} className="relative">
              <button
                type="button"
                onClick={() => setMoreMenuOpen((prev) => !prev)}
                className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-xs hover:bg-slate-50 hover:text-slate-900 active:scale-95 transition-all dark:border-white/10 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:hover:text-white"
                title="More bulk actions"
                aria-label="More bulk actions"
                aria-expanded={moreMenuOpen}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4">
                  <circle cx="12" cy="5" r="1" />
                  <circle cx="12" cy="12" r="1" />
                  <circle cx="12" cy="19" r="1" />
                </svg>
              </button>

              {moreMenuOpen && (
                <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-1.5 z-50 w-48 rounded-xl border border-slate-200 bg-white py-1.5 shadow-2xl animate-fade-in dark:border-white/10 dark:bg-slate-900">
                  {/* Mark as Read */}
                  {onMarkAsRead && (
                    <button
                      type="button"
                      onClick={() => {
                        onMarkAsRead();
                        setMoreMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2.5 px-3.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5 text-slate-500">
                        <path d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                        <path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      </svg>
                      <span>Mark as Read</span>
                    </button>
                  )}

                  {/* Mark as Unread */}
                  {onMarkAsUnread && (
                    <button
                      type="button"
                      onClick={() => {
                        onMarkAsUnread();
                        setMoreMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2.5 px-3.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <span className="h-2 w-2 rounded-full bg-rose-500" />
                      <span>Mark as Unread</span>
                    </button>
                  )}

                  {/* Lifecycle Action (Mark Complete / Reopen / Restore) */}
                  {onMarkAsComplete && (
                    <button
                      type="button"
                      onClick={() => {
                        onMarkAsComplete();
                        setMoreMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2.5 px-3.5 py-1.5 text-left text-xs font-medium text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-3.5 w-3.5 text-emerald-500">
                        <path d="m4.5 12.75 6 6 9-13.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span>{completeActionLabel}</span>
                    </button>
                  )}

                  <div className="my-1 border-t border-slate-100 dark:border-white/5" />

                  {/* Star / Favorite */}
                  {onToggleFavorite && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          onToggleFavorite(true);
                          setMoreMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-2.5 px-3.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5 text-amber-500">
                          <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clipRule="evenodd" />
                        </svg>
                        <span>Star / Pin to Top</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onToggleFavorite(false);
                          setMoreMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-2.5 px-3.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5 text-slate-400">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
                        </svg>
                        <span>Unstar / Unpin</span>
                      </button>
                    </>
                  )}

                  {/* Mark as Important */}
                  {onMarkImportant && (
                    <button
                      type="button"
                      onClick={() => {
                        onMarkImportant();
                        setMoreMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2.5 px-3.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5 text-amber-500">
                        <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span>Mark as Important</span>
                    </button>
                  )}

                  {/* Set Reminder */}
                  {onSetReminder && (
                    <button
                      type="button"
                      onClick={() => {
                        onSetReminder();
                        setMoreMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2.5 px-3.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5 text-sky-500">
                        <path d="M12 6v6l4 2m6-2a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span>Set Reminder…</span>
                    </button>
                  )}

                  {/* Delete / Move to Trash */}
                  {onDelete && canDelete && (
                    <>
                      <div className="my-1 border-t border-slate-100 dark:border-white/5" />
                      <button
                        type="button"
                        onClick={() => {
                          onDelete();
                          setMoreMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-2.5 px-3.5 py-1.5 text-left text-xs font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5 text-rose-500">
                          <path d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span>{deleteActionLabel}</span>
                      </button>
                    </>
                  )}

                  {/* Delete Forever / Permanent Delete */}
                  {onPermanentDelete && (
                    <>
                      <div className="my-1 border-t border-slate-100 dark:border-white/5" />
                      <button
                        type="button"
                        onClick={() => {
                          onPermanentDelete();
                          setMoreMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-2.5 px-3.5 py-1.5 text-left text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400">
                          <path d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="m3 3 18 18" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span>{permanentDeleteActionLabel}</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right: Actions Slot (Export, Create button, View Switchers) */}
      {children && (
        <div className="flex items-center gap-2">
          {children}
        </div>
      )}
    </div>
  );
}
