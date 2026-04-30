import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../../common/middleware/auth.middleware.js';
import { notificationService } from './notification.service.js';
import { normalizePagination } from '../../common/utils/pagination.js';
import { buildPaginatedResult } from '../../common/utils/pagination.js';

export async function notificationRoutes(app: FastifyInstance): Promise<void> {
  // GET / — list notifications
  app.get(
    '/',
    {
      schema: {
        tags: ['Notifications'],
        summary: 'List user notifications',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            cursor: { type: 'string' },
            limit: { type: 'number' },
            unreadOnly: { type: 'boolean' },
          },
        },
      },
      preHandler: [requireAuth],
    },
    async (request) => {
      const userId = request.user!.id;
      const { cursor, limit, unreadOnly } = request.query as {
        cursor?: string;
        limit?: string | number;
        unreadOnly?: boolean | string;
      };

      const pagination = normalizePagination({
        cursor,
        limit: typeof limit === 'number' ? limit : limit ? parseInt(limit, 10) : undefined,
      });

      const unreadOnlyFlag = unreadOnly === true || unreadOnly === 'true';
      const { items, total } = await notificationService.listForUser(userId, {
        cursor: pagination.cursor,
        limit: pagination.limit,
        unreadOnly: unreadOnlyFlag,
      });

      return { data: buildPaginatedResult(items, pagination.limit, total) };
    },
  );

  // GET /unread-count
  app.get(
    '/unread-count',
    {
      schema: {
        tags: ['Notifications'],
        summary: 'Get unread notification count',
        security: [{ bearerAuth: [] }],
      },
      preHandler: [requireAuth],
    },
    async (request) => {
      const count = await notificationService.getUnreadCount(request.user!.id);
      return { data: { count } };
    },
  );

  // POST /:id/read
  app.post(
    '/:id/read',
    {
      schema: {
        tags: ['Notifications'],
        summary: 'Mark a notification as read',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: { id: { type: 'string' } },
          required: ['id'],
        },
      },
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const userId = request.user!.id;

      try {
        const result = await notificationService.markAsRead(userId, id);
        return reply.status(200).send({ data: result });
      } catch (err: any) {
        if (err.message === 'NOT_FOUND') {
          return reply
            .status(404)
            .send({ error: { code: 'NOT_FOUND', message: 'Notification not found' } });
        }
        throw err;
      }
    },
  );

  // POST /read-all
  app.post(
    '/read-all',
    {
      schema: {
        tags: ['Notifications'],
        summary: 'Mark all notifications as read',
        security: [{ bearerAuth: [] }],
      },
      preHandler: [requireAuth],
    },
    async (request) => {
      await notificationService.markAllAsRead(request.user!.id);
      return { data: { success: true } };
    },
  );
}
