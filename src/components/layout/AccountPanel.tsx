import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { backdropClickHandler } from '../ui/modalBackdrop';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import type { ThemePreference } from '../../context/ThemeContext';
import { ROLE_LABELS } from '../../types';
import { shortId } from '../../lib/format';

interface AccountPanelProps {
  open: boolean;
  onClose: () => void;
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <path
        d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AutoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <rect x="3" y="4.5" width="18" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8.5 20h7M12 16.5V20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <path
        d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 8l-4 4 4 4M6 12h12"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const MODE_OPTIONS: { value: ThemePreference; label: string; icon: ReactNode }[] = [
  { value: 'light', label: 'Day', icon: <SunIcon /> },
  { value: 'dark', label: 'Night', icon: <MoonIcon /> },
  { value: 'auto', label: 'Auto', icon: <AutoIcon /> },
];

// Slide-in "account" drawer, opened from the avatar in the Topbar.
// Compact fixed width (not a fraction of the viewport) with a colored
// header banner, styled after Zoho CRM's account panel — see the
// reference screenshot this was built from. Replaces the old sidebar
// profile block + Topbar logout button. Kept mounted for one extra
// transition tick after close so the exit slide/fade actually plays
// instead of popping away.
export function AccountPanel({ open, onClose }: AccountPanelProps) {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);

  useEscapeKey(onClose, open);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    }
    setVisible(false);
    const timer = setTimeout(() => setMounted(false), 250);
    return () => clearTimeout(timer);
  }, [open]);

  if (!mounted || !user) return null;

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  const initials = user.name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('');

  return (
    <div className="fixed inset-0 z-[70]">
      <div
        onClick={backdropClickHandler(onClose)}
        className={`absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] transition-opacity duration-[250ms] ease-out ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <aside
        className={`absolute right-0 top-0 flex h-full w-[400px] max-w-[92vw] flex-col bg-white shadow-2xl shadow-slate-900/20 transition-transform duration-[250ms] ease-out dark:bg-slate-900 ${
          visible ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Colored header banner */}
        <div className="relative bg-brand-600 px-5 pb-5 pt-6 text-white dark:bg-brand-700">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 grid h-7 w-7 place-items-center rounded-full bg-white/90 text-slate-600 shadow transition-colors hover:bg-white"
            aria-label="Close"
          >
            ✕
          </button>

          <div className="flex items-center gap-3 pr-8">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white/15 text-lg font-bold ring-2 ring-white/40">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="truncate text-base font-bold leading-tight">{user.name}</div>
              <div className="font-mono-tabular mt-0.5 truncate text-xs text-white/80">
                User ID: {shortId(user.id, 'USR')}
              </div>
            </div>
          </div>

          <span className="mt-4 inline-block rounded-md bg-white/15 px-2.5 py-1 text-xs font-semibold">
            {ROLE_LABELS[user.role]}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-white/10">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Email</span>
            <span className="truncate text-sm text-slate-700 dark:text-slate-300">{user.email}</span>
          </div>

          <div className="mt-5">
            <h3 className="mb-2 text-sm font-bold text-slate-900 dark:text-white">Mode</h3>
            <div className="flex items-center gap-1 rounded-full bg-slate-100 p-1 dark:bg-white/10">
              {MODE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTheme(opt.value)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-1.5 text-sm font-medium transition-colors ${
                    theme === opt.value
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white'
                  }`}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-100 px-5 py-4 dark:border-white/10">
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:border-white/10 dark:text-slate-300 dark:hover:border-rose-500/30 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
          >
            <LogoutIcon />
            Log out
          </button>
        </div>
      </aside>
    </div>
  );
}
