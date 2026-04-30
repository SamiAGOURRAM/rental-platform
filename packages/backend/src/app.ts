import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import multipart from '@fastify/multipart';
import staticPlugin from '@fastify/static';
import { resolve } from 'node:path';
import { config } from './config/index.js';
import { registerErrorHandler } from './common/middleware/error-handler.js';

// Module route imports
import { authRoutes } from './modules/auth/auth.routes.js';
import { userRoutes } from './modules/user/user.routes.js';
import { catalogRoutes } from './modules/catalog/catalog.routes.js';
import { inventoryRoutes } from './modules/inventory/inventory.routes.js';
import { orderRoutes } from './modules/order/order.routes.js';
import { paymentRoutes } from './modules/payment/payment.routes.js';
import { deliveryRoutes } from './modules/delivery/delivery.routes.js';
import { carbonRoutes } from './modules/carbon/carbon.routes.js';
import { adminRoutes } from './modules/admin/admin.routes.js';
import { configRoutes } from './modules/config/config.routes.js';
import { notificationRoutes } from './modules/notification/notification.routes.js';

// Event handlers
import { eventBus } from './common/events/event-bus.js';
import { orderService } from './modules/order/order.service.js';
import { deliveryService } from './modules/delivery/delivery.service.js';
import { carbonService } from './modules/carbon/carbon.service.js';
import { notificationService } from './modules/notification/notification.service.js';
import { prisma } from './config/database.js';
import { asUserId } from './common/types/branded.js';

export async function buildApp(): Promise<FastifyInstance> {
  const loggerConfig =
    config.NODE_ENV === 'development'
      ? {
          level: 'debug' as const,
          transport: { target: 'pino-pretty', options: { colorize: true } },
        }
      : { level: 'info' as const };

  const app = Fastify({
    logger: loggerConfig,
    trustProxy: true,
    genReqId: () => {
      // Short alphanumeric request ID for logs
      return Math.random().toString(36).slice(2, 10);
    },
  });

  // ─── Global error handler (register first so it applies to all contexts) ───
  registerErrorHandler(app);

  // ─── Security ─────────────────────────────────────────────────
  await app.register(helmet, {
    contentSecurityPolicy: false, // Disabled for Swagger UI compatibility
  });

  await app.register(cors, {
    origin: config.CORS_ORIGINS.split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  await app.register(cookie, {
    secret: config.JWT_REFRESH_SECRET,
  });

  // ─── File uploads ─────────────────────────────────────────────
  await app.register(multipart, {
    limits: {
      fileSize: 8 * 1024 * 1024, // 8 MB per image
      files: 1,
    },
  });

  // Serve uploaded files from disk at /uploads/*
  await app.register(staticPlugin, {
    root: resolve(process.cwd(), 'uploads'),
    prefix: '/uploads/',
    decorateReply: false,
  });

  // ─── Rate limiting ─────────────────────────────────────────────
  await app.register(rateLimit, {
    max: 200,
    timeWindow: '1 minute',
    errorResponseBuilder: (_request, context) => ({
      error: {
        code: 'RATE_LIMITED',
        message: `Too many requests. Retry after ${context.after}`,
      },
    }),
  });

  // ─── OpenAPI / Swagger ─────────────────────────────────────────
  await app.register(swagger, {
    openapi: {
      openapi: '3.0.3',
      info: {
        title: 'Travel Clothing Rental — API',
        description:
          'Backend API for a travel clothing rental platform. ' +
          'Rent clothes delivered to your destination. Travel light, reduce your footprint.',
        version: '1.0.0',
        contact: { email: 'hello@rental.local' },
      },
      servers: [
        {
          url: `http://localhost:${config.PORT}`,
          description: 'Local development',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      tags: [
        { name: 'Auth', description: 'Authentication & session management' },
        { name: 'Users', description: 'User profiles & addresses' },
        { name: 'Catalog', description: 'Browse products & capsule wardrobes' },
        { name: 'Inventory', description: 'Admin: inventory management & lifecycle' },
        { name: 'Orders', description: 'Order creation & management' },
        { name: 'Payments', description: 'Stripe checkout & webhooks' },
        { name: 'Delivery', description: 'Delivery & return logistics' },
        { name: 'Carbon', description: 'Carbon footprint tracking' },
        { name: 'Admin', description: 'Admin dashboard & operations' },
      ],
    },
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
      tryItOutEnabled: true,
      persistAuthorization: true,
    },
    staticCSP: false,
  });

  // ─── Health check ─────────────────────────────────────────────
  app.get(
    '/health',
    {
      schema: {
        description: 'Health check endpoint',
        tags: ['System'],
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              timestamp: { type: 'string' },
            },
          },
        },
      },
    },
    async () => ({
      status: 'ok',
      timestamp: new Date().toISOString(),
    }),
  );

  // ─── Register module routes under /api/v1 ─────────────────────
  await app.register(
    async (api) => {
      await api.register(authRoutes, { prefix: '/auth' });
      await api.register(userRoutes, { prefix: '/users' });
      await api.register(catalogRoutes, { prefix: '/catalog' });
      await api.register(inventoryRoutes, { prefix: '/inventory' });
      await api.register(orderRoutes, { prefix: '/orders' });
      await api.register(paymentRoutes, { prefix: '/payments' });
      await api.register(deliveryRoutes, { prefix: '/delivery' });
      await api.register(carbonRoutes, { prefix: '/carbon' });
      await api.register(adminRoutes, { prefix: '/admin' });
      await api.register(configRoutes, { prefix: '/config' });
      await api.register(notificationRoutes, { prefix: '/notifications' });
    },
    { prefix: '/api/v1' },
  );

  // ─── Look up system user for background operations ────────────
  const systemUser = await prisma.user.findUnique({
    where: { email: 'system@maisonvoyageur.internal' },
    select: { id: true },
  });
  if (!systemUser) {
    app.log.warn(
      '[App] System user not found — background order transitions will fail. Run db:seed.',
    );
  }

  // ─── Wire event bus handlers ──────────────────────────────────
  wireEventHandlers(systemUser?.id);

  return app;
}

