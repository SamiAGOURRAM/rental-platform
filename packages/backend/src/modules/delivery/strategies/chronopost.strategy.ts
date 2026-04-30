import type {
  IDeliveryStrategy,
  DeliveryResult,
  TrackingInfo,
} from './delivery-strategy.interface.js';
import type { DeliveryDirection } from '@prisma/client';
import type { OrderId } from '../../../common/types/branded.js';

/**
 * Chronopost strategy — door-to-door, next business day.
 * Manual tracking for MVP. Carrier API integration is a future feature.
 *
 * TODO (future): Integrate Chronopost API for:
 *   - Label generation (Chrono18 / Chrono13 service)
 *   - Courier pickup scheduling
 *   - Real-time tracking via Chronopost tracking API
 */
export class ChronopostStrategy implements IDeliveryStrategy {
  readonly method = 'chronopost' as const;

  private readonly OUTBOUND_FEE = 9.9;
  private readonly RETURN_FEE = 9.9;

  canDeliver(_city: string, date: Date): boolean {
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 1);
    return date >= minDate;
  }

  getFee(direction: DeliveryDirection): number {
    return direction === 'outbound' ? this.OUTBOUND_FEE : this.RETURN_FEE;
  }

  async schedule(
    orderId: OrderId,
    direction: DeliveryDirection,
    scheduledAt: Date,
    _notes?: string,
  ): Promise<DeliveryResult> {
    const prefix = direction === 'outbound' ? 'CP-OUT' : 'CP-RET';
    return {
      trackingCode: `${prefix}-${orderId.slice(-8).toUpperCase()}`,
      carrier: 'chronopost',
      scheduledAt,
      fee: this.getFee(direction),
    };
  }

  async getTracking(_trackingCode: string): Promise<TrackingInfo | null> {
    // TODO: integrate Chronopost tracking API
    return null;
  }

  estimatedHours(): number {
    return 24; // Next business day
  }
}

export const chronopostStrategy = new ChronopostStrategy();
