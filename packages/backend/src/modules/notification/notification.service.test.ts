import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationService } from './notification.service.js';
import { emailChannel } from './channels/email.channel.js';
import { prisma } from '../../config/database.js';
import { notificationRepository } from './notification.repository.js';
import { renderOrderConfirmed } from './templates/order-confirmed.js';
import { renderReturnReminder } from './templates/return-reminder.js';
import { renderOrderCancelled } from './templates/order-cancelled.js';
import { renderRentalCompleted } from './templates/rental-completed.js';
import { renderReturnReceived } from './templates/return-received.js';
import { renderOrderShipped } from './templates/order-shipped.js';

vi.mock('./channels/email.channel.js', () => ({
  emailChannel: { sendEmail: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('../../config/database.js', () => ({
  prisma: {
    order: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('./notification.repository.js', () => ({
  notificationRepository: {
    create: vi.fn().mockResolvedValue({ id: 'notif-1' }),
    listByUser: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    markRead: vi.fn().mockResolvedValue({ id: 'notif-1', readAt: new Date() }),
    markAllRead: vi.fn().mockResolvedValue(undefined),
    countUnread: vi.fn().mockResolvedValue(3),
  },
}));

vi.mock('./templates/order-confirmed.js', () => ({
  renderOrderConfirmed: vi
    .fn()
    .mockReturnValue({ subject: 'Confirmed', html: '<p>confirmed</p>', text: 'confirmed' }),
}));

vi.mock('./templates/return-reminder.js', () => ({
  renderReturnReminder: vi
    .fn()
    .mockReturnValue({ subject: 'Reminder', html: '<p>reminder</p>', text: 'reminder' }),
}));

vi.mock('./templates/order-cancelled.js', () => ({
  renderOrderCancelled: vi
    .fn()
    .mockReturnValue({ subject: 'Cancelled', html: '<p>cancelled</p>', text: 'cancelled' }),
}));

vi.mock('./templates/rental-completed.js', () => ({
  renderRentalCompleted: vi
    .fn()
    .mockReturnValue({ subject: 'Completed', html: '<p>completed</p>', text: 'completed' }),
}));

vi.mock('./templates/return-received.js', () => ({
  renderReturnReceived: vi
    .fn()
    .mockReturnValue({ subject: 'Received', html: '<p>received</p>', text: 'received' }),
}));

vi.mock('./templates/order-shipped.js', () => ({
  renderOrderShipped: vi
    .fn()
    .mockReturnValue({ subject: 'Shipped', html: '<p>shipped</p>', text: 'shipped' }),
}));

describe('NotificationService', () => {
  let service: NotificationService;
  const orderId = 'order-1';

  const mockOrder = (overrides: Record<string, unknown> = {}) => ({
    id: orderId,
    orderNumber: 'ORD-001',
    user: {
      email: 'alice@example.com',
      firstName: 'Alice',
      lastName: 'Dupont',
    },
    locale: 'fr',
    rentalStart: new Date('2026-06-01'),
    rentalEnd: new Date('2026-06-15'),
    total: 150,
    currency: 'eur',
    deliveryMethod: 'personal',
    items: [{ id: 'item-1' }],
    payments: [],
    carbonSaving: null,
    ...overrides,
  });

  beforeEach(() => {
    service = new NotificationService();
    vi.clearAllMocks();
  });

  // ── notifyOrderConfirmed ─────────────────────────────────────

  describe('notifyOrderConfirmed', () => {
    it('does not send email when order is not found', async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValue(null);

      await service.notifyOrderConfirmed(orderId as any);

      expect(emailChannel.sendEmail).not.toHaveBeenCalled();
      expect(notificationRepository.create).not.toHaveBeenCalled();
    });

    it('persists notification and sends email', async () => {
      const order = mockOrder({
        items: [{ id: 'i1' }, { id: 'i2' }],
        locale: 'en',
      });
      vi.mocked(prisma.order.findUnique).mockResolvedValue(order as any);

      await service.notifyOrderConfirmed(orderId as any);

      expect(renderOrderConfirmed).toHaveBeenCalledWith(
        {
          orderNumber: 'ORD-001',
          customerName: 'Alice Dupont',
          rentalStart: '2026-06-01',
          rentalEnd: '2026-06-15',
          totalAmount: 150,
          currency: 'eur',
          itemCount: 2,
          deliveryMethod: 'personal',
        },
        'en',
      );

      expect(emailChannel.sendEmail).toHaveBeenCalledWith({
        to: 'alice@example.com',
        subject: 'Confirmed',
        html: '<p>confirmed</p>',
        text: 'confirmed',
      });
    });

    it('falls back to fr locale when order.locale is missing', async () => {
      const order = mockOrder({ locale: undefined });
      vi.mocked(prisma.order.findUnique).mockResolvedValue(order as any);

      await service.notifyOrderConfirmed(orderId as any);

      expect(renderOrderConfirmed).toHaveBeenCalledWith(
        expect.objectContaining({ orderNumber: 'ORD-001' }),
        'fr',
      );
    });
  });

  // ── notifyReturnReminder ─────────────────────────────────────

  describe('notifyReturnReminder', () => {
    it('does not send email when order is not found', async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValue(null);

      await service.notifyReturnReminder(orderId as any);

      expect(emailChannel.sendEmail).not.toHaveBeenCalled();
      expect(notificationRepository.create).not.toHaveBeenCalled();
    });

    it('persists notification and sends email', async () => {
      const order = mockOrder();
      vi.mocked(prisma.order.findUnique).mockResolvedValue(order as any);

      await service.notifyReturnReminder(orderId as any);

      expect(renderReturnReminder).toHaveBeenCalledWith(
        {
          orderNumber: 'ORD-001',
          customerName: 'Alice Dupont',
          rentalEnd: '2026-06-15',
          deliveryMethod: 'personal',
        },
        'fr',
      );

      expect(emailChannel.sendEmail).toHaveBeenCalledWith({
        to: 'alice@example.com',
        subject: 'Reminder',
        html: '<p>reminder</p>',
        text: 'reminder',
      });
    });
  });

  // ── notifyOrderShipped ───────────────────────────────────────

  describe('notifyOrderShipped', () => {
    it('does not send email when order is not found', async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValue(null);

      await service.notifyOrderShipped(orderId as any);

      expect(emailChannel.sendEmail).not.toHaveBeenCalled();
      expect(notificationRepository.create).not.toHaveBeenCalled();
    });

    it('persists notification and sends email', async () => {
      const order = mockOrder();
      vi.mocked(prisma.order.findUnique).mockResolvedValue(order as any);

      await service.notifyOrderShipped(orderId as any);

      expect(renderOrderShipped).toHaveBeenCalledWith(
        {
          orderNumber: 'ORD-001',
          customerName: 'Alice Dupont',
          rentalStart: '2026-06-01',
        },
        'fr',
      );

      expect(emailChannel.sendEmail).toHaveBeenCalledWith({
        to: 'alice@example.com',
        subject: 'Shipped',
        html: '<p>shipped</p>',
        text: 'shipped',
      });
    });
  });

  // ── notifyOrderCancelled ─────────────────────────────────────

  describe('notifyOrderCancelled', () => {
    it('does not send email when order is not found', async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValue(null);

      await service.notifyOrderCancelled(orderId as any);

      expect(emailChannel.sendEmail).not.toHaveBeenCalled();
      expect(notificationRepository.create).not.toHaveBeenCalled();
    });

    it('sums refund payments and passes refundAmount to template', async () => {
      const order = mockOrder({
        payments: [
          { type: 'refund', status: 'succeeded', amount: 25 },
          { type: 'refund', status: 'succeeded', amount: 15 },
          { type: 'rental', status: 'succeeded', amount: 150 },
          { type: 'refund', status: 'pending', amount: 10 },
        ],
        currency: 'usd',
      });
      vi.mocked(prisma.order.findUnique).mockResolvedValue(order as any);

      await service.notifyOrderCancelled(orderId as any);

      expect(renderOrderCancelled).toHaveBeenCalledWith(
        {
          orderNumber: 'ORD-001',
          customerName: 'Alice Dupont',
          refundAmount: 40,
          currency: 'usd',
        },
        'fr',
      );

      expect(emailChannel.sendEmail).toHaveBeenCalledWith({
        to: 'alice@example.com',
        subject: 'Cancelled',
        html: '<p>cancelled</p>',
        text: 'cancelled',
      });
    });

    it('passes undefined refundAmount when no succeeded refund payments', async () => {
      const order = mockOrder({
        payments: [{ type: 'rental', status: 'succeeded', amount: 150 }],
      });
      vi.mocked(prisma.order.findUnique).mockResolvedValue(order as any);

      await service.notifyOrderCancelled(orderId as any);

      expect(renderOrderCancelled).toHaveBeenCalledWith(
        {
          orderNumber: 'ORD-001',
          customerName: 'Alice Dupont',
          refundAmount: undefined,
          currency: 'eur',
        },
        'fr',
      );
    });
  });

  // ── notifyReturnReceived ─────────────────────────────────────

  describe('notifyReturnReceived', () => {
    it('does not send email when order is not found', async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValue(null);

      await service.notifyReturnReceived(orderId as any);

      expect(emailChannel.sendEmail).not.toHaveBeenCalled();
      expect(notificationRepository.create).not.toHaveBeenCalled();
    });

    it('persists notification and sends email', async () => {
      const order = mockOrder();
      vi.mocked(prisma.order.findUnique).mockResolvedValue(order as any);

      await service.notifyReturnReceived(orderId as any);

      expect(renderReturnReceived).toHaveBeenCalledWith(
        {
          orderNumber: 'ORD-001',
          customerName: 'Alice Dupont',
        },
        'fr',
      );

      expect(emailChannel.sendEmail).toHaveBeenCalledWith({
        to: 'alice@example.com',
        subject: 'Received',
        html: '<p>received</p>',
        text: 'received',
      });
    });
  });

  // ── notifyRentalCompleted ────────────────────────────────────

  describe('notifyRentalCompleted', () => {
    it('does not send email when order is not found', async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValue(null);

      await service.notifyRentalCompleted(orderId as any);

      expect(emailChannel.sendEmail).not.toHaveBeenCalled();
      expect(notificationRepository.create).not.toHaveBeenCalled();
    });

    it('passes carbonSavedKg from carbonSaving.totalCo2Kg when present', async () => {
      const order = mockOrder({
        carbonSaving: { totalCo2Kg: 12.5, luggageCo2Kg: 8, reuseCo2Kg: 4.5 },
      });
      vi.mocked(prisma.order.findUnique).mockResolvedValue(order as any);

      await service.notifyRentalCompleted(orderId as any);

      expect(renderRentalCompleted).toHaveBeenCalledWith(
        {
          orderNumber: 'ORD-001',
          customerName: 'Alice Dupont',
          carbonSavedKg: 12.5,
        },
        'fr',
      );

      expect(emailChannel.sendEmail).toHaveBeenCalledWith({
        to: 'alice@example.com',
        subject: 'Completed',
        html: '<p>completed</p>',
        text: 'completed',
      });
    });

    it('passes undefined carbonSavedKg when carbonSaving is absent', async () => {
      const order = mockOrder({ carbonSaving: null });
      vi.mocked(prisma.order.findUnique).mockResolvedValue(order as any);

      await service.notifyRentalCompleted(orderId as any);

      expect(renderRentalCompleted).toHaveBeenCalledWith(
        {
          orderNumber: 'ORD-001',
          customerName: 'Alice Dupont',
          carbonSavedKg: undefined,
        },
        'fr',
      );
    });
  });

  // ── Inbox API ────────────────────────────────────────────────

  describe('listForUser', () => {
    it('delegates to repository with defaults', async () => {
      await service.listForUser('user-1', {});
      expect(notificationRepository.listByUser).toHaveBeenCalledWith(
        'user-1',
        20,
        undefined,
        undefined,
      );
    });

    it('passes options through', async () => {
      await service.listForUser('user-1', { cursor: 'c1', limit: 10, unreadOnly: true });
      expect(notificationRepository.listByUser).toHaveBeenCalledWith('user-1', 10, 'c1', true);
    });
  });

  describe('markAsRead', () => {
    it('returns the updated notification on success', async () => {
      const notif = { id: 'n1', readAt: new Date() };
      vi.mocked(notificationRepository.markRead).mockResolvedValue(notif as any);
      const result = await service.markAsRead('user-1', 'n1');
      expect(result).toBe(notif);
    });

    it('throws NOT_FOUND when notification does not exist or belongs to another user', async () => {
      vi.mocked(notificationRepository.markRead).mockResolvedValue(null);
      await expect(service.markAsRead('user-1', 'n1')).rejects.toThrow('NOT_FOUND');
    });
  });

  describe('markAllAsRead', () => {
    it('delegates to repository', async () => {
      await service.markAllAsRead('user-1');
      expect(notificationRepository.markAllRead).toHaveBeenCalledWith('user-1');
    });
  });

  describe('getUnreadCount', () => {
    it('returns the count from repository', async () => {
      vi.mocked(notificationRepository.countUnread).mockResolvedValue(5);
      const result = await service.getUnreadCount('user-1');
      expect(result).toBe(5);
    });
  });

  describe('fanOut', () => {
    it('persists even when email fails', async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValue(mockOrder() as any);
      vi.mocked(emailChannel.sendEmail).mockRejectedValue(new Error('SMTP down'));

      await service.notifyOrderConfirmed(orderId as any);

      expect(notificationRepository.create).toHaveBeenCalled();
    });

    it('emails even when persist fails', async () => {
      vi.mocked(prisma.order.findUnique).mockResolvedValue(mockOrder() as any);
      vi.mocked(notificationRepository.create).mockRejectedValue(new Error('DB down'));

      await service.notifyOrderConfirmed(orderId as any);

      expect(emailChannel.sendEmail).toHaveBeenCalled();
    });
  });
});
