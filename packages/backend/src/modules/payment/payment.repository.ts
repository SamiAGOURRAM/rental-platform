import { prisma } from '../../config/database.js';
import type { Payment, PaymentStatus, PaymentType } from '@prisma/client';
import type { OrderId, PaymentId } from '../../common/types/branded.js';

export class PaymentRepository {
  async findByOrderId(orderId: OrderId): Promise<Payment[]> {
    return prisma.payment.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByIdempotencyKey(key: string): Promise<Payment | null> {
    return prisma.payment.findUnique({ where: { idempotencyKey: key } });
  }

  async findByStripeSessionId(sessionId: string): Promise<Payment | null> {
    return prisma.payment.findUnique({ where: { stripeSessionId: sessionId } });
  }

  async create(data: {
    orderId: OrderId;
    stripeSessionId?: string;
    stripePaymentIntent?: string;
    type: PaymentType;
    amount: number;
    currency: string;
    idempotencyKey: string;
  }): Promise<Payment> {
    return prisma.payment.create({ data });
  }

  async updateStatus(
    id: PaymentId | string,
    status: PaymentStatus,
    stripePaymentIntent?: string,
  ): Promise<Payment> {
    return prisma.payment.update({
      where: { id: id as string },
      data: { status, ...(stripePaymentIntent && { stripePaymentIntent }) },
    });
  }

  async updateBySessionId(
    sessionId: string,
    data: Partial<{ status: PaymentStatus; stripePaymentIntent: string | null }>,
  ): Promise<Payment | null> {
    return prisma.payment
      .update({
        where: { stripeSessionId: sessionId },
        data,
      })
      .catch(() => null);
  }

  async updateByPaymentIntentId(
    paymentIntentId: string,
    data: Partial<{ status: PaymentStatus }>,
  ): Promise<void> {
    await prisma.payment.updateMany({
      where: { stripePaymentIntent: paymentIntentId },
      data,
    });
  }

  async deleteByIdempotencyKey(key: string): Promise<void> {
    await prisma.payment.deleteMany({ where: { idempotencyKey: key } });
  }
}

export const paymentRepository = new PaymentRepository();
