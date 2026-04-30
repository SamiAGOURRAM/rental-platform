import { describe, it, expect } from 'vitest';
import {
  calculateCondition,
  getMaxCyclesForCategory,
  computeNextCycle,
} from './lifecycle.service.js';

describe('LifecycleService', () => {
  // ── calculateCondition ───────────────────────────────────────

  describe('calculateCondition', () => {
    it('returns new when ratio is 0', () => {
      expect(calculateCondition(0, 15)).toBe('new');
    });

    it('returns excellent when ratio is 0.2', () => {
      expect(calculateCondition(3, 15)).toBe('excellent');
    });

    it('returns good when ratio is 0.4', () => {
      expect(calculateCondition(6, 15)).toBe('good');
    });

    it('returns fair when ratio is 0.6', () => {
      expect(calculateCondition(9, 15)).toBe('fair');
    });

    it('returns end_of_life when ratio is 0.8', () => {
      expect(calculateCondition(12, 15)).toBe('end_of_life');
    });

    it('returns end_of_life when ratio is 1.0', () => {
      expect(calculateCondition(15, 15)).toBe('end_of_life');
    });
  });

  // ── getMaxCyclesForCategory ──────────────────────────────────

  describe('getMaxCyclesForCategory', () => {
    it('returns cycles for known category tops', () => {
      expect(getMaxCyclesForCategory('tops')).toBe(15);
    });

    it('returns default for unknown category', () => {
      expect(getMaxCyclesForCategory('unknown_category')).toBe(15);
    });
  });

  // ── computeNextCycle ─────────────────────────────────────────

  describe('computeNextCycle', () => {
    it('returns good condition for mid-life item (5/15)', () => {
      const result = computeNextCycle(5, 15);
      expect(result.newCycleCount).toBe(6);
      expect(result.newCondition).toBe('good');
      expect(result.isEndOfLife).toBe(false);
    });

    it('returns end_of_life by condition at 14/15', () => {
      const result = computeNextCycle(14, 15);
      expect(result.newCycleCount).toBe(15);
      expect(result.newCondition).toBe('end_of_life');
      expect(result.isEndOfLife).toBe(true);
    });

    it('returns end_of_life by cycle count at 15/15', () => {
      const result = computeNextCycle(15, 15);
      expect(result.newCycleCount).toBe(16);
      expect(result.newCondition).toBe('end_of_life');
      expect(result.isEndOfLife).toBe(true);
    });
  });
});
