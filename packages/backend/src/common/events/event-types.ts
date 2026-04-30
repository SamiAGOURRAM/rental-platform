import type { UserId, ProductId, OrderId, PaymentId, DeliveryId } from '../types/branded.js';

export type DomainEvent =
  | {
      type: 'ORDER_CONFIRMED';
      payload: { orderId: OrderId; userId: UserId; itemIds: ProductId[] };
    }
  | {
      type: 'ORDER_CANCELLED';
      payload: { orderId: OrderId; userId: UserId; reason: string };
    }
  | {
      type: 'ORDER_COMPLETED';
      payload: { orderId: OrderId; userId: UserId };
    }
  | {
      type: 'PAYMENT_SUCCEEDED';
      payload: { orderId: OrderId; paymentId: PaymentId; amount: number };
    }
  | {
      type: 'PAYMENT_FAILED';
      payload: { orderId: OrderId; reason: string };
    }
  | {
      type: 'DELIVERY_SCHEDULED';
      payload: { orderId: OrderId; deliveryId: DeliveryId };
    }
  | {
      type: 'ORDER_DISPATCHED';
      payload: { orderId: OrderId };
    }
  | {
      type: 'DELIVERY_COMPLETED';
      payload: { orderId: OrderId; deliveryId: DeliveryId };
    }
  | {
      type: 'RETURN_RECEIVED';
      payload: { orderId: OrderId; itemIds: ProductId[] };
    }
  | {
      type: 'RETURN_INITIATED';
      payload: { orderId: OrderId };
    }
  | {
      type: 'INSPECTION_DONE';
      payload: {
        productId: ProductId;
        orderId: OrderId;
        damageFound: boolean;
        newCondition: string;
      };
    }
  | {
      type: 'PRODUCT_END_OF_LIFE';
      payload: { productId: ProductId; cycleCount: number };
    };

export type DomainEventType = DomainEvent['type'];
export type DomainEventPayload<T extends DomainEventType> = Extract<
  DomainEvent,
  { type: T }
>['payload'];
