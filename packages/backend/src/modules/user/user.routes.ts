import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { userService } from './user.service.js';
import { requireAuth } from '../../common/middleware/auth.middleware.js';
import { asAddressId } from '../../common/types/branded.js';

const updateProfileBody = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  phone: z.string().max(20).optional(),
  locale: z.enum(['en', 'fr', 'es']).optional(),
});

const createAddressBody = z.object({
  label: z.string().min(1).max(50),
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(1).max(100),
  postalCode: z.string().min(1).max(20),
  countryCode: z.string().length(2).optional(),
  instructions: z.string().max(500).optional(),
  isDefault: z.boolean().optional(),
});

const preHandler = [requireAuth];

export async function userRoutes(app: FastifyInstance): Promise<void> {
  // GET /users/me
  app.get(
    '/me',
    {
      schema: {
        tags: ['Users'],
        summary: 'Get current user profile',
        security: [{ bearerAuth: [] }],
      },
      preHandler,
    },
    async (request) => {
      const user = await userService.getProfile(request.user!.id);
      return {
        data: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          role: user.role,
          locale: user.locale,
          emailVerified: user.emailVerified,
          isGuest: user.isGuest,
          createdAt: user.createdAt,
        },
      };
    },
  );

  // PATCH /users/me
  app.patch(
    '/me',
    {
      schema: {
        tags: ['Users'],
        summary: 'Update current user profile',
        security: [{ bearerAuth: [] }],
      },
      preHandler,
    },
    async (request) => {
      const body = updateProfileBody.parse(request.body);
      const user = await userService.updateProfile(request.user!.id, body);
      return {
        data: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          locale: user.locale,
        },
      };
    },
  );

  // GET /users/me/addresses
  app.get(
    '/me/addresses',
    {
      schema: {
        tags: ['Users'],
        summary: 'List saved addresses',
        security: [{ bearerAuth: [] }],
      },
      preHandler,
    },
    async (request) => {
      const addresses = await userService.getAddresses(request.user!.id);
      return { data: addresses };
    },
  );

  // POST /users/me/addresses
  app.post(
    '/me/addresses',
    {
      schema: {
        tags: ['Users'],
        summary: 'Add a new address',
        security: [{ bearerAuth: [] }],
      },
      preHandler,
    },
    async (request, reply) => {
      const body = createAddressBody.parse(request.body);
      const address = await userService.createAddress(request.user!.id, body);
      return reply.status(201).send({ data: address });
    },
  );

  // PATCH /users/me/addresses/:id
  app.patch(
    '/me/addresses/:id',
    {
      schema: {
        tags: ['Users'],
        summary: 'Update an address',
        security: [{ bearerAuth: [] }],
        params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      },
      preHandler,
    },
    async (request) => {
      const { id } = request.params as { id: string };
      const body = createAddressBody.partial().parse(request.body);
      const address = await userService.updateAddress(asAddressId(id), request.user!.id, body);
      return { data: address };
    },
  );

  // GET /users/me/travel-log
  app.get(
    '/me/travel-log',
    {
      schema: {
        tags: ['Users'],
        summary: 'Current user travel log (trips, places, pieces, CO2)',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: { locale: { type: 'string', enum: ['en', 'fr', 'es'] } },
        },
      },
      preHandler,
    },
    async (request) => {
      const q = request.query as Record<string, string>;
      const locale = (q['locale'] ?? request.user?.locale ?? 'en') as 'en' | 'fr' | 'es';
      const log = await userService.getTravelLog(request.user!.id, locale);
      return { data: log };
    },
  );

  // DELETE /users/me/addresses/:id
  app.delete(
    '/me/addresses/:id',
    {
      schema: {
        tags: ['Users'],
        summary: 'Delete an address',
        security: [{ bearerAuth: [] }],
        params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      },
      preHandler,
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      await userService.deleteAddress(asAddressId(id), request.user!.id);
      return reply.status(204).send();
    },
  );
}
