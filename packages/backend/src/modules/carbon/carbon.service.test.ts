import { describe, it, expect } from 'vitest';
import { luggageWeightFormula } from './formulas/luggage-weight.formula.js';
import { reuseSavingsFormula } from './formulas/reuse-savings.formula.js';

const parisOutfitInputs = [
  { weightGrams: 180, categorySlug: 'tops' },
  { weightGrams: 450, categorySlug: 'bottoms' },
  { weightGrams: 350, categorySlug: 'outerwear' },
  { weightGrams: 600, categorySlug: 'shoes' },
];

describe('LuggageWeightFormula', () => {
  it('calculates CO2 savings from luggage weight avoided', () => {
    const co2 = luggageWeightFormula.calculate(parisOutfitInputs);
    // total weight = (180 + 450 + 350 + 600) / 1000 = 1.58 kg
    // co2 = 1.58 × 1500 × 0.000255 = 0.60435
    expect(co2).toBeGreaterThan(0.5);
    expect(co2).toBeLessThan(0.7);
  });

  it('returns 0 for empty inputs', () => {
    expect(luggageWeightFormula.calculate([])).toBe(0);
  });

  it('scales linearly with weight', () => {
    const single = luggageWeightFormula.calculate([{ weightGrams: 1000, categorySlug: 'tops' }]);
    const double = luggageWeightFormula.calculate([
      { weightGrams: 1000, categorySlug: 'tops' },
      { weightGrams: 1000, categorySlug: 'tops' },
    ]);
    // Formula rounds to 3 decimal places — double may differ from single×2 by at most 1 rounding step
    expect(Math.round(Math.abs(double - single * 2) * 1000)).toBeLessThanOrEqual(1);
  });

  it('has version 1', () => {
    expect(luggageWeightFormula.version).toBe(1);
  });
});

describe('ReuseSavingsFormula', () => {
  it('calculates CO2 savings from reusing vs buying new', () => {
    const co2 = reuseSavingsFormula.calculate(parisOutfitInputs);
    // tops: 8, bottoms: 12, outerwear: 15, shoes: 14 → total = 49
    expect(co2).toBe(49);
  });

  it('returns 0 for empty inputs', () => {
    expect(reuseSavingsFormula.calculate([])).toBe(0);
  });

  it('uses default savings for unknown categories', () => {
    const co2 = reuseSavingsFormula.calculate([
      { weightGrams: 100, categorySlug: 'unknown_category' },
    ]);
    expect(co2).toBe(8); // default = 8 kg
  });

  it('suits have highest CO2 savings (20 kg)', () => {
    const co2 = reuseSavingsFormula.calculate([{ weightGrams: 1000, categorySlug: 'suits' }]);
    expect(co2).toBe(20);
  });

  it('swimwear has lowest CO2 savings (5 kg)', () => {
    const co2 = reuseSavingsFormula.calculate([{ weightGrams: 200, categorySlug: 'swimwear' }]);
    expect(co2).toBe(5);
  });
});

describe('Combined carbon calculation', () => {
  it('total CO2 is sum of both formulas', () => {
    const luggage = luggageWeightFormula.calculate(parisOutfitInputs);
    const reuse = reuseSavingsFormula.calculate(parisOutfitInputs);
    const total = Math.round((luggage + reuse) * 1000) / 1000;
    expect(total).toBeGreaterThan(reuse); // total > reuse alone
    expect(total).toBeLessThan(reuse + 2); // luggage contribution is < 2 kg for typical outfit
  });
});
