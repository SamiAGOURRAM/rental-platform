import { useState, useEffect } from 'react';
import { getCapsules, type Capsule } from '@/api/catalog';

export function useCapsules() {
  const [capsules, setCapsules] = useState<Capsule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCapsules({ locale: 'en' })
      .then((list) => setCapsules(list))
      .catch((err) => {
        console.warn('[useCapsules] failed to load capsules:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  return { capsules, loading };
}
