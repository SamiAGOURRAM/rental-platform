import type { ICarbonFormula, CarbonFormulaInput } from './carbon-formula.interface.js';

/**
 * CO2 savings from reusing clothes instead of buying new.
 *
 * Per-item savings based on category (lower-bound conservative estimates).
 * Sources: WRAP UK Textile Lifecycle Analysis, Higg Index data.
 */

const CO2_SAVINGS_BY_CATEGORY: Record<string, number> = {
  tops: 8, // T-shirts, shirts — 8 kg CO2 per new garment
  bottoms: 12, // Jeans, trousers
  dresses: 10,
  outerwear: 15, // Jackets, coats
  shoes: 14,
  accessories: 3, // Belts, sunglasses, etc.
  suits: 20, // Full suits
  swimwear: 5,
};

const DEFAULT_SAVINGS_KG = 8;

export class ReuseSavingsFormula implements ICarbonFormula {
  readonly name = 'reuse_savings';
  readonly version = 1;

  calculate(inputs: CarbonFormulaInput[]): number {
    const total = inputs.reduce((sum, item) => {
      const savings = CO2_SAVINGS_BY_CATEGORY[item.categorySlug] ?? DEFAULT_SAVINGS_KG;
      return sum + savings;
    }, 0);
    return Math.round(total * 1000) / 1000;
  }
}

export const reuseSavingsFormula = new ReuseSavingsFormula();
