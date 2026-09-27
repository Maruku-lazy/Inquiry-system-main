import { createContext, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { User } from '../types';
import * as authApi from '../api/auth';
import { getLoginAlerts, getNewlyAssigned } from '../api/inquiries';
import { showLoginAlerts, showNewlyAssignedAlert } from '../lib/notifications';
import { clearToken, getToken, setToken } from '../api/client';

const NEW_ASSIGNMENT_POLL_MS = 60_000;

// How long with zero mouse/keyboard/scroll activity before we consider the
// person "idling," and how often (while continuously idle) we re-send the
// full overdue/critical/follow-up backlog reminder — e.g. idle from hour 0,
// reminder at hour 1, another at hour 2 if still idle, etc. Any activity
// resets the idle clock back to zero.
const IDLE_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour
const IDLE_CHECK_INTERVAL_MS = 2 * 60 * 1000; // check every 2 minutes — tighter granularity for the shorter 1h threshold
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'] as const;

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // Starts true so routes don't flash the login page while we check for an
  // existing token on first load.
  const [isLoading, setIsLoading] = useState(true);

  // The instant we last checked for newly-assigned inquiries — seeded on
  // login/session-restore, advanced after every poll. Only inquiries
  // assigned after this point should ever notify via the 60s poll.
  const lastCheckedRef = useRef<Date | null>(null);

  // Idle-backlog-reminder tracking — see the constants above.
  const lastActivityRef = useRef<number>(Date.now());
  const lastIdleNotifyRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const token = getToken();
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const { user: me } = await authApi.fetchMe();
        if (!cancelled) {
          setUser(me);
          // Session-restore (e.g. a page refresh) — start the "newly
          // assigned" clock from now, same as a fresh login. This does
          // NOT re-fire the full overdue/critical/follow-up alert (that
          // only happens in login() below), it just means the 60s poll
          // won't retroactively notify about things assigned before this
          // tab was opened.
          lastCheckedRef.current = new Date();
        }
      } catch {
        // Token invalid/expired — clear it and fall back to the login page.
        clearToken();
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  // 60-second poll for newly-assigned inquiries — separate from, and much
  // simpler than, the login-time overdue/critical/follow-up check: a
  // brand new inquiry has none of those conditions yet, so this is purely
  // "has anything been assigned to me since I last checked."
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(async () => {
      const since = lastCheckedRef.current ?? new Date();
      try {
        const { items } = await getNewlyAssigned(since.toISOString());
        if (items.length > 0) await showNewlyAssignedAlert(items);
      } catch (err) {
        // A single failed poll shouldn't be noisy — just try again next
        // interval rather than surfacing a disruptive error.
        console.error('[newly-assigned] poll failed:', err);
      } finally {
        lastCheckedRef.current = new Date();
      }
    }, NEW_ASSIGNMENT_POLL_MS);

    return () => clearInterval(interval);
  }, [user]);

  // Idle-backlog reminder: while logged in, track real user activity
  // (mouse/keyboard/scroll/touch), and if the person has gone quiet for
  // 1+ hour, re-send the same full backlog notification login() shows —
  // in case they stepped away and missed earlier alerts. Fires again every
  // further 1h of continued idling; any activity resets the clock.
  useEffect(() => {
    if (!user) return;

    function markActive() {
      lastActivityRef.current = Date.now();
    }

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, markActive, { passive: true });
    }

    const checker = setInterval(async () => {
      const idleFor = Date.now() - lastActivityRef.current;
      if (idleFor < IDLE_THRESHOLD_MS) return;

      const sinceLastIdleNotify = lastIdleNotifyRef.current
        ? Date.now() - lastIdleNotifyRef.current
        : Infinity;
      if (sinceLastIdleNotify < IDLE_THRESHOLD_MS) return;

      try {
        const { items } = await getLoginAlerts();
        await showLoginAlerts(items);
      } catch (err) {
        console.error('[idle-reminder] failed to show notification:', err);
      } finally {
        lastIdleNotifyRef.current = Date.now();
      }
    }, IDLE_CHECK_INTERVAL_MS);

    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, markActive);
      }
      clearInterval(checker);
    };
  }, [user]);

  const login = useCallback(async (email: string, password: string) => {
    const { token, user: loggedInUser } = await authApi.login(email, password);
    setToken(token);
    setUser(loggedInUser);

    // Start the "newly assigned" poll clock at the moment of login, so the
    // first 60s poll only looks for things assigned AFTER this login, not
    // the whole backlog it's about to show in the full alert below.
    lastCheckedRef.current = new Date();
    // Also reset idle tracking — a fresh login is by definition activity.
    lastActivityRef.current = Date.now();
    lastIdleNotifyRef.current = null;

    // Phase 3: desktop notification, fresh logins only — deliberately NOT
    // called from the bootstrap/session-restore effect above, so a page
    // refresh mid-session doesn't re-fire it, but an actual repeated login
    // does (per spec: 5 logins in a day = 5 notification checks). Fire and
    // forget — a failure here should never block or fail the login itself.
    getLoginAlerts()
      .then(({ items }) => showLoginAlerts(items))
      .catch((err) => console.error('[login-alerts] failed to show notification:', err));
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      clearToken();
      setUser(null);
      lastCheckedRef.current = null;
      lastIdleNotifyRef.current = null;
    }
  }, []);

  const value: AuthContextValue = {
    user,
    isLoading,
    isAuthenticated: user !== null,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
