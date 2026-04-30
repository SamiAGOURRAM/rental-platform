import { emailChannel } from './channels/email.channel.js';
import { renderOrderConfirmed } from './templates/order-confirmed.js';
import { renderReturnReminder } from './templates/return-reminder.js';
import { renderOrderCancelled } from './templates/order-cancelled.js';
import { renderRentalCompleted } from './templates/rental-completed.js';
import { renderReturnReceived } from './templates/return-received.js';
import { renderOrderShipped } from './templates/order-shipped.js';
import { prisma } from '../../config/database.js';
import { notificationRepository } from './notification.repository.js';
import { asUserId } from '../../common/types/branded.js';
import type { OrderId } from '../../common/types/branded.js';
import type { NotificationType } from '@prisma/client';

type Locale = 'en' | 'fr' | 'es';

interface NotificationPayload {
  titleEn: string;
  titleFr: string;
  titleEs: string;
  bodyEn: string;
  bodyFr: string;
  bodyEs: string;
  link?: string;
}

export class NotificationService {
  // ─── In-app inbox API ────────────────────────────────────────

  async listForUser(
    userId: string,
    opts: { cursor?: string; limit?: number; unreadOnly?: boolean },
  ) {
    return notificationRepository.listByUser(
      asUserId(userId),
      opts.limit ?? 20,
      opts.cursor,
      opts.unreadOnly,
    );
  }

  async markAsRead(userId: string, id: string) {
    const result = await notificationRepository.markRead(id, asUserId(userId));
    if (!result) {
      throw new Error('NOT_FOUND');
    }
    return result;
  }

  async markAllAsRead(userId: string) {
    return notificationRepository.markAllRead(asUserId(userId));
  }

  async getUnreadCount(userId: string) {
    return notificationRepository.countUnread(asUserId(userId));
  }

  // ─── Persist + Email fan-out ─────────────────────────────────

  private async persistNotification(
    userId: string,
    type: NotificationType,
    payload: NotificationPayload,
  ) {
    return notificationRepository.create({
      userId,
      type,
      titleEn: payload.titleEn,
      titleFr: payload.titleFr,
      titleEs: payload.titleEs,
      bodyEn: payload.bodyEn,
      bodyFr: payload.bodyFr,
      bodyEs: payload.bodyEs,
      link: payload.link ?? null,
    });
  }

  private async fanOut(
    userId: string,
    type: NotificationType,
    payload: NotificationPayload,
    emailTask: () => Promise<void>,
  ) {
    const [persistResult, emailResult] = await Promise.allSettled([
      this.persistNotification(userId, type, payload),
      emailTask(),
    ]);

    if (persistResult.status === 'rejected') {
      console.error('[NotificationService] Persist failed:', persistResult.reason);
    }
    if (emailResult.status === 'rejected') {
      console.error('[NotificationService] Email failed:', emailResult.reason);
    }
  }

  // ─── Email-only helpers (private) ────────────────────────────

