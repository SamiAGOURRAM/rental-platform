import type { FastifyInstance } from 'fastify';
import { config } from '../../config/index.js';
import { DELIVERY_METHODS } from '../delivery/delivery.config.js';

export async function configRoutes(app: FastifyInstance): Promise<void> {
  // GET /config — public app configuration
  app.get(
    '/',
    {
      schema: {
        tags: ['Config'],
        summary: 'Get public app configuration',
      },
    },
    async () => {
      const deliveryMethods = DELIVERY_METHODS.map(
        (m: {
          value: string;
          labelKey: string;
          descriptionKey: string;
          outboundFee: number;
          returnFee: number;
          totalFee: number;
        }) => ({
          value: m.value,
          labelKey: m.labelKey,
          descriptionKey: m.descriptionKey,
          outboundFee: m.outboundFee,
          returnFee: m.returnFee,
          totalFee: m.totalFee,
        }),
      );

      return {
        data: {
          deliveryMethods,
          defaultCity: config.DEFAULT_CITY,
          defaultLocale: config.DEFAULT_LOCALE,
          currency: config.STRIPE_CURRENCY,
          mockPayment: config.USE_MOCK_PAYMENT,
        },
      };
    },
  );
}
