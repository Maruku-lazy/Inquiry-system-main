import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react';
import { getUnseenSummary } from '../api/inquiries';
import { useAuth } from '../hooks/useAuth';

interface UnseenContextValue {
  hasUnseen: boolean;
  refresh: () => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const UnseenContext = createContext<UnseenContextValue | undefined>(undefined);

export function UnseenProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [hasUnseen, setHasUnseen] = useState(false);

  const refresh = useCallback(() => {
    if (!isAuthenticated) return;
    getUnseenSummary()
      .then(({ hasUnseen: value }) => setHasUnseen(value))
      .catch(() => {
        /* non-critical — a red dot failing to update isn't worth surfacing an error for */
      });
  }, [isAuthenticated]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return <UnseenContext.Provider value={{ hasUnseen, refresh }}>{children}</UnseenContext.Provider>;
}
