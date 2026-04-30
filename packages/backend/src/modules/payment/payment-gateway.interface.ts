export interface PaymentGateway {
  createCheckoutSession(params: {
    orderId: string;
    orderNumber: string;
    itemsDescription: string;
    subtotal: number;
    deliveryFee: number;
    currency: string;
    locale: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ sessionId: string; url: string }>;

  retrieveSession(sessionId: string): Promise<{
    id: string;
    status: 'open' | 'complete' | 'expired';
    url: string | null;
    paymentIntentId: string | null;
  }>;

  createRefund(params: {
    paymentIntentId: string;
    amount?: number;
    reason?: string;
    metadata?: Record<string, string>;
  }): Promise<{ id: string; status: string }>;
}

export interface PaymentGatewayFactory {
  create(): PaymentGateway;
}
