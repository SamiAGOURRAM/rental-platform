import { describe, it, expect } from 'vitest';
import { applyTransition, findTransition } from './order-state-machine.js';
import type { TransitionActor, TransitionContext } from './order-state-machine.js';
import type { OrderId, UserId, ProductId } from '../../common/types/branded.js';

const adminActor: TransitionActor = {
  id: 'admin-id' as UserId,
  role: 'admin',
};

const customerActor: TransitionActor = {
  id: 'customer-id' as UserId,
  role: 'customer',
};

const ctx: TransitionContext = {
  orderId: 'order-id' as OrderId,
  userId: 'customer-id' as UserId,
  itemIds: ['product-id'] as ProductId[],
  previousStatus: 'pending_payment',
};

describe('OrderStateMachine', () => {
  describe('applyTransition', () => {
    it('confirms a pending_payment order (admin)', () => {
      const result = applyTransition('confirm', 'pending_payment', adminActor, ctx);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.newStatus).toBe('confirmed');
        expect(result.value.events[0]?.type).toBe('ORDER_CONFIRMED');
      }
    });

    it('rejects confirm from wrong status', () => {
      const result = applyTransition('confirm', 'confirmed', adminActor, ctx);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('INVALID_TRANSITION');
      }
    });

    it('rejects customer trying to confirm', () => {
      const result = applyTransition('confirm', 'pending_payment', customerActor, ctx);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe('UNAUTHORIZED');
      }
    });

    it('allows customer to cancel a confirmed order', () => {
      const result = applyTransition('cancel', 'confirmed', customerActor, {
        ...ctx,
        previousStatus: 'confirmed',
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.newStatus).toBe('cancelled');
        expect(result.value.events[0]?.type).toBe('ORDER_CANCELLED');
      }
    });

    it('rejects cancelling a delivered order', () => {
      const result = applyTransition('cancel', 'delivered', customerActor, ctx);
      expect(result.ok).toBe(false);
    });

    it('allows customer to initiate return from active_rental', () => {
      const result = applyTransition('initiateReturn', 'active_rental', customerActor, ctx);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.newStatus).toBe('return_initiated');
      }
    });

    it('completes full admin workflow: confirm → prepare → dispatch → markDelivered', () => {
      const statuses: Array<[string, string]> = [
        ['confirm', 'pending_payment'],
        ['prepare', 'confirmed'],
        ['dispatch', 'preparing'],
        ['markDelivered', 'out_for_delivery'],
      ];

      for (const [transition, fromStatus] of statuses) {
        const result = applyTransition(
          transition,
          fromStatus as Parameters<typeof applyTransition>[1],
          adminActor,
          ctx,
        );
        expect(result.ok).toBe(true);
      }
    });

    it('emits RETURN_RECEIVED when admin receives return', () => {
      const result = applyTransition('receiveReturn', 'return_in_transit', adminActor, {
        ...ctx,
        previousStatus: 'return_in_transit',
      });
      expect(result.ok).toBe(true);
      if (result.ok) {
        const event = result.value.events.find((e) => e.type === 'RETURN_RECEIVED');
        expect(event).toBeDefined();
      }
    });

    it('emits ORDER_COMPLETED on completion', () => {
      const result = applyTransition('complete', 'inspecting', adminActor, ctx);
      expect(result.ok).toBe(true);
      if (result.ok) {
        const event = result.value.events.find((e) => e.type === 'ORDER_COMPLETED');
        expect(event).toBeDefined();
      }
    });
  });

  describe('findTransition', () => {
    it('finds the transition name for a valid status change', () => {
      expect(findTransition('pending_payment', 'confirmed')).toBe('confirm');
      expect(findTransition('confirmed', 'preparing')).toBe('prepare');
      expect(findTransition('confirmed', 'cancelled')).toBe('cancel');
    });

    it('returns null for invalid status changes', () => {
      expect(findTransition('pending_payment', 'completed')).toBeNull();
      expect(findTransition('donated' as any, 'confirmed' as any)).toBeNull();
    });
  });
});
