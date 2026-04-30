import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { paymentService } from './payment.service.js';
import { requireAuth } from '../../common/middleware/auth.middleware.js';
import { asOrderId } from '../../common/types/branded.js';
import { config } from '../../config/index.js';

export async function paymentRoutes(app: FastifyInstance): Promise<void> {
  // POST /payments/checkout
  app.post(
    '/checkout',
    {
      schema: {
        tags: ['Payments'],
        summary: 'Create Stripe Checkout session for an order',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['orderId'],
          properties: {
            orderId: { type: 'string' },
            successUrl: { type: 'string' },
            cancelUrl: { type: 'string' },
          },
        },
      },
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const body = z
        .object({
          orderId: z.string().uuid(),
          successUrl: z.string().url().optional(),
          cancelUrl: z.string().url().optional(),
        })
        .parse(request.body);

      const baseUrl = config.FRONTEND_URL;
      const successUrl = body.successUrl ?? `${baseUrl}/orders/${body.orderId}?payment=success`;
      const cancelUrl = body.cancelUrl ?? `${baseUrl}/checkout`;

      const result = await paymentService.createCheckoutSession(
        asOrderId(body.orderId),
        request.user!.locale,
        successUrl,
        cancelUrl,
      );

      if (!result.ok) {
        const err = result.error;
        if (err.type === 'ORDER_NOT_FOUND') {
          return reply
            .status(404)
            .send({ error: { code: 'NOT_FOUND', message: 'Order not found' } });
        }
        if (err.type === 'ALREADY_PAID') {
          return reply
            .status(409)
            .send({ error: { code: 'ALREADY_PAID', message: 'Order already paid' } });
        }
        return reply.status(500).send({ error: { code: 'SESSION_FAILED', message: err.reason } });
      }

      return reply.send({ data: result.value });
    },
  );

  // GET /payments/:orderId
  app.get(
    '/:orderId',
    {
      schema: {
        tags: ['Payments'],
        summary: 'Get payment status for an order',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: { orderId: { type: 'string' } },
          required: ['orderId'],
        },
      },
      preHandler: [requireAuth],
    },
    async (request) => {
      const { orderId } = request.params as { orderId: string };
      const payments = await paymentService.getOrderPayments(asOrderId(orderId));
      return { data: payments };
    },
  );

  // Success / cancel redirect pages
  app.get('/success', { schema: { hide: true } }, async (request, reply) => {
    const { orderId } = request.query as { orderId?: string };
    return reply.send({
      status: 'success',
      orderId,
      message: 'Payment successful! Your order is confirmed.',
    });
  });

  app.get('/cancel', { schema: { hide: true } }, async (request, reply) => {
    const { orderId } = request.query as { orderId?: string };
    return reply.send({ status: 'cancelled', orderId, message: 'Payment cancelled.' });
  });

  // POST /payments/webhook — registered in its own encapsulated scope so the raw body
  // content-type parser only applies here, leaving all other routes unaffected.
  app.register(async (webhookScope: FastifyInstance) => {
    webhookScope.addContentTypeParser(
      'application/json',
      { parseAs: 'buffer', bodyLimit: 10 * 1024 * 1024 },
      (_req, body, done) => done(null, body),
    );

    webhookScope.post(
      '/webhook',
      {
        schema: {
          tags: ['Payments'],
          summary: 'Stripe webhook endpoint (called by Stripe, not by frontend)',
        },
      },
      async (request: FastifyRequest, reply) => {
        const signature = request.headers['stripe-signature'] as string;
        if (!signature) {
          return reply.status(400).send({ error: { code: 'MISSING_SIGNATURE' } });
        }

        const payload = request.body as Buffer;
        await paymentService.handleWebhook(payload, signature);
        return reply.status(200).send({ received: true });
      },
    );
  });
}
