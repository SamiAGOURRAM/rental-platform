import { useState, useEffect } from 'react';
import { getPlatformStats, type PlatformCarbonStats } from '@/api/carbon';

export function usePlatformStats() {
  const [stats, setStats] = useState<PlatformCarbonStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPlatformStats()
      .then(setStats)
      .catch((err) => {
        console.warn('[usePlatformStats] failed to load stats:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  return { stats, loading };
}
