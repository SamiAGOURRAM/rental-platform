import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { inventoryService } from './inventory.service.js';
import { uploadService } from './upload.service.js';
import { requireAuth, requireRole } from '../../common/middleware/auth.middleware.js';
import { asProductId, asOrderId } from '../../common/types/branded.js';
import { normalizePagination } from '../../common/utils/pagination.js';

const adminPreHandler = [requireAuth, requireRole('admin', 'super_admin')];

const createProductBody = z.object({
  categoryId: z.string().uuid(),
  sku: z.string().min(1).max(100),
  nameEn: z.string().min(1).max(200),
  nameFr: z.string().min(1).max(200),
  nameEs: z.string().min(1).max(200),
  descriptionEn: z.string(),
  descriptionFr: z.string(),
  descriptionEs: z.string(),
  brand: z.string().min(1).max(100),
  sizeEu: z.string().min(1).max(10),
  sizeUk: z.string().max(10).optional(),
  sizeUs: z.string().max(10).optional(),
  color: z.string().min(1).max(50),
  material: z.string().max(200).optional(),
  weightGrams: z.number().int().positive(),
  gender: z.enum(['men', 'women', 'unisex']),
  season: z.enum(['spring_summer', 'fall_winter', 'all_season']),
  condition: z.enum(['new', 'excellent', 'good', 'fair']).optional(),
  maxCycles: z.number().int().positive(),
  purchasePrice: z.number().positive(),
  rentalPricePerDay: z.number().positive(),
  source: z.enum(['vinted', 'wholesale', 'donated_in', 'direct_purchase']),
  city: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const inspectionBody = z.object({
  orderId: z.string().uuid(),
  damageFound: z.boolean(),
  notes: z.string().max(1000).optional(),
  conditionOverride: z.enum(['new', 'excellent', 'good', 'fair', 'end_of_life']).optional(),
});

export async function inventoryRoutes(app: FastifyInstance): Promise<void> {
  // GET /inventory (admin)
  app.get(
    '/',
    {
      schema: {
        tags: ['Inventory'],
        summary: 'List all products (admin)',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            city: { type: 'string' },
            categoryId: { type: 'string' },
            limit: { type: 'integer', default: 20 },
            cursor: { type: 'string' },
          },
        },
      },
      preHandler: adminPreHandler,
    },
    async (request) => {
      const query = request.query as Record<string, string>;
      const pagination = normalizePagination({
        limit: Number(query['limit'] ?? 20),
        cursor: query['cursor'],
      });
      const result = await inventoryService.listProducts(
        {
          status: query['status'] as Product['status'] | undefined,
          city: query['city'],
          categoryId: query['categoryId'],
        },
        pagination,
      );
      return { data: result };
    },
  );

  // POST /inventory (admin)
  app.post(
    '/',
    {
      schema: {
        tags: ['Inventory'],
        summary: 'Add a product to inventory (admin)',
        security: [{ bearerAuth: [] }],
      },
      preHandler: adminPreHandler,
    },
    async (request, reply) => {
      const body = createProductBody.parse(request.body);
      const product = await inventoryService.createProduct(
        {
          ...body,
          purchasePrice: body.purchasePrice,
          rentalPricePerDay: body.rentalPricePerDay,
          cycleCount: 0,
          metadata: body.metadata as Record<string, string> | undefined,
        },
        request.user!.id,
      );
      return reply.status(201).send({ data: product });
    },
  );

  // PATCH /inventory/:id (admin)
  app.patch(
    '/:id',
    {
      schema: {
        tags: ['Inventory'],
        summary: 'Update a product (admin)',
        security: [{ bearerAuth: [] }],
        params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      },
      preHandler: adminPreHandler,
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const { metadata, ...rest } = createProductBody.partial().parse(request.body);
      const product = await inventoryService.updateProduct(asProductId(id), {
        ...rest,
        metadata: metadata as Record<string, string> | undefined,
      });
      return { data: product };
    },
  );

  // POST /inventory/:id/inspect (admin)
  app.post(
    '/:id/inspect',
    {
      schema: {
        tags: ['Inventory'],
        summary: 'Record inspection result after return (admin)',
        security: [{ bearerAuth: [] }],
        params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      },
      preHandler: adminPreHandler,
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const body = inspectionBody.parse(request.body);
      const product = await inventoryService.recordInspection(
        asProductId(id),
        asOrderId(body.orderId),
        body,
        request.user!.id,
      );
      return { data: product };
    },
  );

  // POST /inventory/:id/clean (admin)
  app.post(
    '/:id/clean',
    {
      schema: {
        tags: ['Inventory'],
        summary: 'Mark product as cleaned — increments cycle and returns to available (admin)',
        security: [{ bearerAuth: [] }],
        params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      },
      preHandler: adminPreHandler,
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const product = await inventoryService.markCleaned(asProductId(id), request.user!.id);
      return { data: product };
    },
  );

  // POST /inventory/:id/donate (admin)
  app.post(
    '/:id/donate',
    {
      schema: {
        tags: ['Inventory'],
        summary: 'Mark a retired product as donated (admin)',
        security: [{ bearerAuth: [] }],
        params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      },
      preHandler: adminPreHandler,
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const product = await inventoryService.markDonated(asProductId(id), request.user!.id);
      return { data: product };
    },
  );

  // POST /inventory/uploads/image (admin) — multipart upload, returns hosted URL
  app.post(
    '/uploads/image',
    {
      schema: {
        tags: ['Inventory'],
        summary: 'Upload an image file (admin); returns a public URL',
        security: [{ bearerAuth: [] }],
        consumes: ['multipart/form-data'],
      },
      preHandler: adminPreHandler,
    },
    async (request, reply) => {
      const file = await request.file();
      if (!file) {
        return reply.status(400).send({ error: { message: 'No file uploaded' } });
      }
      const buffer = await file.toBuffer();
      try {
        const result = await uploadService.saveProductImage(buffer, file.mimetype, file.filename);
        return reply.status(201).send({ data: result });
      } catch (err) {
        return reply
          .status(400)
          .send({ error: { message: err instanceof Error ? err.message : 'Upload failed' } });
      }
    },
  );

  // POST /inventory/:id/images (admin)
  app.post(
    '/:id/images',
    {
      schema: {
        tags: ['Inventory'],
        summary: 'Add an image to a product (admin)',
        security: [{ bearerAuth: [] }],
        params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      },
      preHandler: adminPreHandler,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = z
        .object({
          url: z.string().url(),
          altText: z.string().optional(),
          sortOrder: z.number().int().optional(),
          isPrimary: z.boolean().optional(),
        })
        .parse(request.body);
      const image = await inventoryService.addImage(asProductId(id), body);
      return reply.status(201).send({ data: image });
    },
  );

  // GET /inventory/:id/units (admin) — list all physical units of a product
  app.get(
    '/:id/units',
    {
      schema: {
        tags: ['Inventory'],
        summary: 'List all inventory units for a product (admin)',
        security: [{ bearerAuth: [] }],
        params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      },
      preHandler: adminPreHandler,
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const units = await inventoryService.listUnits(asProductId(id));
      return { data: units };
    },
  );

  // POST /inventory/:id/units (admin) — restock: create N units in a city
  app.post(
    '/:id/units',
    {
      schema: {
        tags: ['Inventory'],
        summary: 'Add physical units to a product in a city (admin)',
        security: [{ bearerAuth: [] }],
        params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      },
      preHandler: adminPreHandler,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const body = z
        .object({
          city: z.string().min(1),
          quantity: z.number().int().positive().max(50),
        })
        .parse(request.body);
      const units = await inventoryService.addUnits(
        asProductId(id),
        body.city,
        body.quantity,
        request.user!.id,
      );
      return reply.status(201).send({ data: units });
    },
  );

  // POST /inventory/units/:unitId/clean (admin)
  app.post(
    '/units/:unitId/clean',
    {
      schema: {
        tags: ['Inventory'],
        summary: 'Mark a specific unit as cleaned → available (admin)',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: { unitId: { type: 'string' } },
          required: ['unitId'],
        },
      },
      preHandler: adminPreHandler,
    },
    async (request) => {
      const { unitId } = request.params as { unitId: string };
      const unit = await inventoryService.markUnitCleaned(unitId, request.user!.id);
      return { data: unit };
    },
  );

  // POST /inventory/units/:unitId/retire (admin)
  app.post(
    '/units/:unitId/retire',
    {
      schema: {
        tags: ['Inventory'],
        summary: 'Retire a specific unit (admin)',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: { unitId: { type: 'string' } },
          required: ['unitId'],
        },
      },
      preHandler: adminPreHandler,
    },
    async (request) => {
      const { unitId } = request.params as { unitId: string };
      const unit = await inventoryService.retireUnit(unitId, request.user!.id);
      return { data: unit };
    },
  );

  // POST /inventory/units/:unitId/donate (admin)
  app.post(
    '/units/:unitId/donate',
    {
      schema: {
        tags: ['Inventory'],
        summary: 'Donate a retired unit (admin)',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: { unitId: { type: 'string' } },
          required: ['unitId'],
        },
      },
      preHandler: adminPreHandler,
    },
    async (request) => {
      const { unitId } = request.params as { unitId: string };
      const unit = await inventoryService.donateUnit(unitId, request.user!.id);
      return { data: unit };
    },
  );

  // GET /inventory/:id/lifecycle (admin)
  app.get(
    '/:id/lifecycle',
    {
      schema: {
        tags: ['Inventory'],
        summary: 'Get product lifecycle log (admin)',
        security: [{ bearerAuth: [] }],
        params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      },
      preHandler: adminPreHandler,
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const { inventoryRepository } = await import('./inventory.repository.js');
      const log = await inventoryRepository.getLifecycleLog(asProductId(id));
      return { data: log };
    },
  );
}

// Type helper — avoids importing Product at top level
type Product = Awaited<ReturnType<typeof inventoryService.getProduct>>;
