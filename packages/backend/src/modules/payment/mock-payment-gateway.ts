import type { PaymentGateway } from './payment-gateway.interface.js';

function generateId(prefix: string): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = prefix + '_';
  for (let i = 0; i < 24; i++) id += chars[Math.floor(Math.random() * chars.length)]!;
  return id;
}

export class MockPaymentGateway implements PaymentGateway {
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
    const sessionId = generateId('cs_test');
    const paymentIntentId = generateId('pi_test');

    return {
      sessionId,
      url: `${params.successUrl}?session_id=${sessionId}&mock_payment_intent=${paymentIntentId}`,
    };
  }

  async retrieveSession(sessionId: string): Promise<{
    id: string;
    status: 'open' | 'complete' | 'expired';
    url: string | null;
    paymentIntentId: string | null;
  }> {
    return {
      id: sessionId,
      status: 'open',
      url: null,
      paymentIntentId: generateId('pi_test'),
    };
  }

  async createRefund(_params: {
    paymentIntentId: string;
    amount?: number;
    reason?: string;
    metadata?: Record<string, string>;
  }): Promise<{ id: string; status: string }> {
    return { id: generateId('re_test'), status: 'succeeded' };
  }
}
