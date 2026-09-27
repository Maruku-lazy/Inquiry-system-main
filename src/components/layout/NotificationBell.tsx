import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getNotifications, type NotificationItem } from '../../api/inquiries';
import { useUnseen } from '../../hooks/useUnseen';
import { useEscapeKey } from '../../hooks/useEscapeKey';

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[19px] w-[19px]">
      <path
        d="M6 17h12M7.5 17V11a4.5 4.5 0 1 1 9 0v6M10.5 20a1.5 1.5 0 0 0 3 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const REASON_LABEL: Record<NotificationItem['reason'], string> = {
  new: 'New inquiry',
  follow_up: 'Follow up now!',
};

const REASON_STYLE: Record<NotificationItem['reason'], string> = {
  new: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400',
  follow_up: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400',
};

// Bell in the Topbar — dropdown of the caller's unseen active inquiries,
// each tagged 'New inquiry' (freshly assigned) or 'Follow up now!' (just
// went stale, right at that day's 00:00 rollover). Reuses the same
// unseen-detection the sidebar red dots are built on (see useUnseen).
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { hasUnseen, refresh } = useUnseen();
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEscapeKey(() => setOpen(false), open);

  useEffect(() => {
    if (!open) return;
    setIsLoading(true);
    getNotifications()
      .then(({ items: fetched }) => setItems(fetched))
      .catch(() => setItems([]))
      .finally(() => setIsLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  function handleItemClick() {
    setOpen(false);
    navigate('/inquiries/active');
    refresh();
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative grid h-9 w-9 place-items-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
        aria-label="Notifications"
      >
        <BellIcon />
        {hasUnseen && (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10 dark:border-white/10 dark:bg-slate-900">
          <div className="border-b border-slate-100 px-4 py-3 dark:border-white/10">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</h3>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="px-4 py-8 text-center text-sm text-slate-400">Loading…</div>
            ) : items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-400">You're all caught up.</div>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={handleItemClick}
                  className="flex w-full items-start gap-3 border-b border-slate-50 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/5"
                >
                  <span
                    className={`mt-0.5 shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${REASON_STYLE[item.reason]}`}
                  >
                    {REASON_LABEL[item.reason]}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-slate-900 dark:text-white">
                      {item.customerName}
                    </span>
                    <span className="font-mono-tabular block text-xs text-slate-400">{item.shortId}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
