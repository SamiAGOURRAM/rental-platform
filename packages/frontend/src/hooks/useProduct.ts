import { useState, useEffect } from 'react';
import { getProduct } from '@/api/catalog';
import type { ProductDetail } from '@/api/catalog';

interface UseProductResult {
  product: ProductDetail | null;
  loading: boolean;
  error: string | null;
}

export function useProduct(id: string | undefined): UseProductResult {
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError('No product ID provided');
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    getProduct(id)
      .then((data) => {
        if (!controller.signal.aborted) {
          setProduct(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(err?.message ?? 'Failed to load product');
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [id]);

  return { product, loading, error };
}
