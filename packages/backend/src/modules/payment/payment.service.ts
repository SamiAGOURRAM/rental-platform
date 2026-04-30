import { paymentGatewayFactory } from './payment-gateway.factory.js';
import { paymentRepository } from './payment.repository.js';
import { orderRepository } from '../order/order.repository.js';
import { eventBus } from '../../common/events/event-bus.js';
import { getRedis } from '../../config/redis.js';
import { config } from '../../config/index.js';
import { NotFoundError, ConflictError } from '../../common/errors/index.js';
import type { Result } from '../../common/types/result.js';
import { ok, fail } from '../../common/types/result.js';
import type { OrderId } from '../../common/types/branded.js';
import { asOrderId, asPaymentId } from '../../common/types/branded.js';

const WEBHOOK_IDEMPOTENCY_TTL = 86400;

export interface CheckoutSession {
  sessionId: string;
  url: string;
}

export type PaymentError =
  | { type: 'ORDER_NOT_FOUND' }
  | { type: 'ALREADY_PAID' }
  | { type: 'SESSION_CREATION_FAILED'; reason: string };

export class PaymentService {
  private get gateway() {
    return paymentGatewayFactory.create();
  }

  async createCheckoutSession(
    orderId: OrderId,
    locale: string,
    successUrl: string,
    cancelUrl: string,
  ): Promise<Result<CheckoutSession, PaymentError>> {
    const order = await orderRepository.findById(orderId);
    if (!order) return fail({ type: 'ORDER_NOT_FOUND' });

    if (order.status !== 'pending_payment') {
      return fail({ type: 'ALREADY_PAID' });
    }

    const idempotencyKey = `checkout:${orderId}`;
    const existingPayment = await paymentRepository.findByIdempotencyKey(idempotencyKey);

    if (existingPayment?.stripeSessionId) {
      try {
        const session = await this.gateway.retrieveSession(existingPayment.stripeSessionId);
        if (session.status === 'open' && session.url) {
          return ok({ sessionId: session.id, url: session.url });
        }
      } catch {
        // Session expired or invalid — will create a new one
      }
      // Session expired: delete old record so we can create a new one
      await paymentRepository.deleteByIdempotencyKey(idempotencyKey);
    }

    const itemsDescription = `${order.items.length} item(s) · ${formatDate(order.rentalStart)} → ${formatDate(order.rentalEnd)}`;

    try {
      const { sessionId, url } = await this.gateway.createCheckoutSession({
        orderId,
        orderNumber: order.orderNumber,
        itemsDescription,
        subtotal: Number(order.subtotal),
        deliveryFee: Number(order.deliveryFee),
        currency: config.STRIPE_CURRENCY,
        locale,
        successUrl,
        cancelUrl,
      });

      await paymentRepository.create({
        orderId,
        stripeSessionId: sessionId,
        type: 'rental',
        amount: Number(order.total),
        currency: config.STRIPE_CURRENCY,
        idempotencyKey,
      });

      if (config.USE_MOCK_PAYMENT) {
        await paymentRepository.updateBySessionId(sessionId, {
          status: 'succeeded',
          stripePaymentIntent: 'mock_pi_' + sessionId,
        });

        eventBus.emit('PAYMENT_SUCCEEDED', {
          orderId,
          paymentId: asPaymentId(orderId),
          amount: Number(order.total),
        });
      }

      return ok({ sessionId, url });
    } catch (err) {
      return fail({
        type: 'SESSION_CREATION_FAILED',
        reason: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  async handleWebhook(payload: Buffer, signature: string): Promise<void> {
    if (config.USE_MOCK_PAYMENT) {
      console.log('[Payment] Mock payment mode - skipping webhook signature verification');
      return;
    }

    let event: {
      type: string;
      id: string;
      data: {
        object: {
          id: string;
          metadata?: Record<string, string>;
          payment_intent?: string;
          status?: string;
        };
      };
    };

    try {
      const { stripe } = await import('./stripe.adapter.js');
      event = stripe.webhooks.constructEvent(
        payload,
        signature,
        config.STRIPE_WEBHOOK_SECRET,
      ) as unknown as typeof event;
    } catch {
      throw new ConflictError('Invalid webhook signature');
    }

    const redis = getRedis();
    const idempotencyKey = `stripe:webhook:${event.id}`;
    const alreadyProcessed = await redis.get(idempotencyKey);
    if (alreadyProcessed) return;

    await this.processStripeEvent(event);

    await redis.setex(idempotencyKey, WEBHOOK_IDEMPOTENCY_TTL, '1');
  }

  private async processStripeEvent(event: {
    type: string;
    id: string;
    data: { object: { id: string; metadata?: Record<string, string>; payment_intent?: string } };
  }): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const orderId = session.metadata?.['orderId'];
        if (!orderId) return;

        await paymentRepository.updateBySessionId(session.id, {
          status: 'succeeded',
          stripePaymentIntent: session.payment_intent ?? undefined,
        });

        const order = await orderRepository.findById(asOrderId(orderId));
        if (!order) return;

        eventBus.emit('PAYMENT_SUCCEEDED', {
          orderId: asOrderId(orderId),
          paymentId: asPaymentId(orderId),
          amount: Number(order.total),
        });
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object;
        const orderId = session.metadata?.['orderId'];
        if (!orderId) return;

        await paymentRepository.updateBySessionId(session.id, { status: 'failed' });

        eventBus.emit('PAYMENT_FAILED', {
          orderId: asOrderId(orderId),
          reason: event.type,
        });
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        const orderId = paymentIntent.metadata?.['orderId'];
        if (!orderId) return;

        await paymentRepository.updateByPaymentIntentId(paymentIntent.id, { status: 'failed' });

        eventBus.emit('PAYMENT_FAILED', {
          orderId: asOrderId(orderId),
          reason: event.type,
        });
        break;
      }
    }
  }

  async refundOrder(
    orderId: OrderId,
    amount?: number,
    reason?: string,
  ): Promise<Result<void, { type: 'NO_PAYMENT' | 'REFUND_FAILED'; message?: string }>> {
    const payments = await paymentRepository.findByOrderId(orderId);
    const rentalPayment = payments.find((p) => p.type === 'rental' && p.status === 'succeeded');

    if (!rentalPayment?.stripePaymentIntent) {
      return fail({ type: 'NO_PAYMENT' });
    }

    if (config.USE_MOCK_PAYMENT) {
      await paymentRepository.updateStatus(
        rentalPayment.id,
        amount ? 'partially_refunded' : 'refunded',
      );
      return ok(undefined);
    }

    try {
      await this.gateway.createRefund({
        paymentIntentId: rentalPayment.stripePaymentIntent,
        amount,
        reason,
        metadata: { orderId },
      });

      await paymentRepository.updateStatus(
        rentalPayment.id,
        amount ? 'partially_refunded' : 'refunded',
      );

      return ok(undefined);
    } catch (err) {
      return fail({
        type: 'REFUND_FAILED',
        message: err instanceof Error ? err.message : 'Refund failed',
      });
    }
  }

  async getOrderPayments(orderId: OrderId) {
    const order = await orderRepository.findById(orderId);
    if (!order) throw new NotFoundError('Order', orderId);
    return paymentRepository.findByOrderId(orderId);
  }
}

export const paymentService = new PaymentService();

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
