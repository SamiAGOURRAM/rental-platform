import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildApp } from '../../app.js';
import { prisma } from '../../config/database.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;
let customerToken: string;
let customerId: string;
let testEmail: string;

async function cleanupUser(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    await prisma.notification.deleteMany({ where: { userId: user.id } });
    await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }
}

async function seedNotifications(count: number) {
  await prisma.notification.deleteMany({ where: { userId: customerId } });
  const items = [];
  for (let i = 0; i < count; i++) {
    items.push({
      userId: customerId,
      type: 'ORDER_CONFIRMED' as const,
      titleEn: `Title ${i}`,
      titleFr: `Titre ${i}`,
      titleEs: `Titulo ${i}`,
      bodyEn: `Body ${i}`,
      bodyFr: `Corps ${i}`,
      bodyEs: `Cuerpo ${i}`,
      link: `/orders/${i}`,
    });
  }
  await prisma.notification.createMany({
    data: items.map((item, i) => ({ ...item, createdAt: new Date(Date.now() - i * 1000) })),
  });
  return prisma.notification.findMany({
    where: { userId: customerId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
  });
}

describe('Notification routes integration', () => {
  beforeEach(async () => {
    app = await buildApp();
    testEmail = `notif-test-${Date.now()}@example.com`;

    // Register test customer
    const registerRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: {
        email: testEmail,
        password: 'SecurePass123!',
        firstName: 'Notif',
        lastName: 'Test',
      },
    });
    expect(registerRes.statusCode).toBe(201);
    const body = JSON.parse(registerRes.payload);
    customerToken = body.data.accessToken;
    customerId = body.data.user.id;
  });

  afterEach(async () => {
    await cleanupUser(testEmail);
    await app.close();
  });

  describe('GET /', () => {
    it('returns 401 when no token is provided', async () => {
      const res = await app.inject({ method: 'GET', url: '/api/v1/notifications' });
      expect(res.statusCode).toBe(401);
    });

    it('returns paginated notification list', async () => {
      await seedNotifications(5);

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/notifications?limit=3',
        headers: { authorization: `Bearer ${customerToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.data.items).toHaveLength(3);
      expect(body.data.totalCount).toBe(5);
      expect(body.data.nextCursor).toBeDefined();
    });

    it('round-trips cursor for next page', async () => {
      const all = await seedNotifications(5);

      const first = await app.inject({
        method: 'GET',
        url: '/api/v1/notifications?limit=2',
        headers: { authorization: `Bearer ${customerToken}` },
      });
      expect(first.statusCode).toBe(200);
      const firstBody = JSON.parse(first.payload);
      expect(firstBody.data.items).toHaveLength(2);
      expect(firstBody.data.nextCursor).not.toBeNull();

      const second = await app.inject({
        method: 'GET',
        url: `/api/v1/notifications?limit=2&cursor=${encodeURIComponent(firstBody.data.nextCursor)}`,
        headers: { authorization: `Bearer ${customerToken}` },
      });
      expect(second.statusCode).toBe(200);
      const secondBody = JSON.parse(second.payload);
      expect(secondBody.data.items).toHaveLength(2);
      expect(secondBody.data.items[0].id).toBe(all[2].id);
      expect(secondBody.data.items[1].id).toBe(all[3].id);
      expect(secondBody.data.nextCursor).not.toBeNull();

      const third = await app.inject({
        method: 'GET',
        url: `/api/v1/notifications?limit=2&cursor=${encodeURIComponent(secondBody.data.nextCursor)}`,
        headers: { authorization: `Bearer ${customerToken}` },
      });
      expect(third.statusCode).toBe(200);
      const thirdBody = JSON.parse(third.payload);
      expect(thirdBody.data.items).toHaveLength(1);
      expect(thirdBody.data.items[0].id).toBe(all[4].id);
      expect(thirdBody.data.nextCursor).toBeNull();
    });

    it('filters by unreadOnly', async () => {
      const all = await seedNotifications(4);
      await prisma.notification.update({ where: { id: all[0].id }, data: { readAt: new Date() } });
      await prisma.notification.update({ where: { id: all[1].id }, data: { readAt: new Date() } });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/notifications?unreadOnly=true',
        headers: { authorization: `Bearer ${customerToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.data.items).toHaveLength(2);
    });
  });

  describe('GET /unread-count', () => {
    it('returns unread count for authenticated user', async () => {
      const all = await seedNotifications(3);
      await prisma.notification.update({ where: { id: all[0].id }, data: { readAt: new Date() } });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/notifications/unread-count',
        headers: { authorization: `Bearer ${customerToken}` },
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.payload).data.count).toBe(2);
    });
  });

  describe('POST /:id/read', () => {
    it('marks a notification as read', async () => {
      const [notif] = await seedNotifications(1);
      expect(notif.readAt).toBeNull();

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/notifications/${notif.id}/read`,
        headers: { authorization: `Bearer ${customerToken}` },
      });

      expect(res.statusCode).toBe(200);
      const updated = await prisma.notification.findUnique({ where: { id: notif.id } });
      expect(updated!.readAt).not.toBeNull();
    });

    it('returns 404 for nonexistent notification', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/notifications/nonexistent-id/read',
        headers: { authorization: `Bearer ${customerToken}` },
      });

      expect(res.statusCode).toBe(404);
    });

    it('returns 404 when notification belongs to another user', async () => {
      const otherUser = await prisma.user.create({
        data: {
          email: `other-${Date.now()}@example.com`,
          passwordHash: 'x',
          firstName: 'O',
          lastName: 'U',
        },
      });
      const otherNotif = await prisma.notification.create({
        data: {
          userId: otherUser.id,
          type: 'ORDER_CONFIRMED',
          titleEn: 'X',
          titleFr: 'X',
          titleEs: 'X',
          bodyEn: 'X',
          bodyFr: 'X',
          bodyEs: 'X',
        },
      });

      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/notifications/${otherNotif.id}/read`,
        headers: { authorization: `Bearer ${customerToken}` },
      });

      expect(res.statusCode).toBe(404);

      await prisma.notification.deleteMany({ where: { userId: otherUser.id } });
      await prisma.user.delete({ where: { id: otherUser.id } });
    });
  });

  describe('POST /read-all', () => {
    it('marks all unread notifications as read', async () => {
      await seedNotifications(5);

      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/notifications/read-all',
        headers: { authorization: `Bearer ${customerToken}` },
      });

      expect(res.statusCode).toBe(200);
      const unread = await prisma.notification.count({
        where: { userId: customerId, readAt: null },
      });
      expect(unread).toBe(0);
    });
  });
});
