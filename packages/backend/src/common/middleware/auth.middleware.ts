import type { FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import { config } from '../../config/index.js';
import { UnauthorizedError, ForbiddenError } from '../errors/index.js';
import type { UserRole } from '@prisma/client';
import { asUserId } from '../types/branded.js';

export interface JwtPayload {
  sub: string; // userId
  role: UserRole;
  locale: string;
  iat: number;
  exp: number;
}

// Augment Fastify request with typed user context
declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: ReturnType<typeof asUserId>;
      role: UserRole;
      locale: string;
    };
  }
}

export function extractToken(request: FastifyRequest): string | null {
  const authHeader = request.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return null;
}

/** Prehandler — validates JWT and attaches user context. Throws if invalid. */
export async function requireAuth(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const token = extractToken(request);
  if (!token) throw new UnauthorizedError('No access token provided');

  try {
    const payload = jwt.verify(token, config.JWT_ACCESS_SECRET) as JwtPayload;
    request.user = {
      id: asUserId(payload.sub),
      role: payload.role,
      locale: payload.locale,
    };
  } catch {
    throw new UnauthorizedError('Invalid or expired access token');
  }
}

/** Prehandler — requires specific roles. Must be used after requireAuth. */
export function requireRole(...roles: UserRole[]) {
  return async function (request: FastifyRequest, _reply: FastifyReply): Promise<void> {
    if (!request.user) throw new UnauthorizedError();
    if (!roles.includes(request.user.role)) {
      throw new ForbiddenError(
        `Required role: ${roles.join(' or ')}. Your role: ${request.user.role}`,
      );
    }
  };
}

/** Prehandler — optional auth. Attaches user if token present, skips if not. */
export async function optionalAuth(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const token = extractToken(request);
  if (!token) return;

  try {
    const payload = jwt.verify(token, config.JWT_ACCESS_SECRET) as JwtPayload;
    request.user = {
      id: asUserId(payload.sub),
      role: payload.role,
      locale: payload.locale,
    };
  } catch {
    // Invalid token on optional route — silently ignore
  }
}
