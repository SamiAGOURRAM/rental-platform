import { useState, useEffect, useCallback, useRef } from 'react';
import { getProducts, type Product, type ProductFilters } from '@/api/catalog';

interface UseCollectionResult {
  products: Product[];
  loading: boolean;
  loadingMore: boolean;
  total: number;
  hasMore: boolean;
  loadMore: () => void;
}

export function useCollectionProducts(
  filters: Omit<ProductFilters, 'cursor' | 'limit'>,
): UseCollectionResult {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [cursor, setCursor] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Reset and fetch when filters change
  useEffect(() => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    setProducts([]);
    setCursor(null);

    getProducts({ ...filters, locale: 'en', limit: 20 })
      .then((res) => {
        if (!ctrl.signal.aborted) {
          setProducts(res.items);
          setTotal(res.totalCount);
          setCursor(res.nextCursor);
        }
      })
      .catch((err) => {
        console.warn('[useCollectionProducts] initial fetch failed:', err);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });

    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters)]);

  const loadMore = useCallback(() => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);

    getProducts({ ...filters, locale: 'en', limit: 20, cursor })
      .then((res) => {
        setProducts((prev) => [...prev, ...res.items]);
        setCursor(res.nextCursor);
        setTotal(res.totalCount);
      })
      .catch((err) => {
        console.warn('[useCollectionProducts] loadMore failed:', err);
      })
      .finally(() => setLoadingMore(false));
  }, [cursor, loadingMore, filters]);

  return {
    products,
    loading,
    loadingMore,
    total,
    hasMore: cursor !== null,
    loadMore,
  };
}
