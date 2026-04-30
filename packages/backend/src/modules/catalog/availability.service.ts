import { prisma } from '../../config/database.js';
import { getRedis } from '../../config/redis.js';
import type { ProductId } from '../../common/types/branded.js';
import type { DateRange } from '../../common/utils/date.js';

/** Days appended to rentalEnd for cleaning/inspection before a unit is available again */
export const CLEANING_BUFFER_DAYS = 2;

/** Active order statuses that "occupy" inventory */
const ACTIVE_ORDER_STATUSES = [
  'confirmed',
  'preparing',
  'out_for_delivery',
  'delivered',
  'active_rental',
  'return_initiated',
  'return_in_transit',
  'returned',
  'inspecting',
] as const;

/** Unit statuses that count as "part of saleable inventory" */
const SALEABLE_UNIT_STATUSES = [
  'available',
  'reserved',
  'rented',
  'in_cleaning',
  'in_inspection',
] as const;

/** Shift a request start earlier by the buffer, so orders whose cleaning window still covers
 * [reqStart, reqEnd] are detected as overlapping. */
export function reqStartWithBuffer(start: Date, bufferDays: number = CLEANING_BUFFER_DAYS): Date {
  const d = new Date(start);
  d.setUTCDate(d.getUTCDate() - bufferDays);
  return d;
}

/**
 * Pure overlap predicate. Returns true iff a unit reserved for [orderStart, orderEnd]
 * (with `bufferDays` of post-rental cleaning) is still occupied during the request window
 * [reqStart, reqEnd]. Same as the prisma filter used in availability queries.
 */
export function windowsOverlapWithBuffer(
  orderStart: Date,
  orderEnd: Date,
  reqStart: Date,
  reqEnd: Date,
  bufferDays: number = CLEANING_BUFFER_DAYS,
): boolean {
  const startThreshold = reqStartWithBuffer(reqStart, bufferDays);
  return orderStart.getTime() <= reqEnd.getTime() && orderEnd.getTime() >= startThreshold.getTime();
}

export interface ProductAvailability {
  productId: string;
  city: string;
  /** Total non-retired units in this city */
  totalUnits: number;
  /** Units available for the requested date window (after subtracting overlaps) */
  availableCount: number;
}

export class AvailabilityService {
  /**
   * For a given city and date range, returns availability per product.
   * If productIds is omitted, returns for every product with units in that city.
   */
  async getAvailabilityByProduct(
    city: string,
    dateRange: DateRange,
    productIds?: string[],
  ): Promise<Map<string, ProductAvailability>> {
    const startWithBuffer = reqStartWithBuffer(dateRange.start);

    // 1. Units per product in city
    const units = await prisma.inventoryUnit.findMany({
      where: {
        city,
        status: {
          in: SALEABLE_UNIT_STATUSES as unknown as (typeof SALEABLE_UNIT_STATUSES)[number][],
        },
        ...(productIds && productIds.length > 0 && { productId: { in: productIds } }),
      },
      select: { productId: true },
    });

    const unitCountByProduct = new Map<string, number>();
    for (const u of units) {
      unitCountByProduct.set(u.productId, (unitCountByProduct.get(u.productId) ?? 0) + 1);
    }

    // 2. Overlapping order items per product in city
    const overlaps = await prisma.orderItem.findMany({
      where: {
        ...(productIds && productIds.length > 0 && { productId: { in: productIds } }),
        city,
        order: {
          status: {
            in: ACTIVE_ORDER_STATUSES as unknown as (typeof ACTIVE_ORDER_STATUSES)[number][],
          },
          // [order.rentalStart, order.rentalEnd+buffer] overlaps [requested.start, requested.end+buffer]
          rentalStart: { lte: dateRange.end },
          rentalEnd: { gte: startWithBuffer },
        },
      },
      select: { productId: true, quantity: true },
    });

    const reservedByProduct = new Map<string, number>();
    for (const o of overlaps) {
      reservedByProduct.set(o.productId, (reservedByProduct.get(o.productId) ?? 0) + o.quantity);
    }

    const result = new Map<string, ProductAvailability>();
    for (const [pid, total] of unitCountByProduct.entries()) {
      const reserved = reservedByProduct.get(pid) ?? 0;
      result.set(pid, {
        productId: pid,
        city,
        totalUnits: total,
        availableCount: Math.max(0, total - reserved),
      });
    }
    return result;
  }

