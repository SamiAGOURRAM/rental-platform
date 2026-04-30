import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DeliveryService } from './delivery.service.js';
import { deliveryRepository } from './delivery.repository.js';
import { personalDeliveryStrategy } from './strategies/personal-delivery.strategy.js';
import { mondialRelayStrategy } from './strategies/mondial-relay.strategy.js';
import { chronopostStrategy } from './strategies/chronopost.strategy.js';
import { orderRepository } from '../order/order.repository.js';
import type { Delivery, Order } from '@prisma/client';
import type { OrderWithItems } from '../order/order.repository.js';
import type { OrderId, DeliveryId } from '../../common/types/branded.js';

vi.mock('./delivery.repository.js', () => ({
  deliveryRepository: {
    findById: vi.fn(),
    create: vi.fn(),
    updateStatus: vi.fn(),
    findByOrderId: vi.fn(),
    findUpcoming: vi.fn(),
  },
}));

vi.mock('../order/order.repository.js', () => ({
  orderRepository: { findById: vi.fn() },
}));

vi.mock('./strategies/personal-delivery.strategy.js', () => ({
  personalDeliveryStrategy: {
    schedule: vi.fn(),
    getFee: vi.fn().mockReturnValue(0),
    canDeliver: vi.fn().mockReturnValue(true),
    estimatedHours: vi.fn().mockReturnValue(4),
  },
}));

vi.mock('./strategies/mondial-relay.strategy.js', () => ({
  mondialRelayStrategy: {
    schedule: vi.fn(),
    getFee: vi.fn().mockReturnValue(5),
    canDeliver: vi.fn().mockReturnValue(true),
    estimatedHours: vi.fn().mockReturnValue(48),
  },
}));

vi.mock('./strategies/chronopost.strategy.js', () => ({
  chronopostStrategy: {
    schedule: vi.fn(),
    getFee: vi.fn().mockReturnValue(10),
    canDeliver: vi.fn().mockReturnValue(true),
    estimatedHours: vi.fn().mockReturnValue(24),
  },
}));

const mockDelivery = (overrides: Partial<Delivery> = {}): Delivery =>
  ({
    id: 'd1',
    orderId: 'o1',
    type: 'personal' as const,
    direction: 'outbound' as const,
    status: 'scheduled' as const,
    trackingCode: null,
    carrier: null,
    scheduledAt: new Date('2026-06-01'),
    pickedUpAt: null,
    deliveredAt: null,
    fee: 0,
    notes: null,
    createdAt: new Date('2026-06-01'),
    updatedAt: new Date('2026-06-01'),
    ...overrides,
  }) as Delivery;

const mockOrder = (overrides: Record<string, any> = {}): any =>
  ({
    id: 'o1',
    userId: 'u1',
    addressId: 'a1',
    orderNumber: 'ORD-001',
    status: 'confirmed',
    rentalStart: new Date('2026-06-01'),
    rentalEnd: new Date('2026-06-15'),
    deliveryMethod: 'personal',
    subtotal: 100,
    deliveryFee: 0,
    depositAmount: 0,
    total: 100,
    currency: 'eur',
    carbonSavedKg: null,
    locale: 'fr',
    notes: null,
    createdAt: new Date('2026-06-01'),
    updatedAt: new Date('2026-06-01'),
    items: [],
    ...overrides,
  }) as Order & { items: unknown[] };

const orderId = 'o1' as OrderId;
const deliveryId = 'd1' as DeliveryId;

