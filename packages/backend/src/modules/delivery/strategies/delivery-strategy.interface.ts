import type { DeliveryMethod, DeliveryDirection } from '@prisma/client';
import type { OrderId } from '../../../common/types/branded.js';

export interface DeliveryResult {
  trackingCode: string | null;
  carrier: string | null;
  scheduledAt: Date;
  fee: number;
}

export interface TrackingInfo {
  status: string;
  location?: string;
  estimatedDelivery?: Date;
  events: Array<{ timestamp: Date; description: string }>;
}

export interface IDeliveryStrategy {
  readonly method: DeliveryMethod;

  /** Can this method deliver to the city on the given date? */
  canDeliver(city: string, date: Date): boolean;

  /** Fee for this direction (outbound or return) */
  getFee(direction: DeliveryDirection): number;

  /** Schedule a delivery — returns tracking details */
  schedule(
    orderId: OrderId,
    direction: DeliveryDirection,
    scheduledAt: Date,
    notes?: string,
  ): Promise<DeliveryResult>;

  /** Get tracking info from carrier (null if not supported) */
  getTracking(trackingCode: string): Promise<TrackingInfo | null>;

  /** Estimated delivery time in hours */
  estimatedHours(): number;
}
