import { useState, useEffect } from 'react';
import { getProducts, type Product } from '@/api/catalog';

export function useProducts(limit = 8) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProducts({ locale: 'en', limit })
      .then((res) => setProducts(res.items))
      .catch((err) => {
        console.warn('[useProducts] failed to load products:', err);
      })
      .finally(() => setLoading(false));
  }, [limit]);

  return { products, loading };
}
