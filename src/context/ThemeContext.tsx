import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react';

// 'auto' follows the OS/browser color-scheme preference live (updates
// immediately if the person's system switches, no reload needed).
export type ThemePreference = 'light' | 'dark' | 'auto';
type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
  /** What the person picked (persisted). */
  theme: ThemePreference;
  /** What's actually applied right now — same as `theme` unless it's 'auto'. */
  resolvedTheme: ResolvedTheme;
  setTheme: (t: ThemePreference) => void;
}

const STORAGE_KEY = 'inquireos-theme';

function getSystemTheme(): ResolvedTheme {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getInitialPreference(): ThemePreference {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'auto') return stored;
  return 'auto';
}

// eslint-disable-next-line react-refresh/only-export-components
export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// A device/browser-level preference, not tied to the logged-in account —
// mounted outside AuthProvider so it works on the login screen too, and
// persists across sessions via localStorage.
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>(getInitialPreference);
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme);

  // Live-track the OS preference so 'auto' actually stays in sync instead
  // of only reflecting the system theme at the moment the tab loaded.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => setSystemTheme(e.matches ? 'dark' : 'light');
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  const resolvedTheme: ResolvedTheme = theme === 'auto' ? systemTheme : theme;

  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolvedTheme === 'dark');
  }, [resolvedTheme]);

  const setTheme = useCallback((t: ThemePreference) => {
    setThemeState(t);
    localStorage.setItem(STORAGE_KEY, t);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>{children}</ThemeContext.Provider>
  );
}
