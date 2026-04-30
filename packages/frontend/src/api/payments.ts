import { fetchApi } from './client';

export interface CheckoutSession {
  sessionId: string;
  url: string;
}

export function createCheckoutSession(
  orderId: string,
  successUrl: string,
  cancelUrl: string,
): Promise<CheckoutSession> {
  return fetchApi('/payments/checkout', {
    method: 'POST',
    body: JSON.stringify({ orderId, successUrl, cancelUrl }),
  });
}
