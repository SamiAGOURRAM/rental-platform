import Stripe from 'stripe';
import { config } from '../../config/index.js';
import type { PaymentGateway } from './payment-gateway.interface.js';

export class StripePaymentGateway implements PaymentGateway {
  private stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(config.STRIPE_SECRET_KEY, {
      apiVersion: '2024-06-20',
      typescript: true,
    });
  }

  async createCheckoutSession(params: {
    orderId: string;
    orderNumber: string;
    itemsDescription: string;
    subtotal: number;
    deliveryFee: number;
    currency: string;
    locale: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ sessionId: string; url: string }> {
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price_data: {
          currency: params.currency,
          product_data: {
            name: `Rental Order ${params.orderNumber}`,
            description: params.itemsDescription,
            metadata: { orderId: params.orderId },
          },
          unit_amount: Math.round(params.subtotal * 100),
        },
        quantity: 1,
      },
    ];

    if (params.deliveryFee > 0) {
      lineItems.push({
        price_data: {
          currency: params.currency,
          product_data: { name: 'Delivery fee' },
          unit_amount: Math.round(params.deliveryFee * 100),
        },
        quantity: 1,
      });
    }

    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      locale: (params.locale === 'fr'
        ? 'fr'
        : params.locale === 'es'
          ? 'es'
          : 'en') as Stripe.Checkout.SessionCreateParams.Locale,
      line_items: lineItems,
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: { orderId: params.orderId },
      payment_intent_data: {
        metadata: { orderId: params.orderId },
      },
    });

    return { sessionId: session.id, url: session.url! };
  }

  async retrieveSession(sessionId: string): Promise<{
    id: string;
    status: 'open' | 'complete' | 'expired';
    url: string | null;
    paymentIntentId: string | null;
  }> {
    const session = await this.stripe.checkout.sessions.retrieve(sessionId);
    return {
      id: session.id,
      status: session.status as 'open' | 'complete' | 'expired',
      url: session.url,
      paymentIntentId: session.payment_intent as string | null,
    };
  }

  async createRefund(params: {
    paymentIntentId: string;
    amount?: number;
    reason?: string;
    metadata?: Record<string, string>;
  }): Promise<{ id: string; status: string }> {
    const refund = await this.stripe.refunds.create({
      payment_intent: params.paymentIntentId,
      ...(params.amount && { amount: Math.round(params.amount * 100) }),
      reason: (params.reason as Stripe.RefundCreateParams.Reason) ?? 'requested_by_customer',
      metadata: params.metadata,
    });
    return { id: refund.id, status: refund.status ?? 'succeeded' };
  }
}
