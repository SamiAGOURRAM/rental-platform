import { describe, it, expect } from 'vitest';
import { calculatePrice } from './pricing.service.js';

const mockProducts = [
  { id: 'p1', rentalPricePerDay: 2.5, condition: 'new' as const },
  { id: 'p2', rentalPricePerDay: 3.0, condition: 'good' as const },
];

const dateRange5Days = {
  start: new Date('2026-05-01T00:00:00.000Z'),
  end: new Date('2026-05-05T00:00:00.000Z'),
};

describe('PricingService.calculatePrice', () => {
  it('calculates subtotal correctly for multiple items', () => {
    const result = calculatePrice(mockProducts, dateRange5Days, 'personal');
    // new condition: 2.5 × 1.0 × 5 = 12.50
    // good condition: 3.0 × 0.75 × 5 = 11.25
    // subtotal = 23.75
    expect(result.subtotal).toBe(23.75);
  });

  it('calculates days correctly (inclusive)', () => {
    const result = calculatePrice(mockProducts, dateRange5Days, 'personal');
    expect(result.days).toBe(5);
  });

  it('returns zero delivery fee for personal method', () => {
    const result = calculatePrice(mockProducts, dateRange5Days, 'personal');
    expect(result.deliveryFee).toBe(0);
  });

  it('returns correct delivery fee for mondial_relay', () => {
    const result = calculatePrice(mockProducts, dateRange5Days, 'mondial_relay');
    expect(result.deliveryFee).toBe(9.0);
  });

  it('returns correct delivery fee for chronopost', () => {
    const result = calculatePrice(mockProducts, dateRange5Days, 'chronopost');
    expect(result.deliveryFee).toBe(19.8);
  });

  it('calculates correct total (subtotal + delivery)', () => {
    const result = calculatePrice(mockProducts, dateRange5Days, 'mondial_relay');
    expect(result.total).toBe(result.subtotal + result.deliveryFee);
  });

  it('calculates deposit as max(30, subtotal * 0.5)', () => {
    // subtotal = 23.75, 50% = 11.875 → deposit = max(30, 11.875) = 30
    const result = calculatePrice(mockProducts, dateRange5Days, 'personal');
    expect(result.depositAmount).toBe(30);
  });

  it('applies condition discount correctly — fair condition', () => {
    const fairProduct = [{ id: 'p1', rentalPricePerDay: 4.0, condition: 'fair' as const }];
    const result = calculatePrice(fairProduct, dateRange5Days, 'personal');
    // fair = 0.6 factor, 4.0 × 0.6 × 5 = 12.00
    expect(result.subtotal).toBe(12.0);
  });

  it('returns per-item prices with correct line totals', () => {
    const result = calculatePrice(mockProducts, dateRange5Days, 'personal');
    expect(result.itemPrices).toHaveLength(2);
    expect(result.itemPrices[0]?.lineTotal).toBe(result.itemPrices[0]?.pricePerDay! * 5);
  });
});
