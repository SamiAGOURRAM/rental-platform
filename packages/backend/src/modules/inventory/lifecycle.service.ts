import type { ProductCondition } from '@prisma/client';

/** Max cycles by category slug */
export const MAX_CYCLES_BY_CATEGORY: Record<string, number> = {
  tops: 15,
  bottoms: 18,
  dresses: 12,
  outerwear: 20,
  shoes: 12,
  accessories: 30,
  suits: 15,
  swimwear: 10,
};

const DEFAULT_MAX_CYCLES = 15;

/** Determine the condition based on cycle ratio */
export function calculateCondition(cycleCount: number, maxCycles: number): ProductCondition {
  const ratio = cycleCount / maxCycles;
  if (ratio <= 0) return 'new';
  if (ratio <= 0.25) return 'excellent';
  if (ratio <= 0.5) return 'good';
  if (ratio <= 0.75) return 'fair';
  return 'end_of_life';
}

/** Rental price discount factor by condition */
export const CONDITION_PRICE_FACTOR: Record<ProductCondition, number> = {
  new: 1.0,
  excellent: 0.9,
  good: 0.75,
  fair: 0.6,
  end_of_life: 0.5,
};

export function getMaxCyclesForCategory(categorySlug: string): number {
  return MAX_CYCLES_BY_CATEGORY[categorySlug] ?? DEFAULT_MAX_CYCLES;
}

export interface CycleResult {
  newCycleCount: number;
  newCondition: ProductCondition;
  isEndOfLife: boolean;
}

export function computeNextCycle(currentCycleCount: number, maxCycles: number): CycleResult {
  const newCycleCount = currentCycleCount + 1;
  const newCondition = calculateCondition(newCycleCount, maxCycles);
  const isEndOfLife = newCondition === 'end_of_life' || newCycleCount >= maxCycles;
  return { newCycleCount, newCondition, isEndOfLife };
}
