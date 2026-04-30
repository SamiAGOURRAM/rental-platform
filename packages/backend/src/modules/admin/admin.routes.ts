import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth, requireRole } from '../../common/middleware/auth.middleware.js';
import { prisma } from '../../config/database.js';
import { orderService } from '../order/order.service.js';
import { deliveryService } from '../delivery/delivery.service.js';
import { asOrderId } from '../../common/types/branded.js';
import { normalizePagination } from '../../common/utils/pagination.js';
import { buildPaginatedResult } from '../../common/utils/pagination.js';
import type { OrderStatus } from '@prisma/client';

const adminPreHandler = [requireAuth, requireRole('admin', 'super_admin')];

export async function adminRoutes(app: FastifyInstance): Promise<void> {
  // GET /admin/dashboard
  app.get(
    '/dashboard',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Dashboard stats overview',
        security: [{ bearerAuth: [] }],
      },
      preHandler: adminPreHandler,
    },
    async () => {
      const [
        activeRentals,
        pendingOrders,
        totalRevenue,
        totalProducts,
        availableProducts,
        itemsDonated,
        upcomingDeliveries,
      ] = await Promise.all([
        prisma.order.count({ where: { status: 'active_rental' } }),
        prisma.order.count({ where: { status: { in: ['confirmed', 'preparing'] } } }),
        prisma.payment.aggregate({
          where: { status: 'succeeded', type: 'rental' },
          _sum: { amount: true },
        }),
        prisma.product.count({ where: { status: { not: 'donated' } } }),
        prisma.product.count({ where: { status: 'available' } }),
        prisma.product.count({ where: { status: 'donated' } }),
        deliveryService.getUpcomingDeliveries(5),
      ]);

      return {
        data: {
          activeRentals,
          pendingOrders,
          totalRevenueCents: Number(totalRevenue._sum.amount ?? 0),
          inventory: { total: totalProducts, available: availableProducts, donated: itemsDonated },
          upcomingDeliveries,
        },
      };
    },
  );

  // GET /admin/orders
  app.get(
    '/orders',
    {
      schema: {
        tags: ['Admin'],
        summary: 'List all orders with filtering (admin)',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            userId: { type: 'string' },
            limit: { type: 'integer', default: 20 },
            cursor: { type: 'string' },
          },
        },
      },
      preHandler: adminPreHandler,
    },
    async (request) => {
      const q = request.query as Record<string, string>;
      const pagination = normalizePagination({
        limit: Number(q['limit'] ?? 20),
        cursor: q['cursor'],
      });
      const { orderRepository } = await import('../order/order.repository.js');
      const { items, total } = await orderRepository.findAll(
        { status: q['status'] as OrderStatus | undefined, userId: q['userId'] },
        pagination.limit,
        pagination.cursor,
      );
      return { data: buildPaginatedResult(items, pagination.limit, total) };
    },
  );

  // PATCH /admin/orders/:id/status
  app.patch(
    '/orders/:id/status',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Transition order status (admin)',
        security: [{ bearerAuth: [] }],
        params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
        body: {
          type: 'object',
          required: ['status'],
          properties: {
            status: { type: 'string' },
            reason: { type: 'string' },
          },
        },
      },
      preHandler: adminPreHandler,
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const body = z
        .object({
          status: z.string(),
          reason: z.string().optional(),
        })
        .parse(request.body);

      const order = await orderService.transitionStatus(
        asOrderId(id),
        body.status as OrderStatus,
        request.user!,
        body.reason,
      );
      return { data: order };
    },
  );

  // GET /admin/customers
  app.get(
    '/customers',
    {
      schema: {
        tags: ['Admin'],
        summary: 'List customers with aggregate stats (admin)',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            q: { type: 'string', description: 'Search by email, first or last name' },
            limit: { type: 'integer', default: 25 },
            cursor: { type: 'string' },
          },
        },
      },
      preHandler: adminPreHandler,
    },
    async (request) => {
      const q = request.query as Record<string, string>;
      const pagination = normalizePagination({
        limit: Number(q['limit'] ?? 25),
        cursor: q['cursor'],
      });
      const search = (q['q'] ?? '').trim();

      const where = {
        deletedAt: null,
        ...(search.length > 0 && {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            { firstName: { contains: search, mode: 'insensitive' as const } },
            { lastName: { contains: search, mode: 'insensitive' as const } },
          ],
        }),
      };

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          take: pagination.limit + 1,
          ...(pagination.cursor && { skip: 1, cursor: { id: pagination.cursor } }),
          orderBy: { createdAt: 'desc' },
        }),
        prisma.user.count({ where }),
      ]);

      const ids = users.slice(0, pagination.limit).map((u) => u.id);
      const orderAgg = ids.length
        ? await prisma.order.groupBy({
            by: ['userId'],
            where: { userId: { in: ids } },
            _count: { _all: true },
            _sum: { total: true },
            _max: { createdAt: true },
          })
        : [];
      const byUser = new Map(orderAgg.map((r) => [r.userId, r]));

      const items = users.slice(0, pagination.limit).map((u) => {
        const stats = byUser.get(u.id);
        return {
          id: u.id,
          email: u.email,
          firstName: u.firstName,
          lastName: u.lastName,
          role: u.role,
          isGuest: u.isGuest,
          emailVerified: u.emailVerified,
          locale: u.locale,
          createdAt: u.createdAt,
          orderCount: stats?._count?._all ?? 0,
          totalSpentCents: Number(stats?._sum?.total ?? 0),
          lastOrderAt: stats?._max?.createdAt ?? null,
        };
      });

      return {
        data: buildPaginatedResult(
          items as Array<(typeof items)[number] & { id: string }>,
          pagination.limit,
          total,
        ),
      };
    },
  );

  // GET /admin/customers/:id
  app.get(
    '/customers/:id',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Customer detail with recent orders (admin)',
        security: [{ bearerAuth: [] }],
        params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      },
      preHandler: adminPreHandler,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) return reply.status(404).send({ error: { message: 'Customer not found' } });

      const [orders, totalOrders, addresses, spend] = await Promise.all([
        prisma.order.findMany({
          where: { userId: id },
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true,
            status: true,
            rentalStart: true,
            rentalEnd: true,
            total: true,
            createdAt: true,
          },
        }),
        prisma.order.count({ where: { userId: id } }),
        prisma.address.findMany({ where: { userId: id } }),
        prisma.order.aggregate({
          where: { userId: id },
          _sum: { total: true },
        }),
      ]);

      return {
        data: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          role: user.role,
          locale: user.locale,
          isGuest: user.isGuest,
          emailVerified: user.emailVerified,
          createdAt: user.createdAt,
          totalOrders,
          totalSpentCents: Number(spend._sum?.total ?? 0),
          addresses: addresses.map((a) => ({
            id: a.id,
            label: a.label,
            line1: a.line1,
            line2: a.line2,
            city: a.city,
            postalCode: a.postalCode,
            countryCode: a.countryCode,
          })),
          recentOrders: orders.map((o) => ({
            id: o.id,
            status: o.status,
            rentalStart: o.rentalStart,
            rentalEnd: o.rentalEnd,
            totalAmountCents: Number(o.total),
            createdAt: o.createdAt,
          })),
        },
      };
    },
  );

  // ─── Capsule CRUD ──────────────────────────────────────────
  const capsuleBody = z.object({
    slug: z
      .string()
      .min(1)
      .max(100)
      .regex(/^[a-z0-9-]+$/),
    nameEn: z.string().min(1),
    nameFr: z.string().min(1),
    nameEs: z.string().min(1),
    descriptionEn: z.string(),
    descriptionFr: z.string(),
    descriptionEs: z.string(),
    categoryType: z.enum(['beach', 'business', 'city', 'winter', 'wedding', 'casual']),
    season: z.enum(['spring_summer', 'fall_winter', 'all_season']),
    gender: z.enum(['men', 'women', 'unisex']),
    basePrice: z.number().nonnegative(),
    imageUrl: z.string().url().optional().nullable(),
    isActive: z.boolean().optional(),
    items: z
      .array(
        z.object({
          categoryId: z.string().uuid(),
          quantity: z.number().int().positive().default(1),
          isRequired: z.boolean().default(true),
        }),
      )
      .min(1),
  });

  // GET /admin/capsules — list all (active + inactive)
  app.get(
    '/capsules',
    {
      schema: {
        tags: ['Admin'],
        summary: 'List all capsule wardrobes (admin, incl. inactive)',
        security: [{ bearerAuth: [] }],
      },
      preHandler: adminPreHandler,
    },
    async () => {
      const items = await prisma.capsuleWardrobe.findMany({
        include: { items: { include: { category: true } } },
        orderBy: { createdAt: 'desc' },
      });
      return { data: items };
    },
  );

  // POST /admin/capsules
  app.post(
    '/capsules',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Create capsule wardrobe',
        security: [{ bearerAuth: [] }],
      },
      preHandler: adminPreHandler,
    },
    async (request, reply) => {
      const body = capsuleBody.parse(request.body);
      const capsule = await prisma.capsuleWardrobe.create({
        data: {
          slug: body.slug,
          nameEn: body.nameEn,
          nameFr: body.nameFr,
          nameEs: body.nameEs,
          descriptionEn: body.descriptionEn,
          descriptionFr: body.descriptionFr,
          descriptionEs: body.descriptionEs,
          categoryType: body.categoryType,
          season: body.season,
          gender: body.gender,
          basePrice: body.basePrice,
          imageUrl: body.imageUrl ?? null,
          isActive: body.isActive ?? true,
          items: { create: body.items },
        },
        include: { items: { include: { category: true } } },
      });
      return reply.status(201).send({ data: capsule });
    },
  );

  // PATCH /admin/capsules/:id
  app.patch(
    '/capsules/:id',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Update capsule wardrobe',
        security: [{ bearerAuth: [] }],
        params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      },
      preHandler: adminPreHandler,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = capsuleBody.partial().parse(request.body);

      const existing = await prisma.capsuleWardrobe.findUnique({ where: { id } });
      if (!existing) return reply.status(404).send({ error: { message: 'Capsule not found' } });

      const { items, ...rest } = body;

      const capsule = await prisma.$transaction(async (tx) => {
        const updated = await tx.capsuleWardrobe.update({
          where: { id },
          data: {
            ...rest,
            ...(rest.imageUrl !== undefined && { imageUrl: rest.imageUrl ?? null }),
          },
        });
        if (items) {
          await tx.capsuleWardrobeItem.deleteMany({ where: { capsuleId: id } });
          await tx.capsuleWardrobeItem.createMany({
            data: items.map((i) => ({ ...i, capsuleId: id })),
          });
        }
        return updated;
      });

      const full = await prisma.capsuleWardrobe.findUnique({
        where: { id: capsule.id },
        include: { items: { include: { category: true } } },
      });
      return { data: full };
    },
  );

  // DELETE /admin/capsules/:id — soft delete (isActive=false)
  app.delete(
    '/capsules/:id',
    {
      schema: {
        tags: ['Admin'],
        summary: 'Deactivate capsule wardrobe',
        security: [{ bearerAuth: [] }],
        params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      },
      preHandler: adminPreHandler,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      await prisma.capsuleWardrobe.update({ where: { id }, data: { isActive: false } });
      return reply.status(204).send();
    },
  );

  // GET /admin/deliveries
  app.get(
    '/deliveries',
    {
      schema: {
        tags: ['Admin'],
        summary: 'List upcoming deliveries (admin)',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: { limit: { type: 'integer', default: 20 } },
        },
      },
      preHandler: adminPreHandler,
    },
    async (request) => {
      const q = request.query as Record<string, string>;
      const deliveries = await deliveryService.getUpcomingDeliveries(Number(q['limit'] ?? 20));
      return { data: deliveries };
    },
  );
}