describe('DeliveryService', () => {
  let service: DeliveryService;

  beforeEach(() => {
    service = new DeliveryService();
    vi.clearAllMocks();
  });

  // ── scheduleDelivery ─────────────────────────────────────────

  describe('scheduleDelivery', () => {
    it('schedules a personal delivery', async () => {
      const order = mockOrder({ deliveryMethod: 'personal' });
      vi.mocked(orderRepository.findById).mockResolvedValue(order);
      vi.mocked(personalDeliveryStrategy.schedule).mockResolvedValue({
        trackingCode: 'PER-001',
        carrier: 'Personal',
        scheduledAt: new Date('2026-06-01'),
        fee: 0,
      });
      vi.mocked(deliveryRepository.create).mockResolvedValue(mockDelivery());

      await service.scheduleDelivery(orderId);

      expect(deliveryRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'personal',
          direction: 'outbound',
          status: 'scheduled',
          trackingCode: 'PER-001',
          carrier: 'Personal',
          fee: 0,
        }),
      );
    });

    it('schedules a mondial_relay delivery', async () => {
      const order = mockOrder({ deliveryMethod: 'mondial_relay' });
      vi.mocked(orderRepository.findById).mockResolvedValue(order);
      vi.mocked(mondialRelayStrategy.schedule).mockResolvedValue({
        trackingCode: 'MR-001',
        carrier: 'Mondial Relay',
        scheduledAt: new Date('2026-06-02'),
        fee: 5,
      });
      vi.mocked(deliveryRepository.create).mockResolvedValue(mockDelivery());

      await service.scheduleDelivery(orderId);

      expect(deliveryRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'mondial_relay',
          trackingCode: 'MR-001',
          carrier: 'Mondial Relay',
          fee: 5,
        }),
      );
    });

    it('schedules a chronopost delivery', async () => {
      const order = mockOrder({ deliveryMethod: 'chronopost' });
      vi.mocked(orderRepository.findById).mockResolvedValue(order);
      vi.mocked(chronopostStrategy.schedule).mockResolvedValue({
        trackingCode: 'CP-001',
        carrier: 'Chronopost',
        scheduledAt: new Date('2026-06-03'),
        fee: 10,
      });
      vi.mocked(deliveryRepository.create).mockResolvedValue(mockDelivery());

      await service.scheduleDelivery(orderId);

      expect(deliveryRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'chronopost',
          trackingCode: 'CP-001',
          carrier: 'Chronopost',
          fee: 10,
        }),
      );
    });

    it('throws NotFoundError when order does not exist', async () => {
      vi.mocked(orderRepository.findById).mockResolvedValue(null);

      await expect(service.scheduleDelivery(orderId)).rejects.toMatchObject({
        code: 'NOT_FOUND',
        statusCode: 404,
      });
    });
  });

  // ── scheduleReturn ───────────────────────────────────────────

  describe('scheduleReturn', () => {
    it('schedules a return delivery', async () => {
      const order = mockOrder({ deliveryMethod: 'personal' });
      vi.mocked(orderRepository.findById).mockResolvedValue(order);
      vi.mocked(personalDeliveryStrategy.schedule).mockResolvedValue({
        trackingCode: 'RET-001',
        carrier: 'Personal',
        scheduledAt: new Date('2026-06-15'),
        fee: 0,
      });
      vi.mocked(deliveryRepository.create).mockResolvedValue(
        mockDelivery({ direction: 'return' as const }),
      );

      await service.scheduleReturn(orderId);

      expect(deliveryRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          direction: 'return',
          trackingCode: 'RET-001',
        }),
      );
    });

    it('throws NotFoundError when order does not exist', async () => {
      vi.mocked(orderRepository.findById).mockResolvedValue(null);

      await expect(service.scheduleReturn(orderId)).rejects.toMatchObject({
        code: 'NOT_FOUND',
        statusCode: 404,
      });
    });
  });

  // ── updateStatus ─────────────────────────────────────────────

  describe('updateStatus', () => {
    it('sets pickedUpAt when status is picked_up', async () => {
      vi.mocked(deliveryRepository.findById).mockResolvedValue(mockDelivery());
      vi.mocked(deliveryRepository.updateStatus).mockResolvedValue(
        mockDelivery({ status: 'picked_up' as const }),
      );

      await service.updateStatus(deliveryId, 'picked_up');

      expect(deliveryRepository.updateStatus).toHaveBeenCalledWith(
        deliveryId,
        'picked_up',
        expect.objectContaining({ pickedUpAt: expect.any(Date) as Date }),
      );
    });

    it('sets deliveredAt when status is delivered', async () => {
      vi.mocked(deliveryRepository.findById).mockResolvedValue(mockDelivery());
      vi.mocked(deliveryRepository.updateStatus).mockResolvedValue(
        mockDelivery({ status: 'delivered' as const }),
      );

      await service.updateStatus(deliveryId, 'delivered');

      expect(deliveryRepository.updateStatus).toHaveBeenCalledWith(
        deliveryId,
        'delivered',
        expect.objectContaining({ deliveredAt: expect.any(Date) as Date }),
      );
    });

    it('sets neither timestamp for other statuses', async () => {
      vi.mocked(deliveryRepository.findById).mockResolvedValue(mockDelivery());
      vi.mocked(deliveryRepository.updateStatus).mockResolvedValue(
        mockDelivery({ status: 'in_transit' as const }),
      );

      await service.updateStatus(deliveryId, 'in_transit');

      expect(deliveryRepository.updateStatus).toHaveBeenCalledWith(deliveryId, 'in_transit', {});
    });

    it('throws NotFoundError when delivery does not exist', async () => {
      vi.mocked(deliveryRepository.findById).mockResolvedValue(null);

      await expect(service.updateStatus(deliveryId, 'picked_up')).rejects.toMatchObject({
        code: 'NOT_FOUND',
        statusCode: 404,
      });
    });
  });

  // ── getOrderDeliveries ───────────────────────────────────────

  describe('getOrderDeliveries', () => {
    it('delegates to repository findByOrderId', async () => {
      const deliveries = [mockDelivery(), mockDelivery({ id: 'd2' })];
      vi.mocked(deliveryRepository.findByOrderId).mockResolvedValue(deliveries);

      const result = await service.getOrderDeliveries(orderId);

      expect(result).toEqual(deliveries);
      expect(deliveryRepository.findByOrderId).toHaveBeenCalledWith(orderId);
    });
  });

  // ── getAvailableMethods ──────────────────────────────────────

  describe('getAvailableMethods', () => {
    it('returns all 4 methods with correct fees', async () => {
      vi.mocked(mondialRelayStrategy.getFee).mockReturnValue(5);
      vi.mocked(chronopostStrategy.getFee).mockReturnValue(10);
      vi.mocked(personalDeliveryStrategy.getFee).mockReturnValue(0);

      const methods = await service.getAvailableMethods('Paris', new Date('2026-06-01'));

      expect(methods).toHaveLength(4);
      // personal: 0 + 0 = 0
      expect(methods[0]).toMatchObject({ method: 'personal', fee: 0, available: true });
      // mondial_relay: 5 + 5 = 10
      expect(methods[1]).toMatchObject({ method: 'mondial_relay', fee: 10, available: true });
      // chronopost: 10 + 10 = 20
      expect(methods[2]).toMatchObject({ method: 'chronopost', fee: 20, available: true });
      // colissimo (mapped to mondialRelay): 5 + 5 = 10
      expect(methods[3]).toMatchObject({ method: 'colissimo', fee: 10, available: true });
    });

    it('returns available=false when canDeliver is false', async () => {
      vi.mocked(personalDeliveryStrategy.canDeliver).mockReturnValue(false);

      const methods = await service.getAvailableMethods('Remote', new Date('2026-06-01'));

      expect(methods[0]).toMatchObject({ method: 'personal', available: false });
    });
  });

  // ── getUpcomingDeliveries ────────────────────────────────────

  describe('getUpcomingDeliveries', () => {
    it('delegates with default limit 20', async () => {
      vi.mocked(deliveryRepository.findUpcoming).mockResolvedValue([]);

      await service.getUpcomingDeliveries();

      expect(deliveryRepository.findUpcoming).toHaveBeenCalledWith(20);
    });

    it('delegates with custom limit', async () => {
      vi.mocked(deliveryRepository.findUpcoming).mockResolvedValue([]);

      await service.getUpcomingDeliveries(5);

      expect(deliveryRepository.findUpcoming).toHaveBeenCalledWith(5);
    });
  });
});
