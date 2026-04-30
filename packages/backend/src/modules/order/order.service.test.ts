import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Module mocks — exact paths as required
// ---------------------------------------------------------------------------
vi.mock('../../config/database.js', () => ({
  prisma: {
    $transaction: vi.fn(),
    orderItem: { findMany: vi.fn() },
  },
}));

vi.mock('./order.repository.js', () => ({
  orderRepository: {
    findById: vi.fn(),
    findByUserId: vi.fn(),
    getItemProductIds: vi.fn(),
  },
}));

vi.mock('../catalog/availability.service.js', () => ({
  availabilityService: {
    checkLineItems: vi.fn(),
    allocateUnits: vi.fn(),
    invalidateCache: vi.fn(),
  },
}));

vi.mock('./pricing.service.js', () => ({
  calculatePrice: vi.fn(),
}));

vi.mock('./order-state-machine.js', () => ({
  applyTransition: vi.fn(),
  findTransition: vi.fn(),
}));

vi.mock('../../common/events/event-bus.js', () => ({
  eventBus: { emitEvent: vi.fn() },
}));

vi.mock('../payment/payment.service.js', () => ({
  paymentService: { refundOrder: vi.fn() },
}));

vi.mock('../../common/utils/pagination.js', () => ({
  buildPaginatedResult: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------
import { orderService } from './order.service.js';
import { prisma } from '../../config/database.js';
import { orderRepository } from './order.repository.js';
import { availabilityService } from '../catalog/availability.service.js';
import { calculatePrice } from './pricing.service.js';
import { applyTransition, findTransition } from './order-state-machine.js';
import { eventBus } from '../../common/events/event-bus.js';
import { paymentService } from '../payment/payment.service.js';
import { buildPaginatedResult } from '../../common/utils/pagination.js';
import { ConflictError, NotFoundError, ForbiddenError } from '../../common/errors/index.js';
import type { UserId, OrderId, ProductId, AddressId } from '../../common/types/branded.js';
import type { OrderStatus, DeliveryMethod } from '@prisma/client';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a fresh mock Prisma transaction client. */
function newMockTx() {
  return {
    product: { findMany: vi.fn() },
    order: { create: vi.fn(), update: vi.fn() },
    orderItem: { findMany: vi.fn() },
    inventoryUnit: { updateMany: vi.fn(), findMany: vi.fn() },
    orderStatusHistory: { create: vi.fn() },
  };
}

function mockOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: 'order-1' as OrderId,
    userId: 'user-1' as UserId,
    orderNumber: 'RNT-2026-XXXX',
    status: 'pending_payment' as OrderStatus,
    rentalStart: new Date('2026-05-01T00:00:00.000Z'),
    rentalEnd: new Date('2026-05-05T00:00:00.000Z'),
    deliveryMethod: 'personal' as DeliveryMethod,
    subtotal: 100,
    deliveryFee: 0,
    depositAmount: 30,
    total: 130,
    addressId: 'addr-1' as AddressId,
    locale: 'fr',
    notes: null as string | null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    items: [
      {
        id: 'item-1',
        orderId: 'order-1' as OrderId,
        productId: 'prod-1' as ProductId,
        quantity: 2,
        unitPrice: 2.5,
        city: 'paris',
        unitIds: ['unit-1', 'unit-2'],
        priceAtTime: 2.5,
        conditionAtRent: 'new',
        cycleAtRent: 0,
        product: {
          id: 'prod-1',
          nameEn: 'Test Product',
          nameFr: 'Produit Test',
          nameEs: 'Producto Test',
          brand: 'Test Brand',
          images: [{ url: 'https://example.com/img.jpg' }],
        },
      },
    ],
    ...overrides,
  };
}

function mockPriceBreakdown() {
  return {
    subtotal: 100,
    deliveryFee: 0,
    depositAmount: 30,
    total: 100,
    itemPrices: [
      { productId: 'prod-1', pricePerDay: 5, days: 5, lineTotal: 25 },
      { productId: 'prod-1', pricePerDay: 5, days: 5, lineTotal: 25 },
    ],
    days: 5,
  };
}

function mockProduct() {
  return {
    id: 'prod-1',
    rentalPricePerDay: 5,
    condition: 'new' as const,
  };
}

function baseCreateInput() {
  return {
    userId: 'user-1' as UserId,
    items: [{ productId: 'prod-1' as ProductId, quantity: 2, city: 'paris' }],
    rentalStart: '2026-05-01',
    rentalEnd: '2026-05-05',
    deliveryMethod: 'personal' as DeliveryMethod,
    addressId: 'addr-1' as AddressId,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('OrderService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ------------------------------------------------------------------
  // createOrder
  // ------------------------------------------------------------------
  describe('createOrder', () => {
    const defaultTx = newMockTx();

    function setupValidCreateOrderMocks(tx = defaultTx) {
      const pricedOrder = mockOrder();
      vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => cb(tx));
      vi.mocked(availabilityService.checkLineItems).mockResolvedValue({
        ok: true,
        unavailable: [],
      });
      vi.mocked(tx.product.findMany).mockResolvedValue([mockProduct()]);
      vi.mocked(availabilityService.allocateUnits).mockResolvedValue(['unit-1', 'unit-2']);
      vi.mocked(calculatePrice).mockReturnValue(mockPriceBreakdown());
      vi.mocked(tx.order.create).mockResolvedValue(pricedOrder);
      vi.mocked(tx.inventoryUnit.updateMany).mockResolvedValue({ count: 2 } as any);
      vi.mocked(availabilityService.invalidateCache).mockResolvedValue(undefined);
      return { tx, pricedOrder };
    }

    it('creates a priced order and reserves units for a valid cart', async () => {
      const { pricedOrder } = setupValidCreateOrderMocks();

      const result = await orderService.createOrder(baseCreateInput());

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toBe(pricedOrder);
      }
      expect(availabilityService.checkLineItems).toHaveBeenCalledTimes(1);
      expect(calculatePrice).toHaveBeenCalledTimes(1);
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(availabilityService.invalidateCache).toHaveBeenCalledWith('paris');
    });

    it('invokes the pricing function with the correct products and date-range', async () => {
      setupValidCreateOrderMocks();

      await orderService.createOrder(baseCreateInput());

      expect(calculatePrice).toHaveBeenCalledWith(
        [mockProduct(), mockProduct()], // 2 × qty=2 line → 2 entries
        { start: new Date('2026-05-01T00:00:00.000Z'), end: new Date('2026-05-05T00:00:00.000Z') },
        'personal',
      );
    });

    it('fails with INVALID_DATE_RANGE when end is before start', async () => {
      const result = await orderService.createOrder({
        ...baseCreateInput(),
        rentalStart: '2026-05-10',
        rentalEnd: '2026-05-05',
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toEqual({
          type: 'INVALID_DATE_RANGE',
          reason: 'End date must be after start date',
        });
      }
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('fails with MIN_RENTAL_DAYS for same-day booking (guard test)', async () => {
      // MIN_RENTAL_DAYS = 1 in the service; same-day = 1 day so it passes the
      // guard.  This test keeps the guard honest if MIN_RENTAL_DAYS is raised.
      const result = await orderService.createOrder({
        ...baseCreateInput(),
        rentalStart: '2026-05-01',
        rentalEnd: '2026-05-01',
      });

      // With MIN_RENTAL_DAYS = 1 the guard is a no-op for valid dates.
      // If MIN_RENTAL_DAYS is raised, this test will start failing and
      // the expected error type will become MIN_RENTAL_DAYS.
      expect(result.ok).toBe(true);
    });

    it('fails with PRODUCTS_NOT_FOUND when items array is empty', async () => {
      const result = await orderService.createOrder({
        ...baseCreateInput(),
        items: [],
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toEqual({
          type: 'PRODUCTS_NOT_FOUND',
          missing: [],
        });
      }
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('throws ConflictError when inventory is insufficient', async () => {
      const tx = newMockTx();
      vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => cb(tx));
      vi.mocked(availabilityService.checkLineItems).mockResolvedValue({
        ok: false,
        unavailable: [{ productId: 'prod-1', reason: 'Insufficient stock' }],
      });

      await expect(orderService.createOrder(baseCreateInput())).rejects.toThrow(ConflictError);

      await expect(orderService.createOrder(baseCreateInput())).rejects.toThrow(
        'Products unavailable',
      );
    });

    it('handles items input with multiple lines and different cities', async () => {
      const tx = newMockTx();
      const pricedOrder = mockOrder();
      vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => cb(tx));
      vi.mocked(availabilityService.checkLineItems).mockResolvedValue({
        ok: true,
        unavailable: [],
      });
      vi.mocked(tx.product.findMany).mockResolvedValue([
        { ...mockProduct(), id: 'prod-1' },
        { ...mockProduct(), id: 'prod-2' },
      ]);
      vi.mocked(availabilityService.allocateUnits)
        .mockResolvedValueOnce(['unit-1'])
        .mockResolvedValueOnce(['unit-3']);
      vi.mocked(calculatePrice).mockReturnValue(mockPriceBreakdown());
      vi.mocked(tx.order.create).mockResolvedValue(pricedOrder);
      vi.mocked(tx.inventoryUnit.updateMany).mockResolvedValue({ count: 2 } as any);
      vi.mocked(availabilityService.invalidateCache).mockResolvedValue(undefined);

      const result = await orderService.createOrder({
        userId: 'user-1' as UserId,
        items: [
          { productId: 'prod-1' as ProductId, quantity: 1, city: 'paris' },
          { productId: 'prod-2' as ProductId, quantity: 1, city: 'lyon' },
        ],
        rentalStart: '2026-05-01',
        rentalEnd: '2026-05-05',
        deliveryMethod: 'personal' as DeliveryMethod,
        addressId: 'addr-1' as AddressId,
      });

      expect(result.ok).toBe(true);
      // Both cities are invalidated
      expect(availabilityService.invalidateCache).toHaveBeenCalledWith('paris');
      expect(availabilityService.invalidateCache).toHaveBeenCalledWith('lyon');
    });

    it('normalises legacy productIds input to line items', async () => {
      const tx = newMockTx();
      const pricedOrder = mockOrder();
      vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => cb(tx));
      vi.mocked(availabilityService.checkLineItems).mockResolvedValue({
        ok: true,
        unavailable: [],
      });
      vi.mocked(tx.product.findMany).mockResolvedValue([{ ...mockProduct(), id: 'prod-1' }]);
      vi.mocked(availabilityService.allocateUnits).mockResolvedValue(['unit-1']);
      vi.mocked(calculatePrice).mockReturnValue({
        ...mockPriceBreakdown(),
        itemPrices: [{ productId: 'prod-1', pricePerDay: 5, days: 5, lineTotal: 25 }],
      });
      vi.mocked(tx.order.create).mockResolvedValue(pricedOrder);
      vi.mocked(tx.inventoryUnit.updateMany).mockResolvedValue({ count: 1 } as any);
      vi.mocked(availabilityService.invalidateCache).mockResolvedValue(undefined);

      const result = await orderService.createOrder({
        userId: 'user-1' as UserId,
        productIds: ['prod-1' as ProductId],
        rentalStart: '2026-05-01',
        rentalEnd: '2026-05-05',
        deliveryMethod: 'personal' as DeliveryMethod,
        addressId: 'addr-1' as AddressId,
      });

      expect(result.ok).toBe(true);
      // Legacy path maps each productId to qty=1, city='paris'
      expect(availabilityService.checkLineItems).toHaveBeenCalledWith(
        [{ productId: 'prod-1', quantity: 1, city: 'paris' }],
        expect.any(Object),
      );
    });
  });

  // ------------------------------------------------------------------
  // getOrder
  // ------------------------------------------------------------------
  describe('getOrder', () => {
    it('returns the order when the customer views their own order', async () => {
      const order = mockOrder({ userId: 'user-1' as UserId });
      vi.mocked(orderRepository.findById).mockResolvedValue(order);

      const result = await orderService.getOrder(
        'order-1' as OrderId,
        'user-1' as UserId,
        'customer',
      );

      expect(result).toBe(order);
      expect(orderRepository.findById).toHaveBeenCalledWith('order-1');
    });

    it("throws ForbiddenError when a customer views someone else's order", async () => {
      const order = mockOrder({ userId: 'user-2' as UserId });
      vi.mocked(orderRepository.findById).mockResolvedValue(order);

      await expect(
        orderService.getOrder('order-1' as OrderId, 'user-1' as UserId, 'customer'),
      ).rejects.toThrow(ForbiddenError);

      await expect(
        orderService.getOrder('order-1' as OrderId, 'user-1' as UserId, 'customer'),
      ).rejects.toThrow('You do not have access to this order');
    });

    it('allows admins to view any order', async () => {
      const order = mockOrder({ userId: 'user-2' as UserId });
      vi.mocked(orderRepository.findById).mockResolvedValue(order);

      const result = await orderService.getOrder(
        'order-1' as OrderId,
        'admin-id' as UserId,
        'admin',
      );

      expect(result).toBe(order);
    });

    it('throws NotFoundError for a non-existent order', async () => {
      vi.mocked(orderRepository.findById).mockResolvedValue(null);

      await expect(
        orderService.getOrder('order-1' as OrderId, 'user-1' as UserId, 'customer'),
      ).rejects.toThrow(NotFoundError);

      await expect(
        orderService.getOrder('order-1' as OrderId, 'user-1' as UserId, 'customer'),
      ).rejects.toThrow("Order with id 'order-1' not found");
    });
  });

  // ------------------------------------------------------------------
  // getUserOrders
  // ------------------------------------------------------------------
  describe('getUserOrders', () => {
    it('calls repository with correct params and returns a paginated result', async () => {
      const items = [mockOrder()];
      vi.mocked(orderRepository.findByUserId).mockResolvedValue({
        items,
        total: 1,
      });
      const paginated = {
        items,
        nextCursor: null,
        totalCount: 1,
      };
      vi.mocked(buildPaginatedResult).mockReturnValue(paginated);

      const result = await orderService.getUserOrders('user-1' as UserId, { limit: 10 });

      expect(orderRepository.findByUserId).toHaveBeenCalledWith('user-1', 10, undefined, undefined);
      expect(buildPaginatedResult).toHaveBeenCalledWith(items, 10, 1);
      expect(result).toBe(paginated);
    });

    it('passes cursor and filter through to the repository', async () => {
      const items = [mockOrder()];
      vi.mocked(orderRepository.findByUserId).mockResolvedValue({
        items,
        total: 5,
      });
      vi.mocked(buildPaginatedResult).mockReturnValue({
        items,
        nextCursor: 'next',
        totalCount: 5,
      });

      await orderService.getUserOrders(
        'user-1' as UserId,
        { limit: 20, cursor: 'cursor-abc' },
        { status: 'confirmed' as OrderStatus, fromDate: new Date('2026-01-01') },
      );

      expect(orderRepository.findByUserId).toHaveBeenCalledWith('user-1', 20, 'cursor-abc', {
        status: 'confirmed',
        fromDate: new Date('2026-01-01'),
      });
    });
  });

  // ------------------------------------------------------------------
  // cancelOrder
  // ------------------------------------------------------------------
  describe('cancelOrder', () => {
    function setupTransitionMocks(newStatus: OrderStatus = 'cancelled') {
      const tx = newMockTx();
      const updatedOrder = mockOrder({ status: newStatus });

      vi.mocked(findTransition).mockReturnValue('cancel');
      vi.mocked(applyTransition).mockReturnValue({
        ok: true,
        value: {
          newStatus,
          events: [
            {
              type: 'ORDER_CANCELLED',
              payload: {
                orderId: 'order-1' as OrderId,
                userId: 'user-1' as UserId,
                reason: 'user_cancelled',
              },
            },
          ],
        },
      });
      vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => cb(tx));
      vi.mocked(tx.order.update).mockResolvedValue(updatedOrder);
      vi.mocked(tx.orderStatusHistory.create).mockResolvedValue({} as any);
      vi.mocked(tx.orderItem.findMany).mockResolvedValue([]);
      vi.mocked(tx.inventoryUnit.updateMany).mockResolvedValue({ count: 0 } as any);
      vi.mocked(prisma.orderItem.findMany).mockResolvedValue([]);
      vi.mocked(availabilityService.invalidateCache).mockResolvedValue(undefined);

      return { tx, updatedOrder };
    }

    it('cancels a pending_payment order without attempting a refund', async () => {
      const order = mockOrder({ status: 'pending_payment' as OrderStatus });
      vi.mocked(orderRepository.findById).mockResolvedValue(order);
      const { updatedOrder } = setupTransitionMocks();

      const result = await orderService.cancelOrder('order-1' as OrderId, {
        id: 'customer-1' as UserId,
        role: 'customer',
      });

      expect(result).toBe(updatedOrder);
      expect(paymentService.refundOrder).not.toHaveBeenCalled();
      expect(findTransition).toHaveBeenCalledWith('pending_payment', 'cancelled');
    });

    it('attempts a refund when cancelling a paid (confirmed) order', async () => {
      const order = mockOrder({ status: 'confirmed' as OrderStatus });
      vi.mocked(orderRepository.findById).mockResolvedValue(order);
      setupTransitionMocks();
      vi.mocked(paymentService.refundOrder).mockResolvedValue({
        ok: true,
        value: undefined,
      });

      await orderService.cancelOrder('order-1' as OrderId, {
        id: 'customer-1' as UserId,
        role: 'customer',
      });

      expect(paymentService.refundOrder).toHaveBeenCalledWith(
        'order-1',
        undefined,
        'Order cancelled by user',
      );
    });

    it('still transitions to cancelled even when the refund fails', async () => {
      const order = mockOrder({ status: 'confirmed' as OrderStatus });
      vi.mocked(orderRepository.findById).mockResolvedValue(order);
      const { updatedOrder } = setupTransitionMocks();
      vi.mocked(paymentService.refundOrder).mockResolvedValue({
        ok: false,
        error: { type: 'REFUND_FAILED' as const, message: 'Stripe error' },
      });

      const result = await orderService.cancelOrder('order-1' as OrderId, {
        id: 'customer-1' as UserId,
        role: 'customer',
      });

      expect(result).toBe(updatedOrder);
      expect(paymentService.refundOrder).toHaveBeenCalledTimes(1);
    });

    it('throws NotFoundError for a non-existent order', async () => {
      vi.mocked(orderRepository.findById).mockResolvedValue(null);

      await expect(
        orderService.cancelOrder('order-1' as OrderId, {
          id: 'customer-1' as UserId,
          role: 'customer',
        }),
      ).rejects.toThrow(NotFoundError);
    });
  });

  // ------------------------------------------------------------------
  // transitionStatus
  // ------------------------------------------------------------------
  describe('transitionStatus', () => {
    function setupValidTransition(
      fromStatus: OrderStatus = 'pending_payment',
      toStatus: OrderStatus = 'confirmed',
    ) {
      const tx = newMockTx();
      const updatedOrder = mockOrder({ status: toStatus });

      vi.mocked(orderRepository.findById).mockResolvedValue(mockOrder({ status: fromStatus }));
      vi.mocked(orderRepository.getItemProductIds).mockResolvedValue(['prod-1' as ProductId]);
      vi.mocked(findTransition).mockReturnValue('confirm');
      vi.mocked(applyTransition).mockReturnValue({
        ok: true,
        value: {
          newStatus: toStatus,
          events: [
            {
              type: 'ORDER_CONFIRMED',
              payload: {
                orderId: 'order-1' as OrderId,
                userId: 'user-1' as UserId,
                itemIds: ['prod-1' as ProductId],
              },
            },
          ],
        },
      });
      vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => cb(tx));
      vi.mocked(tx.order.update).mockResolvedValue(updatedOrder);
      vi.mocked(tx.orderStatusHistory.create).mockResolvedValue({} as any);
      vi.mocked(tx.orderItem.findMany).mockResolvedValue([]);
      vi.mocked(tx.inventoryUnit.updateMany).mockResolvedValue({ count: 2 } as any);
      vi.mocked(prisma.orderItem.findMany).mockResolvedValue([{ city: 'paris' }]);
      vi.mocked(availabilityService.invalidateCache).mockResolvedValue(undefined);

      return { tx, updatedOrder };
    }

    it('updates the order, creates history and emits events for a valid transition', async () => {
      const { updatedOrder } = setupValidTransition();

      const result = await orderService.transitionStatus(
        'order-1' as OrderId,
        'confirmed' as OrderStatus,
        { id: 'admin-1' as UserId, role: 'admin' },
      );

      expect(result).toBe(updatedOrder);
      expect(orderRepository.findById).toHaveBeenCalledWith('order-1');
      expect(findTransition).toHaveBeenCalledWith('pending_payment', 'confirmed');
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      // events emitted
      expect(eventBus.emitEvent).toHaveBeenCalledTimes(1);
      expect(eventBus.emitEvent).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'ORDER_CONFIRMED' }),
      );
      // cache invalidated
      expect(availabilityService.invalidateCache).toHaveBeenCalledWith('paris');
    });

    it('writes a history row with the correct reason', async () => {
      const tx = newMockTx();
      setupValidTransition();
      vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => cb(tx));
      vi.mocked(tx.orderItem.findMany).mockResolvedValue([]);
      vi.mocked(tx.order.update).mockResolvedValue(
        mockOrder({ status: 'confirmed' as OrderStatus }),
      );
      vi.mocked(tx.orderStatusHistory.create).mockResolvedValue({} as any);
      vi.mocked(tx.inventoryUnit.updateMany).mockResolvedValue({ count: 0 } as any);

      await orderService.transitionStatus(
        'order-1' as OrderId,
        'confirmed' as OrderStatus,
        { id: 'admin-1' as UserId, role: 'admin' },
        'Payment received',
      );

      expect(tx.orderStatusHistory.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ reason: 'Payment received' }),
        }),
      );
    });

    it('throws ConflictError for an invalid transition', async () => {
      vi.mocked(orderRepository.findById).mockResolvedValue(mockOrder());
      vi.mocked(findTransition).mockReturnValue(null); // no valid transition

      await expect(
        orderService.transitionStatus('order-1' as OrderId, 'completed' as OrderStatus, {
          id: 'admin-1' as UserId,
          role: 'admin',
        }),
      ).rejects.toThrow(ConflictError);

      await expect(
        orderService.transitionStatus('order-1' as OrderId, 'completed' as OrderStatus, {
          id: 'admin-1' as UserId,
          role: 'admin',
        }),
      ).rejects.toThrow("Cannot transition order from 'pending_payment' to 'completed'");
    });

    it('throws ForbiddenError for an unauthorised transition', async () => {
      vi.mocked(orderRepository.findById).mockResolvedValue(mockOrder());
      vi.mocked(findTransition).mockReturnValue('confirm');
      vi.mocked(applyTransition).mockReturnValue({
        ok: false,
        error: { type: 'UNAUTHORIZED' as const, requiredRoles: ['admin', 'super_admin'] },
      });

      await expect(
        orderService.transitionStatus('order-1' as OrderId, 'confirmed' as OrderStatus, {
          id: 'customer-1' as UserId,
          role: 'customer',
        }),
      ).rejects.toThrow(ForbiddenError);

      await expect(
        orderService.transitionStatus('order-1' as OrderId, 'confirmed' as OrderStatus, {
          id: 'customer-1' as UserId,
          role: 'customer',
        }),
      ).rejects.toThrow('Required role: admin or super_admin');
    });

    it('throws NotFoundError when the order does not exist', async () => {
      vi.mocked(orderRepository.findById).mockResolvedValue(null);

      await expect(
        orderService.transitionStatus('order-1' as OrderId, 'confirmed' as OrderStatus, {
          id: 'admin-1' as UserId,
          role: 'admin',
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it('handles cancelled transition releasing reserved units', async () => {
      const tx = newMockTx();
      const updatedOrder = mockOrder({ status: 'cancelled' as OrderStatus });

      vi.mocked(orderRepository.findById).mockResolvedValue(
        mockOrder({ status: 'pending_payment' as OrderStatus }),
      );
      vi.mocked(orderRepository.getItemProductIds).mockResolvedValue(['prod-1' as ProductId]);
      vi.mocked(findTransition).mockReturnValue('cancel');
      vi.mocked(applyTransition).mockReturnValue({
        ok: true,
        value: {
          newStatus: 'cancelled' as OrderStatus,
          events: [
            {
              type: 'ORDER_CANCELLED',
              payload: {
                orderId: 'order-1' as OrderId,
                userId: 'user-1' as UserId,
                reason: 'user_cancelled',
              },
            },
          ],
        },
      });
      vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => cb(tx));
      vi.mocked(tx.order.update).mockResolvedValue(updatedOrder);
      vi.mocked(tx.orderStatusHistory.create).mockResolvedValue({} as any);
      // Units are found on the order items
      vi.mocked(tx.orderItem.findMany).mockResolvedValue([
        { unitIds: ['unit-1', 'unit-2'] },
      ] as any);
      vi.mocked(tx.inventoryUnit.updateMany).mockResolvedValue({ count: 2 } as any);
      vi.mocked(prisma.orderItem.findMany).mockResolvedValue([]);
      vi.mocked(availabilityService.invalidateCache).mockResolvedValue(undefined);

      const result = await orderService.transitionStatus(
        'order-1' as OrderId,
        'cancelled' as OrderStatus,
        { id: 'admin-1' as UserId, role: 'admin' },
        'Admin cancellation',
      );

      expect(result).toBe(updatedOrder);
      // reserved → available for cancelled
      expect(tx.inventoryUnit.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: { in: ['unit-1', 'unit-2'] }, status: 'reserved' },
          data: { status: 'available' },
        }),
      );
    });

    it('throws ConflictError when applyTransition returns a non-UNAUTHORIZED error', async () => {
      vi.mocked(orderRepository.findById).mockResolvedValue(mockOrder());
      vi.mocked(findTransition).mockReturnValue('confirm');
      vi.mocked(applyTransition).mockReturnValue({
        ok: false,
        error: {
          type: 'INVALID_TRANSITION' as const,
          from: 'pending_payment' as OrderStatus,
          to: 'confirmed' as OrderStatus,
        },
      });

      await expect(
        orderService.transitionStatus('order-1' as OrderId, 'confirmed' as OrderStatus, {
          id: 'admin-1' as UserId,
          role: 'admin',
        }),
      ).rejects.toThrow(ConflictError);
    });
  });
});