  /**
   * Check a specific set of (productId, quantity, city) line items for availability.
   */
  async checkLineItems(
    items: Array<{ productId: ProductId; quantity: number; city: string }>,
    dateRange: DateRange,
  ): Promise<{ ok: boolean; unavailable: Array<{ productId: string; reason: string }> }> {
    if (items.length === 0) return { ok: true, unavailable: [] };

    // Group by city for efficient querying
    const byCity = new Map<string, typeof items>();
    for (const it of items) {
      const arr = byCity.get(it.city) ?? [];
      arr.push(it);
      byCity.set(it.city, arr);
    }

    const unavailable: Array<{ productId: string; reason: string }> = [];

    for (const [city, cityItems] of byCity.entries()) {
      const ids = cityItems.map((i) => i.productId as unknown as string);
      const availability = await this.getAvailabilityByProduct(city, dateRange, ids);
      for (const it of cityItems) {
        const a = availability.get(it.productId as unknown as string);
        if (!a) {
          unavailable.push({ productId: it.productId, reason: `No inventory in ${city}` });
        } else if (a.availableCount < it.quantity) {
          unavailable.push({
            productId: it.productId,
            reason: `Only ${a.availableCount} available in ${city} for those dates (requested ${it.quantity})`,
          });
        }
      }
    }

    return { ok: unavailable.length === 0, unavailable };
  }

  /**
   * Allocate N specific inventory units for a product in a city over a date range.
   * Returns the unit IDs. Throws if insufficient availability.
   */
  async allocateUnits(
    productId: string,
    city: string,
    quantity: number,
    dateRange: DateRange,
    tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  ): Promise<string[]> {
    const startWithBuffer = reqStartWithBuffer(dateRange.start);

    // Find units that are not retired/donated and not already committed to overlapping orders.
    // A simpler approximation: pick oldest-created saleable units, and rely on the pre-check
    // having verified count. For concurrency we rely on the surrounding transaction.
    const units = await tx.inventoryUnit.findMany({
      where: {
        productId,
        city,
        status: {
          in: SALEABLE_UNIT_STATUSES as unknown as (typeof SALEABLE_UNIT_STATUSES)[number][],
        },
      },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });

    // Subtract units already allocated to overlapping orders
    const occupiedItems = await tx.orderItem.findMany({
      where: {
        productId,
        city,
        order: {
          status: {
            in: ACTIVE_ORDER_STATUSES as unknown as (typeof ACTIVE_ORDER_STATUSES)[number][],
          },
          rentalStart: { lte: dateRange.end },
          rentalEnd: { gte: startWithBuffer },
        },
      },
      select: { unitIds: true },
    });

    const occupiedUnitIds = new Set<string>();
    for (const item of occupiedItems) {
      if (Array.isArray(item.unitIds)) {
        for (const id of item.unitIds) {
          if (typeof id === 'string') occupiedUnitIds.add(id);
        }
      }
    }

    const free = units.filter((u) => !occupiedUnitIds.has(u.id)).slice(0, quantity);
    if (free.length < quantity) {
      throw new Error(
        `Insufficient units for ${productId} in ${city}: have ${free.length}, need ${quantity}`,
      );
    }
    return free.map((u) => u.id);
  }

  /** Invalidate availability cache for a city when inventory changes */
  async invalidateCache(city: string): Promise<void> {
    const redis = getRedis();
    const keys = await redis.keys(`availability:v2:${city}:*`);
    if (keys.length > 0) await redis.del(...keys);
  }
}

export const availabilityService = new AvailabilityService();
