import type {
  IDeliveryStrategy,
  DeliveryResult,
  TrackingInfo,
} from './delivery-strategy.interface.js';
import type { DeliveryDirection } from '@prisma/client';
import type { OrderId } from '../../../common/types/branded.js';

/**
 * Personal delivery strategy — used for Paris MVP.
 * Free of charge, manual tracking, Paris only.
 */
export class PersonalDeliveryStrategy implements IDeliveryStrategy {
  readonly method = 'personal' as const;

  canDeliver(city: string, _date: Date): boolean {
    return city.toLowerCase() === 'paris';
  }

  getFee(_direction: DeliveryDirection): number {
    return 0;
  }

  async schedule(
    orderId: OrderId,
    _direction: DeliveryDirection,
    scheduledAt: Date,
    _notes?: string,
  ): Promise<DeliveryResult> {
    // Personal delivery is manually tracked — no carrier integration
    return {
      trackingCode: `MANUAL-${orderId.slice(-6).toUpperCase()}`,
      carrier: 'personal',
      scheduledAt,
      fee: 0,
    };
  }

  async getTracking(_trackingCode: string): Promise<TrackingInfo | null> {
    // Manual tracking — admin updates status directly
    return null;
  }

  estimatedHours(): number {
    return 4; // Same-day delivery
  }
}

export const personalDeliveryStrategy = new PersonalDeliveryStrategy();
