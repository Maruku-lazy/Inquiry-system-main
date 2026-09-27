import { useCallback, useEffect, useState } from 'react';
import type { PaginatedResponse } from '../types';

export function usePaginatedFetch<T>(
  fetchPage: (page: number, pageSize: number) => Promise<PaginatedResponse<T>>,
  // Include anything the fetch depends on (filters, tab, etc.) — changing
  // any of these resets back to page 1, matching normal list UX.
  deps: unknown[],
) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [data, setData] = useState<PaginatedResponse<T> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    // Only show full skeleton if we have no data yet; otherwise keep list mounted
    if (!data) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setError(null);
    fetchPage(page, pageSize)
      .then(setData)
      .catch(() => setError('Could not load this list. Try refreshing the page.'))
      .finally(() => {
        setIsLoading(false);
        setIsRefreshing(false);
      });
    // fetchPage intentionally excluded — callers should memoize it via deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, ...deps, Boolean(data)]);

  useEffect(() => {
    load();
  }, [load]);

  // Any filter/tab change (deps) resets to page 1 rather than staying on
  // e.g. page 4 of a now-different, possibly shorter list.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return {
    items: data?.items ?? [],
    total: data?.total ?? 0,
    totalPages: data?.totalPages ?? 1,
    page,
    pageSize,
    setPage,
    setPageSize,
    isLoading,
    isRefreshing,
    error,
    reload: load,
    // Optimistic local patch — e.g. clearing a row's unseen dot the instant
    // it's clicked, without waiting on the server round-trip + a full
    // reload(). `reload()` still runs afterward as the source of truth;
    // this just avoids a visible delay/flicker in the meantime.
    patchItem: (id: string, patch: Partial<T> & { id: string }) => {
      setData((prev) =>
        prev
          ? { ...prev, items: prev.items.map((item) => ((item as { id: string }).id === id ? { ...item, ...patch } : item)) }
          : prev,
      );
    },
  };
}