/**
 * Register all domain event handlers.
 * Order matters — handlers are registered once when the app starts.
 */
function wireEventHandlers(systemUserId?: string): void {
  const systemActor = systemUserId ? { id: asUserId(systemUserId), role: 'admin' as const } : null;

  // PAYMENT_SUCCEEDED → confirm the order
  eventBus.on('PAYMENT_SUCCEEDED', async ({ orderId }) => {
    if (!systemActor) {
      console.error('[EventBus] Cannot confirm order: system user not found');
      return;
    }
    try {
      await orderService.transitionStatus(orderId, 'confirmed', systemActor);
    } catch (err) {
      console.error('[EventBus] Failed to confirm order after payment:', err);
    }
  });

  // ORDER_CONFIRMED → reserve inventory + schedule delivery + calculate carbon + send email
  eventBus.on('ORDER_CONFIRMED', async ({ orderId }) => {
    try {
      await deliveryService.scheduleDelivery(orderId);
    } catch (err) {
      console.error('[EventBus] Failed to schedule delivery:', err);
    }

    try {
      await carbonService.calculateForOrder(orderId);
    } catch (err) {
      console.error('[EventBus] Failed to calculate carbon:', err);
    }

    try {
      await notificationService.notifyOrderConfirmed(orderId);
    } catch (err) {
      console.error('[EventBus] Failed to send order confirmed email:', err);
    }
  });

  // ORDER_DISPATCHED → tell the customer their wardrobe is on the way
  eventBus.on('ORDER_DISPATCHED', async ({ orderId }) => {
    try {
      await notificationService.notifyOrderShipped(orderId);
    } catch (err) {
      console.error('[EventBus] Failed to send shipping email:', err);
    }
  });

  // DELIVERY_COMPLETED → send return reminder
  eventBus.on('DELIVERY_COMPLETED', async ({ orderId }) => {
    try {
      await notificationService.notifyReturnReminder(orderId);
    } catch (err) {
      console.error('[EventBus] Failed to send return reminder:', err);
    }
  });

  // RETURN_INITIATED → schedule return logistics
  eventBus.on('RETURN_INITIATED', async ({ orderId }) => {
    try {
      await deliveryService.scheduleReturn(orderId);
    } catch (err) {
      console.error('[EventBus] Failed to schedule return delivery:', err);
    }
  });

  // RETURN_RECEIVED → confirm receipt to the customer
  eventBus.on('RETURN_RECEIVED', async ({ orderId }) => {
    try {
      await notificationService.notifyReturnReceived(orderId);
    } catch (err) {
      console.error('[EventBus] Failed to send return-received email:', err);
    }
  });

  // ORDER_CANCELLED → confirm cancellation (and refund summary if any)
  eventBus.on('ORDER_CANCELLED', async ({ orderId }) => {
    try {
      await notificationService.notifyOrderCancelled(orderId);
    } catch (err) {
      console.error('[EventBus] Failed to send cancellation email:', err);
    }
  });

  // ORDER_COMPLETED → send wrap-up email
  eventBus.on('ORDER_COMPLETED', async ({ orderId }) => {
    try {
      await notificationService.notifyRentalCompleted(orderId);
    } catch (err) {
      console.error('[EventBus] Failed to send rental-completed email:', err);
    }
  });

  // PRODUCT_END_OF_LIFE → log to console (admin handles donation manually)
  eventBus.on('PRODUCT_END_OF_LIFE', ({ productId, cycleCount }) => {
    console.log(
      `[Lifecycle] Product ${productId} reached end of life after ${cycleCount} cycles. ` +
        'Please process donation via admin dashboard.',
    );
  });
}
