import { useCallback, useEffect, useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

const BASE_STORAGE_KEY = 'inquireos_starred_inquiries';
const STORAGE_EVENT = 'inquireos_starred_changed';

function getStorageKey(userId?: string): string {
  return userId ? `${BASE_STORAGE_KEY}_${userId}` : BASE_STORAGE_KEY;
}

function loadStarredIds(userId?: string): Set<string> {
  if (!userId) return new Set();
  try {
    const raw = localStorage.getItem(getStorageKey(userId));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch {
    return new Set();
  }
}

function saveStarredIds(userId: string | undefined, set: Set<string>) {
  if (!userId) return;
  try {
    localStorage.setItem(getStorageKey(userId), JSON.stringify(Array.from(set)));
    window.dispatchEvent(new CustomEvent(STORAGE_EVENT, { detail: { userId } }));
  } catch {
    // ignore storage quota or private browsing errors
  }
}

export function useFavorites(explicitUserId?: string) {
  const authCtx = useContext(AuthContext);
  const userId = explicitUserId ?? authCtx?.user?.id;

  const [starredIds, setStarredIds] = useState<Set<string>>(() => loadStarredIds(userId));

  useEffect(() => {
    setStarredIds(loadStarredIds(userId));

    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent<{ userId?: string }>;
      if (!customEvent.detail || customEvent.detail.userId === userId) {
        setStarredIds(loadStarredIds(userId));
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (userId && e.key === getStorageKey(userId)) {
        setStarredIds(loadStarredIds(userId));
      }
    };

    window.addEventListener(STORAGE_EVENT, handleSync);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(STORAGE_EVENT, handleSync);
      window.removeEventListener('storage', handleStorage);
    };
  }, [userId]);

  const isStarred = useCallback(
    (id: string) => starredIds.has(id),
    [starredIds],
  );

  const toggleStar = useCallback(
    (id: string) => {
      if (!userId) return;
      setStarredIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        saveStarredIds(userId, next);
        return next;
      });
    },
    [userId],
  );

  const setStarred = useCallback(
    (ids: string[], starred: boolean) => {
      if (!userId || ids.length === 0) return;
      setStarredIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => {
          if (starred) {
            next.add(id);
          } else {
            next.delete(id);
          }
        });
        saveStarredIds(userId, next);
        return next;
      });
    },
    [userId],
  );

  return {
    starredIds,
    isStarred,
    toggleStar,
    setStarred,
  };
}
