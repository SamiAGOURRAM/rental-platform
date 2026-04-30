import { config } from '../../config/index.js';
import type { PaymentGateway, PaymentGatewayFactory } from './payment-gateway.interface.js';
import { StripePaymentGateway } from './stripe-payment-gateway.js';
import { MockPaymentGateway } from './mock-payment-gateway.js';

class PaymentGatewayFactoryImpl implements PaymentGatewayFactory {
  create(): PaymentGateway {
    if (config.USE_MOCK_PAYMENT) {
      return new MockPaymentGateway();
    }
    return new StripePaymentGateway();
  }
}

export const paymentGatewayFactory = new PaymentGatewayFactoryImpl();
