import { useCallback, useEffect, useRef, useState } from "react";

export interface PageResult<T> {
  items: T[];
  total: number;
}

type Fetcher<T> = (limit: number, offset: number) => Promise<PageResult<T>>;

export interface InfinitePageState<T> {
  items: T[];
  total: number;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  /** Ref, который нужно повесить на sentinel-элемент в конце списка —
   *  когда он появится во вьюпорте, автоматически подгружается следующая страница. */
  sentinelRef: (node: HTMLElement | null) => void;
}

/**
 * Lazy-loading пагинация через IntersectionObserver.
 * `deps` управляет сбросом состояния (например, при смене поискового запроса).
 */
export function useInfinitePage<T>(
  fetcher: Fetcher<T>,
  pageSize: number,
  deps: unknown[],
): InfinitePageState<T> {
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const offsetRef = useRef(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const reqIdRef = useRef(0);

  // Initial / reset fetch on deps change.
  useEffect(() => {
    const reqId = ++reqIdRef.current;
    setLoading(true);
    setItems([]);
    setTotal(0);
    offsetRef.current = 0;
    fetcherRef.current(pageSize, 0)
      .then((page) => {
        if (reqId !== reqIdRef.current) return; // stale
        setItems(page.items);
        setTotal(page.total);
        offsetRef.current = page.items.length;
      })
      .catch(() => {
        if (reqId !== reqIdRef.current) return;
        setItems([]);
        setTotal(0);
      })
      .finally(() => {
        if (reqId !== reqIdRef.current) return;
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const hasMore = items.length < total;

  const loadMore = useCallback(async () => {
    if (loadingMore || loading) return;
    if (items.length >= total) return;
    const reqId = reqIdRef.current;
    setLoadingMore(true);
    try {
      const page = await fetcherRef.current(pageSize, offsetRef.current);
      if (reqId !== reqIdRef.current) return; // reset happened while we were fetching
      setItems((prev) => [...prev, ...page.items]);
      setTotal(page.total);
      offsetRef.current += page.items.length;
    } catch {
      /* swallow */
    } finally {
      if (reqId === reqIdRef.current) setLoadingMore(false);
    }
  }, [items.length, total, loading, loadingMore, pageSize]);

  // Intersection observer for the sentinel element.
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useCallback((node: HTMLElement | null) => {
    if (observerRef.current) observerRef.current.disconnect();
    if (!node) return;
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          loadMore();
        }
      },
      { rootMargin: "200px" },
    );
    observerRef.current.observe(node);
  }, [loadMore]);

  useEffect(() => () => observerRef.current?.disconnect(), []);

  return { items, total, loading, loadingMore, hasMore, sentinelRef };
}
