import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { OrderStatus } from '@prisma/client';
import { orderService } from './order.service.js';
import { requireAuth } from '../../common/middleware/auth.middleware.js';
import { asOrderId, asProductId, asAddressId } from '../../common/types/branded.js';
import { normalizePagination } from '../../common/utils/pagination.js';
import { parseDate } from '../../common/utils/date.js';

const createOrderBody = z
  .object({
    // Preferred: explicit line items
    items: z
      .array(
        z.object({
          productId: z.string().uuid(),
          quantity: z.number().int().positive().max(10),
          city: z.string().min(1),
        }),
      )
      .min(1)
      .max(20)
      .optional(),
    // Legacy: flat product ID array
    productIds: z.array(z.string().uuid()).min(1).max(20).optional(),
    rentalStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
    rentalEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
    deliveryMethod: z.enum(['personal', 'mondial_relay', 'chronopost', 'colissimo']),
    addressId: z.string().uuid(),
    locale: z.enum(['en', 'fr', 'es']).optional(),
    notes: z.string().max(1000).optional(),
  })
  .refine((v) => (v.items && v.items.length > 0) || (v.productIds && v.productIds.length > 0), {
    message: 'Provide either items[] or productIds[]',
  });

const listOrdersQuery = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
  cursor: z.string().optional(),
  status: z.nativeEnum(OrderStatus).optional(),
  fromDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD')
    .optional(),
});

const preHandler = [requireAuth];

export async function orderRoutes(app: FastifyInstance): Promise<void> {
  // POST /orders
  app.post(
    '/',
    {
      schema: {
        tags: ['Orders'],
        summary: 'Create a new rental order',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['rentalStart', 'rentalEnd', 'deliveryMethod', 'addressId'],
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                required: ['productId', 'quantity', 'city'],
                properties: {
                  productId: { type: 'string' },
                  quantity: { type: 'integer', minimum: 1, maximum: 10 },
                  city: { type: 'string' },
                },
              },
            },
            productIds: { type: 'array', items: { type: 'string' } },
            rentalStart: { type: 'string', description: 'YYYY-MM-DD' },
            rentalEnd: { type: 'string', description: 'YYYY-MM-DD' },
            deliveryMethod: {
              type: 'string',
              enum: ['personal', 'mondial_relay', 'chronopost', 'colissimo'],
            },
            addressId: { type: 'string' },
            locale: { type: 'string', enum: ['en', 'fr', 'es'] },
            notes: { type: 'string' },
          },
        },
      },
      preHandler,
    },
    async (request, reply) => {
      const body = createOrderBody.parse(request.body);
      const result = await orderService.createOrder({
        userId: request.user!.id,
        items: body.items?.map((i) => ({
          productId: asProductId(i.productId),
          quantity: i.quantity,
          city: i.city,
        })),
        productIds: body.productIds?.map(asProductId),
        rentalStart: body.rentalStart,
        rentalEnd: body.rentalEnd,
        deliveryMethod: body.deliveryMethod,
        addressId: asAddressId(body.addressId),
        locale: body.locale ?? request.user?.locale ?? 'fr',
        notes: body.notes,
      });

      if (!result.ok) {
        const err = result.error;
        if (err.type === 'PRODUCT_UNAVAILABLE') {
          return reply.status(409).send({
            error: {
              code: 'PRODUCT_UNAVAILABLE',
              message: 'Some products are not available',
              details: err.unavailable,
            },
          });
        }
        if (err.type === 'INVALID_DATE_RANGE') {
          return reply.status(422).send({
            error: { code: 'INVALID_DATE_RANGE', message: err.reason },
          });
        }
        if (err.type === 'MIN_RENTAL_DAYS') {
          return reply.status(422).send({
            error: { code: 'MIN_RENTAL_DAYS', message: `Minimum rental is ${err.minimum} day(s)` },
          });
        }
        return reply
          .status(422)
          .send({ error: { code: 'ORDER_ERROR', message: 'Order creation failed' } });
      }

      return reply.status(201).send({ data: result.value });
    },
  );

  // GET /orders
  app.get(
    '/',
    {
      schema: {
        tags: ['Orders'],
        summary: 'List current user orders',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'integer', default: 20 },
            cursor: { type: 'string' },
            status: {
              type: 'string',
              enum: Object.values(OrderStatus),
            },
            fromDate: { type: 'string', description: 'YYYY-MM-DD (filters by creation date)' },
          },
        },
      },
      preHandler,
    },
    async (request) => {
      const q = listOrdersQuery.parse(request.query);
      const pagination = normalizePagination({ limit: q.limit ?? 20, cursor: q.cursor });
      const result = await orderService.getUserOrders(request.user!.id, pagination, {
        status: q.status,
        fromDate: q.fromDate ? parseDate(q.fromDate) : undefined,
      });
      return { data: result };
    },
  );

  // GET /orders/:id
  app.get(
    '/:id',
    {
      schema: {
        tags: ['Orders'],
        summary: 'Get order details',
        security: [{ bearerAuth: [] }],
        params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      },
      preHandler,
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const order = await orderService.getOrder(
        asOrderId(id),
        request.user!.id,
        request.user!.role,
      );
      return { data: order };
    },
  );

  // POST /orders/:id/cancel
  app.post(
    '/:id/cancel',
    {
      schema: {
        tags: ['Orders'],
        summary: 'Cancel an order (only before delivery)',
        security: [{ bearerAuth: [] }],
        params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      },
      preHandler,
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const order = await orderService.cancelOrder(asOrderId(id), request.user!);
      return { data: order };
    },
  );

  // POST /orders/:id/return
  app.post(
    '/:id/return',
    {
      schema: {
        tags: ['Orders'],
        summary: 'Initiate return of rental items',
        security: [{ bearerAuth: [] }],
        params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      },
      preHandler,
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const order = await orderService.initiateReturn(asOrderId(id), request.user!);
      return { data: order };
    },
  );
}
