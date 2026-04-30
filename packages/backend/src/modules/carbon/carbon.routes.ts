import type { FastifyInstance } from 'fastify';
import { carbonService } from './carbon.service.js';
import { requireAuth } from '../../common/middleware/auth.middleware.js';

export async function carbonRoutes(app: FastifyInstance): Promise<void> {
  // GET /carbon/platform (public)
  app.get(
    '/platform',
    {
      schema: {
        tags: ['Carbon'],
        summary: 'Platform-wide carbon impact stats (public)',
      },
    },
    async () => {
      const stats = await carbonService.getPlatformStats();
      return { data: stats };
    },
  );

  // GET /carbon/me (authenticated user's stats)
  app.get(
    '/me',
    {
      schema: {
        tags: ['Carbon'],
        summary: 'Current user carbon savings',
        security: [{ bearerAuth: [] }],
      },
      preHandler: [requireAuth],
    },
    async (request) => {
      const stats = await carbonService.getUserCarbonStats(request.user!.id);
      return { data: stats };
    },
  );
}
