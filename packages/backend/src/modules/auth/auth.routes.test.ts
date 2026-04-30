import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildApp } from '../../app.js';
import { prisma } from '../../config/database.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;
let testEmail: string;

async function cleanupUser(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
    await prisma.user.delete({ where: { id: user.id } });
  }
}

describe('Auth routes integration', () => {
  beforeEach(async () => {
    app = await buildApp();
    testEmail = `int-test-${Date.now()}@example.com`;
  });

  afterEach(async () => {
    await cleanupUser(testEmail);
    await app.close();
  });

  describe('POST /api/v1/auth/register', () => {
    it('registers a user and returns tokens', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: testEmail,
          password: 'SecurePass123!',
          firstName: 'Int',
          lastName: 'Test',
          locale: 'en',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);
      expect(body.data.accessToken).toBeDefined();
      expect(body.data.user.email).toBe(testEmail);
    });
  });

  describe('Token rotation', () => {
    it('rotates refresh token and revokes old one on reuse', async () => {
      // 1. Register
      const registerRes = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: testEmail,
          password: 'SecurePass123!',
          firstName: 'Int',
          lastName: 'Test',
        },
      });
      expect(registerRes.statusCode).toBe(201);

      const cookies = registerRes.cookies;
      const refreshCookie = cookies.find((c) => c.name === 'refresh_token');
      expect(refreshCookie).toBeDefined();

      // 2. Refresh once — should succeed and return new token
      const refresh1 = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        cookies: { refresh_token: refreshCookie!.value },
      });
      expect(refresh1.statusCode).toBe(200);
      const refresh1Body = JSON.parse(refresh1.payload);
      expect(refresh1Body.data.accessToken).toBeDefined();
      expect(refresh1Body.data.refreshToken).toBeDefined();

      const newRefreshCookie = refresh1.cookies.find((c) => c.name === 'refresh_token');
      expect(newRefreshCookie).toBeDefined();
      expect(newRefreshCookie!.value).not.toBe(refreshCookie!.value);

      // 3. Reuse the ORIGINAL refresh token — should return 401 with REFRESH_REVOKED
      const replay = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        cookies: { refresh_token: refreshCookie!.value },
      });
      expect(replay.statusCode).toBe(401);
      const replayBody = JSON.parse(replay.payload);
      expect(replayBody.error.code).toBe('REFRESH_REVOKED');

      // 4. Confirm all user refresh tokens are revoked
      const user = await prisma.user.findUnique({
        where: { email: testEmail },
        include: { refreshTokens: true },
      });
      expect(user!.refreshTokens.every((t) => t.revokedAt !== null)).toBe(true);
    });
  });

  describe('Rate limiting', () => {
    it('returns 429 after 6 login attempts from same IP', async () => {
      // First 5 should fail with 401 (wrong password) but not 429
      for (let i = 0; i < 5; i++) {
        const res = await app.inject({
          method: 'POST',
          url: '/api/v1/auth/login',
          payload: { email: testEmail, password: 'wrong' },
        });
        expect(res.statusCode).not.toBe(429);
      }

      // 6th should be rate limited
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: testEmail, password: 'wrong' },
      });
      expect(res.statusCode).toBe(429);
      expect(res.headers['retry-after']).toBeDefined();
    });
  });
});
