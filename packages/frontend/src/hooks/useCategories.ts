import { useState, useEffect } from 'react';
import { getCategories, type Category } from '@/api/catalog';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCategories('en')
      .then(setCategories)
      .catch((err) => {
        console.warn('[useCategories] failed to load categories:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  return { categories, loading };
}
