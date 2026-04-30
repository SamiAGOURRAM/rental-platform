import { emailChannel } from './channels/email.channel.js';
import { renderOrderConfirmed } from './templates/order-confirmed.js';
import { renderReturnReminder } from './templates/return-reminder.js';
import { renderOrderCancelled } from './templates/order-cancelled.js';
import { renderRentalCompleted } from './templates/rental-completed.js';
import { renderReturnReceived } from './templates/return-received.js';
import { renderOrderShipped } from './templates/order-shipped.js';
import { prisma } from '../../config/database.js';
import type { OrderId } from '../../common/types/branded.js';

type Locale = 'en' | 'fr' | 'es';

export class NotificationService {
  async sendOrderConfirmed(orderId: OrderId): Promise<void> {
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

    await emailChannel.sendEmail({
      to: order.user.email,
      ...rendered,
    });
  }

  async sendReturnReminder(orderId: OrderId): Promise<void> {
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

    await emailChannel.sendEmail({
      to: order.user.email,
      ...rendered,
    });
  }

  async sendOrderShipped(orderId: OrderId): Promise<void> {
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

  async sendOrderCancelled(orderId: OrderId): Promise<void> {
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

  async sendReturnReceived(orderId: OrderId): Promise<void> {
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

  async sendRentalCompleted(orderId: OrderId): Promise<void> {
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
}

export const notificationService = new NotificationService();
