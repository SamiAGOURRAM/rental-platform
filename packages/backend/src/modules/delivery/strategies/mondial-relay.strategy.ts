import type {
  IDeliveryStrategy,
  DeliveryResult,
  TrackingInfo,
} from './delivery-strategy.interface.js';
import type { DeliveryDirection } from '@prisma/client';
import type { OrderId } from '../../../common/types/branded.js';

/**
 * Mondial Relay strategy — relay point pickup/dropoff.
 * Manual tracking for MVP. Carrier API integration is a future feature.
 *
 * TODO (future): Integrate Mondial Relay API for:
 *   - Finding nearest relay points by address
 *   - Label generation
 *   - Real-time tracking events
 */
export class MondialRelayStrategy implements IDeliveryStrategy {
  readonly method = 'mondial_relay' as const;

  // Fees: 4.50 EUR per direction
  private readonly FEE_PER_DIRECTION = 4.5;

  canDeliver(_city: string, date: Date): boolean {
    // Available across France — need 2 business days minimum
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 2);
    return date >= minDate;
  }

  getFee(_direction: DeliveryDirection): number {
    return this.FEE_PER_DIRECTION;
  }

  async schedule(
    orderId: OrderId,
    direction: DeliveryDirection,
    scheduledAt: Date,
    _notes?: string,
  ): Promise<DeliveryResult> {
    // MVP: manual parcel label generation, relay point selected at order creation
    const prefix = direction === 'outbound' ? 'MR-OUT' : 'MR-RET';
    return {
      trackingCode: `${prefix}-${orderId.slice(-8).toUpperCase()}`,
      carrier: 'mondial_relay',
      scheduledAt,
      fee: this.FEE_PER_DIRECTION,
    };
  }

  async getTracking(_trackingCode: string): Promise<TrackingInfo | null> {
    // TODO: integrate Mondial Relay tracking API
    return null;
  }

  estimatedHours(): number {
    return 48; // 2 business days
  }
}

export const mondialRelayStrategy = new MondialRelayStrategy();
