import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { deliveryService } from './delivery.service.js';
import { DELIVERY_METHODS, getDeliveryFeeOutbound } from './delivery.config.js';
import { requireAuth, requireRole } from '../../common/middleware/auth.middleware.js';
import { asOrderId, asDeliveryId } from '../../common/types/branded.js';
import { parseDate } from '../../common/utils/date.js';
import type { DeliveryStatus, DeliveryMethod } from '@prisma/client';

const adminPreHandler = [requireAuth, requireRole('admin', 'super_admin')];

export async function deliveryRoutes(app: FastifyInstance): Promise<void> {
  // GET /delivery/methods — get all delivery methods with fees
  app.get(
    '/methods',
    {
      schema: {
        tags: ['Delivery'],
        summary: 'Get all available delivery methods with fees',
      },
    },
    async () => {
      const methods = DELIVERY_METHODS.map((m) => ({
        value: m.value,
        outboundFee: m.outboundFee,
        returnFee: m.returnFee,
        totalFee: m.totalFee,
      }));
      return { data: methods };
    },
  );

  // GET /delivery/fees — get delivery fees for a method
  app.get(
    '/fees',
    {
      schema: {
        tags: ['Delivery'],
        summary: 'Get delivery fees for a specific method',
        querystring: {
          type: 'object',
          properties: {
            method: {
              type: 'string',
              enum: ['personal', 'mondial_relay', 'chronopost', 'colissimo'],
            },
          },
        },
      },
    },
    async (request) => {
      const q = request.query as { method?: DeliveryMethod };
      const method = q.method ?? 'personal';
      const outboundFee = getDeliveryFeeOutbound(method);
      const config_ = (await import('../../config/index.js')).config.DELIVERY_METHODS[method];
      const totalFee = config_ ? config_.outbound + config_.return : 0;

      return { data: { method, outboundFee, returnFee: totalFee - outboundFee, totalFee } };
    },
  );

  // GET /delivery/methods/available — get available methods for city/date
  app.get(
    '/methods/available',
    {
      schema: {
        tags: ['Delivery'],
        summary: 'Get available delivery methods for a city and date',
        querystring: {
          type: 'object',
          properties: {
            city: { type: 'string', default: 'paris' },
            date: { type: 'string', description: 'YYYY-MM-DD' },
          },
        },
      },
    },
    async (request) => {
      const q = request.query as Record<string, string>;
      const city = q['city'] ?? 'paris';
      const date = q['date'] ? parseDate(q['date']) : new Date();
      const methods = await deliveryService.getAvailableMethods(city, date);
      return { data: methods };
    },
  );

  // GET /delivery/:orderId
  app.get(
    '/:orderId',
    {
      schema: {
        tags: ['Delivery'],
        summary: 'Get delivery status for an order',
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
      const deliveries = await deliveryService.getOrderDeliveries(asOrderId(orderId));
      return { data: deliveries };
    },
  );

  // PATCH /delivery/:id/status (admin)
  app.patch(
    '/:id/status',
    {
      schema: {
        tags: ['Delivery'],
        summary: 'Update delivery status (admin)',
        security: [{ bearerAuth: [] }],
        params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
        body: {
          type: 'object',
          required: ['status'],
          properties: {
            status: {
              type: 'string',
              enum: ['scheduled', 'picked_up', 'in_transit', 'delivered', 'failed'],
            },
          },
        },
      },
      preHandler: adminPreHandler,
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const { status } = z
        .object({
          status: z.enum(['scheduled', 'picked_up', 'in_transit', 'delivered', 'failed']),
        })
        .parse(request.body);

      const delivery = await deliveryService.updateStatus(
        asDeliveryId(id),
        status as DeliveryStatus,
      );
      return { data: delivery };
    },
  );
}
