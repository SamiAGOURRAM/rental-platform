import type { FastifyInstance } from 'fastify';
import { AppError } from '../errors/index.js';
import { nanoid } from 'nanoid';

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error, request, reply) => {
    const requestId = (request.headers['x-request-id'] as string) ?? nanoid(8);

    // Known application errors
    if (error instanceof AppError) {
      return reply
        .status(error.statusCode)
        .header('x-request-id', requestId)
        .send({
          error: {
            code: error.code,
            message: error.message,
            details: error.details,
            requestId,
          },
        });
    }

    // Fastify validation errors (schema mismatch on request body/params)
    if (error.validation) {
      return reply
        .status(422)
        .header('x-request-id', requestId)
        .send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            details: error.validation,
            requestId,
          },
        });
    }

    // JWT errors from @fastify/jwt or our own token checks
    if (error.message === 'Unauthorized' || error.statusCode === 401) {
      return reply
        .status(401)
        .header('x-request-id', requestId)
        .send({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            requestId,
          },
        });
    }

    // Rate limit errors from @fastify/rate-limit
    const nestedCode = (error as any).error?.code;
    const isRateLimited =
      error.statusCode === 429 ||
      error.code === 'RATE_LIMITED' ||
      nestedCode === 'RATE_LIMITED' ||
      error.message?.includes('Too many requests');
    if (isRateLimited) {
      const retryAfter = reply.getHeader('retry-after') ?? Math.ceil((error as any).after ?? 900);
      return reply
        .status(429)
        .header('x-request-id', requestId)
        .header('retry-after', String(retryAfter))
        .send({
          error: {
            code: 'RATE_LIMITED',
            message: error.message || 'Too many requests',
            requestId,
          },
        });
    }

    // Unexpected errors — log full stack, return sanitized response
    request.log.error({ err: error, requestId }, 'Unhandled error');
    return reply
      .status(500)
      .header('x-request-id', requestId)
      .send({
        error: {
          code: 'INTERNAL_ERROR',
          message:
            process.env['NODE_ENV'] === 'production'
              ? 'An unexpected error occurred'
              : error.message || JSON.stringify(error),
          requestId,
        },
      });
  });
}
