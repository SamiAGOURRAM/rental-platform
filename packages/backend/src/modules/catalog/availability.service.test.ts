import { describe, it, expect } from 'vitest';
import {
  CLEANING_BUFFER_DAYS,
  reqStartWithBuffer,
  windowsOverlapWithBuffer,
} from './availability.service.js';

const d = (s: string) => new Date(`${s}T00:00:00Z`);

describe('reqStartWithBuffer', () => {
  it('subtracts the default 2-day cleaning buffer', () => {
    expect(reqStartWithBuffer(d('2026-05-15')).toISOString().slice(0, 10)).toBe('2026-05-13');
  });

  it('handles month boundaries', () => {
    expect(reqStartWithBuffer(d('2026-05-01')).toISOString().slice(0, 10)).toBe('2026-04-29');
  });

  it('handles year boundaries', () => {
    expect(reqStartWithBuffer(d('2026-01-01')).toISOString().slice(0, 10)).toBe('2025-12-30');
  });

  it('does not mutate the input', () => {
    const input = d('2026-05-15');
    reqStartWithBuffer(input);
    expect(input.toISOString().slice(0, 10)).toBe('2026-05-15');
  });

  it('honours an explicit buffer override', () => {
    expect(reqStartWithBuffer(d('2026-05-15'), 0).toISOString().slice(0, 10)).toBe('2026-05-15');
    expect(reqStartWithBuffer(d('2026-05-15'), 5).toISOString().slice(0, 10)).toBe('2026-05-10');
  });

  it('default buffer is 2 days', () => {
    expect(CLEANING_BUFFER_DAYS).toBe(2);
  });
});

describe('windowsOverlapWithBuffer', () => {
  // Existing order: [05-10, 05-14], cleaning buffer 2 days → unit free again on 05-17
  const orderStart = d('2026-05-10');
  const orderEnd = d('2026-05-14');

  it('detects fully-overlapping windows', () => {
    expect(windowsOverlapWithBuffer(orderStart, orderEnd, d('2026-05-12'), d('2026-05-13'))).toBe(
      true,
    );
  });

  it('detects request starting inside the cleaning buffer (regression: 05-15→17 vs 05-10→14)', () => {
    // The unit returns 05-14 and is in cleaning until 05-16; request 05-15→17 must still be blocked.
    expect(windowsOverlapWithBuffer(orderStart, orderEnd, d('2026-05-15'), d('2026-05-17'))).toBe(
      true,
    );
  });

  it('frees the unit exactly when the buffer expires', () => {
    // Buffer ends 05-16; a request starting 05-17 should NOT overlap.
    expect(windowsOverlapWithBuffer(orderStart, orderEnd, d('2026-05-17'), d('2026-05-20'))).toBe(
      false,
    );
  });

  it('does not block a request that ends before the order starts', () => {
    expect(windowsOverlapWithBuffer(orderStart, orderEnd, d('2026-05-01'), d('2026-05-05'))).toBe(
      false,
    );
  });

  it('blocks a request whose end touches the order start', () => {
    // Same-day end/start: a request ending 05-10 still overlaps an order starting 05-10
    expect(windowsOverlapWithBuffer(orderStart, orderEnd, d('2026-05-08'), d('2026-05-10'))).toBe(
      true,
    );
  });

  it('blocks a request fully containing the order', () => {
    expect(windowsOverlapWithBuffer(orderStart, orderEnd, d('2026-05-01'), d('2026-05-30'))).toBe(
      true,
    );
  });

  it('blocks a request fully contained in the order', () => {
    expect(windowsOverlapWithBuffer(orderStart, orderEnd, d('2026-05-11'), d('2026-05-13'))).toBe(
      true,
    );
  });

  it('with a zero-day buffer, back-to-back rentals are allowed', () => {
    // Without a cleaning buffer, a request starting on the day after the order ends should be free.
    expect(
      windowsOverlapWithBuffer(orderStart, orderEnd, d('2026-05-15'), d('2026-05-17'), 0),
    ).toBe(false);
  });

  it('with a zero-day buffer, the day-of return still overlaps', () => {
    expect(
      windowsOverlapWithBuffer(orderStart, orderEnd, d('2026-05-14'), d('2026-05-17'), 0),
    ).toBe(true);
  });

  it('honours larger buffers (5 days) — unit is occupied longer', () => {
    // Order ends 05-14. With a 5-day buffer, the unit is occupied through 05-19
    // and free on 05-20.
    expect(
      windowsOverlapWithBuffer(orderStart, orderEnd, d('2026-05-18'), d('2026-05-22'), 5),
    ).toBe(true);
    expect(
      windowsOverlapWithBuffer(orderStart, orderEnd, d('2026-05-19'), d('2026-05-22'), 5),
    ).toBe(true);
    expect(
      windowsOverlapWithBuffer(orderStart, orderEnd, d('2026-05-20'), d('2026-05-22'), 5),
    ).toBe(false);
  });

  it('handles single-day rentals', () => {
    const singleDay = d('2026-06-01');
    // Order [06-01, 06-01], buffer 2 → free on 06-04.
    expect(windowsOverlapWithBuffer(singleDay, singleDay, d('2026-06-03'), d('2026-06-05'))).toBe(
      true,
    );
    expect(windowsOverlapWithBuffer(singleDay, singleDay, d('2026-06-04'), d('2026-06-05'))).toBe(
      false,
    );
  });
});
