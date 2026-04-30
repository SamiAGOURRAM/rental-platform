import { fetchApi } from './client';

export interface PlatformCarbonStats {
  totalCo2SavedKg: number;
  totalItemsReused: number;
  totalOrders: number;
  equivalents: {
    carKmAvoided: number;
    treeDaysAbsorbed: number;
  };
}

export function getPlatformStats(): Promise<PlatformCarbonStats> {
  return fetchApi('/carbon/platform');
}
