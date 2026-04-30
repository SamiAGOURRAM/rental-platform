import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { catalogService } from './catalog.service.js';
import { optionalAuth } from '../../common/middleware/auth.middleware.js';
import { asProductId } from '../../common/types/branded.js';
import { normalizePagination } from '../../common/utils/pagination.js';
import { parseDate } from '../../common/utils/date.js';

const localeSchema = z.enum(['en', 'fr', 'es']).default('fr');

export async function catalogRoutes(app: FastifyInstance): Promise<void> {
  // GET /catalog/products
  app.get(
    '/products',
    {
      schema: {
        tags: ['Catalog'],
        summary: 'Browse products with optional date-based availability filtering',
        querystring: {
          type: 'object',
          properties: {
            city: { type: 'string', default: 'paris' },
            rentalStart: { type: 'string', description: 'YYYY-MM-DD' },
            rentalEnd: { type: 'string', description: 'YYYY-MM-DD' },
            categoryId: { type: 'string' },
            gender: { type: 'string', enum: ['men', 'women', 'unisex'] },
            season: { type: 'string' },
            size: { type: 'string' },
            brand: { type: 'string' },
            maxPricePerDay: { type: 'number' },
            q: { type: 'string', description: 'Free text search across name/brand/color/material' },
            locale: { type: 'string', enum: ['en', 'fr', 'es'], default: 'fr' },
            limit: { type: 'integer', default: 20, maximum: 50 },
            cursor: { type: 'string' },
          },
        },
      },
      preHandler: [optionalAuth],
    },
    async (request) => {
      const q = request.query as Record<string, string>;
      const locale = localeSchema.parse(q['locale'] ?? request.user?.locale ?? 'fr');

      const dateRange =
        q['rentalStart'] && q['rentalEnd']
          ? { start: parseDate(q['rentalStart']), end: parseDate(q['rentalEnd']) }
          : undefined;

      const result = await catalogService.searchProducts({
        city: q['city'],
        dateRange,
        categoryId: q['categoryId'],
        gender: q['gender'],
        season: q['season'],
        sizes: q['size'] ? [q['size']] : undefined,
        brands: q['brand'] ? [q['brand']] : undefined,
        maxPricePerDay: q['maxPricePerDay'] ? Number(q['maxPricePerDay']) : undefined,
        q: q['q'],
        locale,
        pagination: normalizePagination({ limit: Number(q['limit'] ?? 20), cursor: q['cursor'] }),
      });

      return { data: result };
    },
  );

  // GET /catalog/products/:id
  app.get(
    '/products/:id',
    {
      schema: {
        tags: ['Catalog'],
        summary: 'Get product details',
        params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
        querystring: {
          type: 'object',
          properties: { locale: { type: 'string', enum: ['en', 'fr', 'es'] } },
        },
      },
      preHandler: [optionalAuth],
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const q = request.query as Record<string, string>;
      const locale = localeSchema.parse(q['locale'] ?? request.user?.locale ?? 'fr');
      const product = await catalogService.getProduct(asProductId(id), locale);
      return { data: product };
    },
  );

  // GET /catalog/categories
  app.get(
    '/categories',
    {
      schema: {
        tags: ['Catalog'],
        summary: 'List all product categories',
        querystring: {
          type: 'object',
          properties: { locale: { type: 'string', enum: ['en', 'fr', 'es'] } },
        },
      },
    },
    async (request) => {
      const q = request.query as Record<string, string>;
      const locale = localeSchema.parse(q['locale'] ?? 'fr');
      const categories = await catalogService.getCategories(locale);
      return { data: categories };
    },
  );

  // GET /catalog/capsules
  app.get(
    '/capsules',
    {
      schema: {
        tags: ['Catalog'],
        summary: 'Browse pre-built capsule wardrobes',
        querystring: {
          type: 'object',
          properties: {
            season: { type: 'string' },
            gender: { type: 'string', enum: ['men', 'women', 'unisex'] },
            categoryType: { type: 'string' },
            locale: { type: 'string', enum: ['en', 'fr', 'es'] },
          },
        },
      },
    },
    async (request) => {
      const q = request.query as Record<string, string>;
      const locale = localeSchema.parse(q['locale'] ?? 'fr');
      const capsules = await catalogService.getCapsules({
        season: q['season'],
        gender: q['gender'],
        categoryType: q['categoryType'],
        locale,
      });
      return { data: capsules };
    },
  );

  // GET /catalog/capsules/:slug
  app.get(
    '/capsules/:slug',
    {
      schema: {
        tags: ['Catalog'],
        summary: 'Get capsule wardrobe details',
        params: { type: 'object', properties: { slug: { type: 'string' } }, required: ['slug'] },
      },
    },
    async (request) => {
      const { slug } = request.params as { slug: string };
      const q = request.query as Record<string, string>;
      const locale = localeSchema.parse(q['locale'] ?? 'fr');
      const capsule = await catalogService.getCapsule(slug, locale);
      return { data: capsule };
    },
  );

  // POST /catalog/availability
  app.post(
    '/availability',
    {
      schema: {
        tags: ['Catalog'],
        summary: 'Check real-time availability for a list of products over a date range',
        body: {
          type: 'object',
          required: ['productIds', 'rentalStart', 'rentalEnd'],
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  productId: { type: 'string' },
                  quantity: { type: 'integer' },
                  city: { type: 'string' },
                },
              },
            },
            rentalStart: { type: 'string' },
            rentalEnd: { type: 'string' },
          },
        },
      },
    },
    async (request) => {
      const body = z
        .object({
          items: z.array(
            z.object({
              productId: z.string().uuid(),
              quantity: z.number().int().positive(),
              city: z.string(),
            }),
          ),
          rentalStart: z.string(),
          rentalEnd: z.string(),
        })
        .parse(request.body);

      const result = await catalogService.checkAvailability(
        body.items.map((i) => ({
          productId: asProductId(i.productId),
          quantity: i.quantity,
          city: i.city,
        })),
        { start: parseDate(body.rentalStart), end: parseDate(body.rentalEnd) },
      );

      return { data: result };
    },
  );
}
