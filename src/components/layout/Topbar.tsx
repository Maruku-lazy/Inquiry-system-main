import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { NotificationBell } from './NotificationBell';
import { AccountPanel } from './AccountPanel';

interface TopbarProps {
  title: string;
  onOpenMobileNav?: () => void;
}

export function Topbar({ title, onOpenMobileNav }: TopbarProps) {
  const { user } = useAuth();
  const [accountOpen, setAccountOpen] = useState(false);

  const today = new Date().toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const initials = user
    ? user.name
        .split(' ')
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
    : '';

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8 dark:border-white/10 dark:bg-slate-900">
      <div className="flex items-center gap-2 sm:gap-3">
        {onOpenMobileNav && (
          <button
            type="button"
            onClick={onOpenMobileNav}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 active:scale-95 lg:hidden dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label="Open sidebar navigation"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        <h1 className="text-base font-semibold text-slate-900 sm:text-lg dark:text-white">{title}</h1>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <span className="font-mono-tabular hidden text-xs font-medium text-slate-400 md:inline sm:text-sm">{today}</span>

        <NotificationBell />

        <button
          type="button"
          onClick={() => setAccountOpen(true)}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-700 shadow-sm transition-transform hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 dark:bg-brand-500/15 dark:text-brand-300"
          aria-label="Account details and preferences"
        >
          {initials}
        </button>
      </div>

      <AccountPanel open={accountOpen} onClose={() => setAccountOpen(false)} />
    </header>
  );
}
