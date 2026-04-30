import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authService } from './auth.service.js';
import { verificationService } from './verification.service.js';
import { requireAuth } from '../../common/middleware/auth.middleware.js';
import { asUserId } from '../../common/types/branded.js';

const REFRESH_COOKIE = 'refresh_token';

const registerBody = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  locale: z.enum(['en', 'fr', 'es']).optional(),
});

const loginBody = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const guestCheckoutBody = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  locale: z.enum(['en', 'fr', 'es']).optional(),
});

export async function authRoutes(app: FastifyInstance): Promise<void> {
  // POST /auth/register
  app.post(
    '/register',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Register a new customer account',
        body: {
          type: 'object',
          required: ['email', 'password', 'firstName', 'lastName'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            locale: { type: 'string', enum: ['en', 'fr', 'es'] },
          },
        },
        response: {
          201: {
            type: 'object',
            properties: {
              data: {
                type: 'object',
                properties: {
                  accessToken: { type: 'string' },
                  user: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      email: { type: 'string' },
                      firstName: { type: 'string' },
                      lastName: { type: 'string' },
                      role: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const body = registerBody.parse(request.body);
      const result = await authService.register(body);
      if (!result.ok) throw result.error;

      const { tokenPair, user } = result.value;
      setRefreshCookie(
        reply,
        `${user.id}:${tokenPair.refreshToken}`,
        tokenPair.refreshTokenExpiresAt,
      );

      return reply.status(201).send({
        data: {
          accessToken: tokenPair.accessToken,
          user,
        },
      });
    },
  );

  // POST /auth/guest-checkout
  app.post(
    '/guest-checkout',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Confirm email for guest checkout and issue a customer session',
        body: {
          type: 'object',
          required: ['email', 'firstName', 'lastName'],
          properties: {
            email: { type: 'string', format: 'email' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            locale: { type: 'string', enum: ['en', 'fr', 'es'] },
          },
        },
      },
    },
    async (request, reply) => {
      const body = guestCheckoutBody.parse(request.body);
      const result = await authService.guestCheckout(body);
      if (!result.ok) throw result.error;

      const { tokenPair, user } = result.value;
      setRefreshCookie(
        reply,
        `${user.id}:${tokenPair.refreshToken}`,
        tokenPair.refreshTokenExpiresAt,
      );

      return reply.send({
        data: {
          accessToken: tokenPair.accessToken,
          user,
        },
      });
    },
  );

  // POST /auth/login
  app.post(
    '/login',
    {
      config: { rateLimit: { max: 5, timeWindow: '15 minutes' } },
      schema: {
        tags: ['Auth'],
        summary: 'Login with email and password',
        body: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const body = loginBody.parse(request.body);
      const result = await authService.login(body.email, body.password);
      if (!result.ok) throw result.error;

      const { tokenPair, user } = result.value;
      setRefreshCookie(
        reply,
        `${user.id}:${tokenPair.refreshToken}`,
        tokenPair.refreshTokenExpiresAt,
      );

      return reply.send({
        data: {
          accessToken: tokenPair.accessToken,
          user,
        },
      });
    },
  );

  // POST /auth/refresh
  app.post(
    '/refresh',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Refresh access token using the refresh cookie',
      },
    },
    async (request, reply) => {
      const rawToken = request.cookies[REFRESH_COOKIE];
      if (!rawToken) {
        return reply.send({ data: null });
      }

      // Decode userId from the refresh token's stored record
      // We need userId to look up the DB record — we embed it in the cookie value
      // Format: "{userId}:{rawToken}"
      const [userId, ...tokenParts] = rawToken.split(':');
      const tokenValue = tokenParts.join(':');

      if (!userId || !tokenValue) {
        return reply.send({ data: null });
      }

      const result = await authService.refresh(tokenValue, asUserId(userId));
      if (!result.ok) {
        return reply.send({ data: null });
      }

      const tokenPair = result.value;
      setRefreshCookie(
        reply,
        `${userId}:${tokenPair.refreshToken}`,
        tokenPair.refreshTokenExpiresAt,
      );

      return reply.send({
        data: {
          accessToken: tokenPair.accessToken,
          refreshToken: tokenPair.refreshToken,
        },
      });
    },
  );

  // POST /auth/email/verify/request — resend verification email
  app.post(
    '/email/verify/request',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Resend email verification link',
        security: [{ bearerAuth: [] }],
      },
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      await verificationService.sendEmailVerification(request.user!.id);
      return reply.status(204).send();
    },
  );

  // POST /auth/email/verify/confirm
  app.post(
    '/email/verify/confirm',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Confirm email via verification token',
        body: {
          type: 'object',
          required: ['token'],
          properties: { token: { type: 'string' } },
        },
      },
    },
    async (request, reply) => {
      const body = z.object({ token: z.string().min(10) }).parse(request.body);
      await verificationService.verifyEmail(body.token);
      return reply.status(204).send();
    },
  );

  // POST /auth/password/reset/request
  app.post(
    '/password/reset/request',
    {
      config: { rateLimit: { max: 5, timeWindow: '15 minutes' } },
      schema: {
        tags: ['Auth'],
        summary: 'Request a password reset email',
        body: {
          type: 'object',
          required: ['email'],
          properties: { email: { type: 'string', format: 'email' } },
        },
      },
    },
    async (request, reply) => {
      const body = z.object({ email: z.string().email() }).parse(request.body);
      await verificationService.requestPasswordReset(body.email);
      // Always 204 — never reveal whether the email exists
      return reply.status(204).send();
    },
  );

  // POST /auth/password/reset/confirm
  app.post(
    '/password/reset/confirm',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Set a new password with a reset token',
        body: {
          type: 'object',
          required: ['token', 'password'],
          properties: {
            token: { type: 'string' },
            password: { type: 'string', minLength: 8 },
          },
        },
      },
    },
    async (request, reply) => {
      const body = z
        .object({
          token: z.string().min(10),
          password: z.string().min(8).max(72),
        })
        .parse(request.body);
      await verificationService.resetPassword(body.token, body.password);
      return reply.status(204).send();
    },
  );

  // POST /auth/magic-link
  app.post(
    '/magic-link',
    {
      config: { rateLimit: { max: 5, timeWindow: '15 minutes' } },
      schema: {
        tags: ['Auth'],
        summary: 'Request a magic link to sign in without a password',
        body: {
          type: 'object',
          required: ['email'],
          properties: {
            email: { type: 'string', format: 'email' },
          },
        },
      },
    },
    async (request, reply) => {
      const body = z.object({ email: z.string().email() }).parse(request.body);
      await verificationService.sendMagicLink(body.email);
      // Always 204 — never reveal whether the email exists
      return reply.status(204).send();
    },
  );

  // POST /auth/magic-link/verify
  app.post(
    '/magic-link/verify',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Exchange a magic link token for a session',
        body: {
          type: 'object',
          required: ['token'],
          properties: {
            token: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const body = z.object({ token: z.string().min(10) }).parse(request.body);
      const result = await verificationService.verifyMagicLink(body.token);

      setRefreshCookie(
        reply,
        `${result.userId}:${result.tokenPair.refreshToken}`,
        result.tokenPair.refreshTokenExpiresAt,
      );

      return reply.send({
        data: {
          accessToken: result.tokenPair.accessToken,
          user: {
            id: result.userId,
            role: result.role,
            locale: result.locale,
          },
        },
      });
    },
  );

  // POST /auth/set-password — for guests to create a password and upgrade their account
  app.post(
    '/set-password',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Set a password for a guest account (upgrades to regular account)',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          required: ['password'],
          properties: {
            password: { type: 'string', minLength: 8 },
          },
        },
      },
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const body = z.object({ password: z.string().min(8).max(72) }).parse(request.body);
      const userId = request.user!.id;

      await authService.setPassword(userId, body.password);

      return reply.status(204).send();
    },
  );

  // POST /auth/logout
  app.post(
    '/logout',
    {
      schema: {
        tags: ['Auth'],
        summary: 'Logout and revoke refresh token',
        security: [{ bearerAuth: [] }],
      },
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const rawToken = request.cookies[REFRESH_COOKIE];
      if (rawToken && request.user) {
        const [, ...tokenParts] = rawToken.split(':');
        const tokenValue = tokenParts.join(':');
        await authService.logout(tokenValue, request.user.id);
      }

      reply.clearCookie(REFRESH_COOKIE);
      return reply.status(204).send();
    },
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setRefreshCookie(reply: any, value: string, expires: Date): void {
  reply.setCookie(REFRESH_COOKIE, value, {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'strict',
    expires,
    path: '/api/v1/auth',
  });
}