  private async emailOrderConfirmed(orderId: OrderId): Promise<void> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true, items: true },
    });
    if (!order) return;
    const locale = (order.locale ?? 'fr') as Locale;
    const rendered = renderOrderConfirmed(
      {
        orderNumber: order.orderNumber,
        customerName: `${order.user.firstName} ${order.user.lastName}`,
        rentalStart: order.rentalStart.toISOString().slice(0, 10),
        rentalEnd: order.rentalEnd.toISOString().slice(0, 10),
        totalAmount: Number(order.total),
        currency: order.currency,
        itemCount: order.items.length,
        deliveryMethod: order.deliveryMethod,
      },
      locale,
    );
    await emailChannel.sendEmail({ to: order.user.email, ...rendered });
  }

  private async emailReturnReminder(orderId: OrderId): Promise<void> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true },
    });
    if (!order) return;
    const locale = (order.locale ?? 'fr') as Locale;
    const rendered = renderReturnReminder(
      {
        orderNumber: order.orderNumber,
        customerName: `${order.user.firstName} ${order.user.lastName}`,
        rentalEnd: order.rentalEnd.toISOString().slice(0, 10),
        deliveryMethod: order.deliveryMethod,
      },
      locale,
    );
    await emailChannel.sendEmail({ to: order.user.email, ...rendered });
  }

  private async emailOrderShipped(orderId: OrderId): Promise<void> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true },
    });
    if (!order) return;
    const locale = (order.locale ?? 'fr') as Locale;
    const rendered = renderOrderShipped(
      {
        orderNumber: order.orderNumber,
        customerName: `${order.user.firstName} ${order.user.lastName}`,
        rentalStart: order.rentalStart.toISOString().slice(0, 10),
      },
      locale,
    );
    await emailChannel.sendEmail({ to: order.user.email, ...rendered });
  }

  private async emailOrderCancelled(orderId: OrderId): Promise<void> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true, payments: true },
    });
    if (!order) return;
    const locale = (order.locale ?? 'fr') as Locale;
    const refund = order.payments
      .filter((p) => p.type === 'refund' && p.status === 'succeeded')
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const rendered = renderOrderCancelled(
      {
        orderNumber: order.orderNumber,
        customerName: `${order.user.firstName} ${order.user.lastName}`,
        refundAmount: refund > 0 ? refund : undefined,
        currency: order.currency,
      },
      locale,
    );
    await emailChannel.sendEmail({ to: order.user.email, ...rendered });
  }

  private async emailReturnReceived(orderId: OrderId): Promise<void> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true },
    });
    if (!order) return;
    const locale = (order.locale ?? 'fr') as Locale;
    const rendered = renderReturnReceived(
      {
        orderNumber: order.orderNumber,
        customerName: `${order.user.firstName} ${order.user.lastName}`,
      },
      locale,
    );
    await emailChannel.sendEmail({ to: order.user.email, ...rendered });
  }

  private async emailRentalCompleted(orderId: OrderId): Promise<void> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true, carbonSaving: true },
    });
    if (!order) return;
    const locale = (order.locale ?? 'fr') as Locale;
    const carbonSavedKg = order.carbonSaving ? Number(order.carbonSaving.totalCo2Kg) : undefined;
    const rendered = renderRentalCompleted(
      {
        orderNumber: order.orderNumber,
        customerName: `${order.user.firstName} ${order.user.lastName}`,
        carbonSavedKg,
      },
      locale,
    );
    await emailChannel.sendEmail({ to: order.user.email, ...rendered });
  }

  // ─── Public notify* methods ──────────────────────────────────

  async notifyOrderConfirmed(orderId: OrderId): Promise<void> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true, items: true },
    });
    if (!order) return;

    const payload: NotificationPayload = {
      titleEn: 'Order Confirmed',
      titleFr: 'Commande confirmee',
      titleEs: 'Pedido confirmado',
      bodyEn: `Your order ${order.orderNumber} has been confirmed. ${order.items.length} items will be delivered by ${order.deliveryMethod}.`,
      bodyFr: `Votre commande ${order.orderNumber} a ete confirmee. ${order.items.length} articles seront livres par ${order.deliveryMethod}.`,
      bodyEs: `Su pedido ${order.orderNumber} ha sido confirmado. ${order.items.length} articulos seran entregados por ${order.deliveryMethod}.`,
      link: `/orders/${order.id}`,
    };

    await this.fanOut(order.userId, 'ORDER_CONFIRMED', payload, () =>
      this.emailOrderConfirmed(orderId),
    );
  }

  async notifyReturnReminder(orderId: OrderId): Promise<void> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true },
    });
    if (!order) return;

    const payload: NotificationPayload = {
      titleEn: 'Return Reminder',
      titleFr: 'Rappel de retour',
      titleEs: 'Recordatorio de devolucion',
      bodyEn: `Your rental for order ${order.orderNumber} ends on ${order.rentalEnd.toISOString().slice(0, 10)}. Please arrange your return via ${order.deliveryMethod}.`,
      bodyFr: `Votre location pour la commande ${order.orderNumber} se termine le ${order.rentalEnd.toISOString().slice(0, 10)}. Veuillez organiser votre retour via ${order.deliveryMethod}.`,
      bodyEs: `Su alquiler para el pedido ${order.orderNumber} finaliza el ${order.rentalEnd.toISOString().slice(0, 10)}. Organice su devolucion via ${order.deliveryMethod}.`,
      link: `/orders/${order.id}`,
    };

    await this.fanOut(order.userId, 'RETURN_REMINDER', payload, () =>
      this.emailReturnReminder(orderId),
    );
  }

  async notifyOrderShipped(orderId: OrderId): Promise<void> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true },
    });
    if (!order) return;

    const payload: NotificationPayload = {
      titleEn: 'Order Shipped',
      titleFr: 'Commande expediee',
      titleEs: 'Pedido enviado',
      bodyEn: `Your order ${order.orderNumber} is on the way! Delivery starts ${order.rentalStart.toISOString().slice(0, 10)}.`,
      bodyFr: `Votre commande ${order.orderNumber} est en route! La livraison commence le ${order.rentalStart.toISOString().slice(0, 10)}.`,
      bodyEs: `Su pedido ${order.orderNumber} esta en camino! La entrega comienza el ${order.rentalStart.toISOString().slice(0, 10)}.`,
      link: `/orders/${order.id}`,
    };

    await this.fanOut(order.userId, 'ORDER_SHIPPED', payload, () =>
      this.emailOrderShipped(orderId),
    );
  }

  async notifyOrderCancelled(orderId: OrderId): Promise<void> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true, payments: true },
    });
    if (!order) return;

    const refund = order.payments
      .filter((p) => p.type === 'refund' && p.status === 'succeeded')
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const payload: NotificationPayload = {
      titleEn: 'Order Cancelled',
      titleFr: 'Commande annulee',
      titleEs: 'Pedido cancelado',
      bodyEn: `Your order ${order.orderNumber} has been cancelled.${refund > 0 ? ` Refund of ${refund} ${order.currency} processed.` : ''}`,
      bodyFr: `Votre commande ${order.orderNumber} a ete annulee.${refund > 0 ? ` Remboursement de ${refund} ${order.currency} traite.` : ''}`,
      bodyEs: `Su pedido ${order.orderNumber} ha sido cancelado.${refund > 0 ? ` Reembolso de ${refund} ${order.currency} procesado.` : ''}`,
      link: `/orders/${order.id}`,
    };

    await this.fanOut(order.userId, 'ORDER_CANCELLED', payload, () =>
      this.emailOrderCancelled(orderId),
    );
  }

  async notifyReturnReceived(orderId: OrderId): Promise<void> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true },
    });
    if (!order) return;

    const payload: NotificationPayload = {
      titleEn: 'Return Received',
      titleFr: 'Retour recu',
      titleEs: 'Devolucion recibida',
      bodyEn: `We have received your return for order ${order.orderNumber}. Thank you!`,
      bodyFr: `Nous avons recu votre retour pour la commande ${order.orderNumber}. Merci!`,
      bodyEs: `Hemos recibido su devolucion para el pedido ${order.orderNumber}. Gracias!`,
      link: `/orders/${order.id}`,
    };

    await this.fanOut(order.userId, 'RETURN_RECEIVED', payload, () =>
      this.emailReturnReceived(orderId),
    );
  }

  async notifyRentalCompleted(orderId: OrderId): Promise<void> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true, carbonSaving: true },
    });
    if (!order) return;

    const carbonSavedKg = order.carbonSaving ? Number(order.carbonSaving.totalCo2Kg) : undefined;

    const payload: NotificationPayload = {
      titleEn: 'Rental Completed',
      titleFr: 'Location terminee',
      titleEs: 'Alquiler completado',
      bodyEn: `Your rental for order ${order.orderNumber} is complete.${carbonSavedKg ? ` You saved ${carbonSavedKg.toFixed(2)} kg of CO2.` : ''}`,
      bodyFr: `Votre location pour la commande ${order.orderNumber} est terminee.${carbonSavedKg ? ` Vous avez economise ${carbonSavedKg.toFixed(2)} kg de CO2.` : ''}`,
      bodyEs: `Su alquiler para el pedido ${order.orderNumber} esta completo.${carbonSavedKg ? ` Ahorro ${carbonSavedKg.toFixed(2)} kg de CO2.` : ''}`,
      link: `/orders/${order.id}`,
    };

    await this.fanOut(order.userId, 'RENTAL_COMPLETED', payload, () =>
      this.emailRentalCompleted(orderId),
    );
  }
}

export const notificationService = new NotificationService();
