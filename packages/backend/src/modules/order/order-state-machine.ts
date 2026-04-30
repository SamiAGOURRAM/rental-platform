import type { OrderStatus, UserRole } from '@prisma/client';
import type { DomainEvent } from '../../common/events/event-types.js';
import type { OrderId, UserId, ProductId } from '../../common/types/branded.js';
import { asDeliveryId } from '../../common/types/branded.js';
import type { Result } from '../../common/types/result.js';
import { ok, fail } from '../../common/types/result.js';

export interface TransitionActor {
  id: UserId;
  role: UserRole;
}

interface TransitionDefinition {
  from: OrderStatus[];
  to: OrderStatus;
  /** Roles permitted to trigger this transition */
  allowedRoles: UserRole[];
  /** Optional: events emitted after the transition */
  events?: (context: TransitionContext) => DomainEvent[];
}

export interface TransitionContext {
  orderId: OrderId;
  userId: UserId;
  itemIds: ProductId[];
  previousStatus: OrderStatus;
}

/** All valid transitions in the order state machine */
const TRANSITIONS: Record<string, TransitionDefinition> = {
  confirm: {
    from: ['pending_payment'],
    to: 'confirmed',
    allowedRoles: ['admin', 'super_admin'], // triggered by payment webhook (system/admin)
    events: (ctx) => [
      {
        type: 'ORDER_CONFIRMED',
        payload: { orderId: ctx.orderId, userId: ctx.userId, itemIds: ctx.itemIds },
      },
    ],
  },

  prepare: {
    from: ['confirmed'],
    to: 'preparing',
    allowedRoles: ['admin', 'super_admin'],
  },

  dispatch: {
    from: ['preparing'],
    to: 'out_for_delivery',
    allowedRoles: ['admin', 'super_admin'],
    events: (ctx) => [
      {
        type: 'ORDER_DISPATCHED',
        payload: { orderId: ctx.orderId },
      },
    ],
  },

  markDelivered: {
    from: ['out_for_delivery'],
    to: 'delivered',
    allowedRoles: ['admin', 'super_admin'],
    events: (ctx) => [
      {
        type: 'DELIVERY_COMPLETED',
        // deliveryId is resolved via the event handler from DB — use orderId as surrogate
        payload: { orderId: ctx.orderId, deliveryId: asDeliveryId(ctx.orderId) },
      },
    ],
  },

  activateRental: {
    from: ['delivered'],
    to: 'active_rental',
    allowedRoles: ['admin', 'super_admin'],
  },

  initiateReturn: {
    from: ['active_rental'],
    to: 'return_initiated',
    allowedRoles: ['customer', 'admin', 'super_admin'],
    events: (ctx) => [
      {
        type: 'RETURN_INITIATED',
        payload: { orderId: ctx.orderId },
      },
    ],
  },

  markReturnInTransit: {
    from: ['return_initiated'],
    to: 'return_in_transit',
    allowedRoles: ['admin', 'super_admin'],
  },

  receiveReturn: {
    from: ['return_in_transit'],
    to: 'returned',
    allowedRoles: ['admin', 'super_admin'],
    events: (ctx) => [
      {
        type: 'RETURN_RECEIVED',
        payload: { orderId: ctx.orderId, itemIds: ctx.itemIds },
      },
    ],
  },

  startInspection: {
    from: ['returned'],
    to: 'inspecting',
    allowedRoles: ['admin', 'super_admin'],
  },

  complete: {
    from: ['inspecting'],
    to: 'completed',
    allowedRoles: ['admin', 'super_admin'],
    events: (ctx) => [
      {
        type: 'ORDER_COMPLETED',
        payload: { orderId: ctx.orderId, userId: ctx.userId },
      },
    ],
  },

  cancel: {
    from: ['pending_payment', 'confirmed', 'preparing'],
    to: 'cancelled',
    allowedRoles: ['customer', 'admin', 'super_admin'],
    events: (ctx) => [
      {
        type: 'ORDER_CANCELLED',
        payload: { orderId: ctx.orderId, userId: ctx.userId, reason: 'user_cancelled' },
      },
    ],
  },

  refund: {
    from: ['cancelled'],
    to: 'refunded',
    allowedRoles: ['admin', 'super_admin'],
  },
};

export type TransitionError =
  | { type: 'INVALID_TRANSITION'; from: OrderStatus; to: OrderStatus }
  | { type: 'UNAUTHORIZED'; requiredRoles: UserRole[] };

/**
 * Validates and executes an order status transition.
 * Returns the events to emit and the new status if valid.
 */
export function applyTransition(
  transitionName: string,
  currentStatus: OrderStatus,
  actor: TransitionActor,
  context: TransitionContext,
): Result<{ newStatus: OrderStatus; events: DomainEvent[] }, TransitionError> {
  const definition = TRANSITIONS[transitionName];
  if (!definition) {
    return fail({ type: 'INVALID_TRANSITION', from: currentStatus, to: currentStatus });
  }

  if (!definition.from.includes(currentStatus)) {
    return fail({ type: 'INVALID_TRANSITION', from: currentStatus, to: definition.to });
  }

  if (!definition.allowedRoles.includes(actor.role)) {
    return fail({ type: 'UNAUTHORIZED', requiredRoles: definition.allowedRoles });
  }

  const events = definition.events ? definition.events(context) : [];
  return ok({ newStatus: definition.to, events });
}

/** Find which transition name moves between two statuses (for admin direct-set) */
export function findTransition(from: OrderStatus, to: OrderStatus): string | null {
  for (const [name, def] of Object.entries(TRANSITIONS)) {
    if (def.from.includes(from) && def.to === to) return name;
  }
  return null;
}

/** All statuses considered "active" (block inventory availability) */
export const ACTIVE_STATUSES: OrderStatus[] = [
  'confirmed',
  'preparing',
  'out_for_delivery',
  'delivered',
  'active_rental',
  'return_initiated',
  'return_in_transit',
  'returned',
  'inspecting',
];
