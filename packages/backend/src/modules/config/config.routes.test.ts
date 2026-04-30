import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildApp } from '../../app.js';
import type { FastifyInstance } from 'fastify';
import { DELIVERY_METHODS } from '../delivery/delivery.config.js';

let app: FastifyInstance;

describe('Config routes integration', () => {
  beforeEach(async () => {
    app = await buildApp();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /api/v1/config', () => {
    it('returns 200 with data object containing expected keys', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/config',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.data).toBeDefined();
      expect(Array.isArray(body.data.deliveryMethods)).toBe(true);
      expect(typeof body.data.defaultCity).toBe('string');
      expect(typeof body.data.defaultLocale).toBe('string');
      expect(typeof body.data.currency).toBe('string');
      expect(typeof body.data.mockPayment).toBe('boolean');
    });

    it('returns deliveryMethods with correct length matching DELIVERY_METHODS', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/config',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.data.deliveryMethods).toHaveLength(DELIVERY_METHODS.length);
    });

    it('returns 200 without any auth token', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/config',
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.data).toBeDefined();
    });
  });
});
