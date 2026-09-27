import { useEffect } from 'react';

export interface SnackbarState {
  id: string;
  message: string;
  onUndo?: () => void;
}

interface UndoSnackbarProps {
  snackbar: SnackbarState | null;
  onDismiss: () => void;
  durationMs?: number;
}

export function UndoSnackbar({ snackbar, onDismiss, durationMs = 6000 }: UndoSnackbarProps) {
  useEffect(() => {
    if (!snackbar) return;
    const timer = setTimeout(() => {
      onDismiss();
    }, durationMs);
    return () => clearTimeout(timer);
  }, [snackbar, durationMs, onDismiss]);

  if (!snackbar) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex max-w-[calc(100vw-2rem)] sm:max-w-md items-center justify-between gap-4 rounded-xl bg-slate-900/95 px-4 py-3 text-sm text-white shadow-2xl border border-slate-700/80 backdrop-blur-md animate-slide-up dark:bg-slate-900 dark:border-white/15"
    >
      <span className="font-medium text-slate-100">{snackbar.message}</span>

      <div className="flex items-center gap-3 border-l border-slate-700 pl-3 dark:border-white/15">
        {snackbar.onUndo && (
          <button
            type="button"
            onClick={() => {
              snackbar.onUndo?.();
              onDismiss();
            }}
            className="font-bold text-sky-400 hover:text-sky-300 transition-colors active:scale-95 cursor-pointer"
          >
            Undo
          </button>
        )}

        <button
          type="button"
          onClick={onDismiss}
          className="text-slate-400 hover:text-white transition-colors p-0.5 rounded-md cursor-pointer active:scale-95"
          aria-label="Dismiss notification"
          title="Dismiss"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
            <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
