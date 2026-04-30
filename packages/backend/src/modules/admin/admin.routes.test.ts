import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildApp } from '../../app.js';
import { prisma } from '../../config/database.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;
let adminToken: string;
let customerToken: string;
let customerId: string;
const adminEmail = 'admin@rental.local';
const adminPassword = 'admin123!';

describe('Admin routes integration', () => {
  beforeEach(async () => {
    app = await buildApp();

    // Login as admin
    const adminRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: adminEmail, password: adminPassword },
    });
    const adminBody = JSON.parse(adminRes.payload);
    adminToken = adminBody.data.accessToken;

    // Get customer user
    const customer = await prisma.user.findUnique({
      where: { email: 'customer@rental.local' },
    });
    customerId = customer!.id;

    // Login as customer
    const custRes = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: 'customer@rental.local', password: 'customer123!' },
    });
    const custBody = JSON.parse(custRes.payload);
    customerToken = custBody.data.accessToken;
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /api/v1/admin/dashboard', () => {
    it('returns 200 with dashboard stats', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/dashboard',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.data).toBeDefined();
      expect(typeof body.data.activeRentals).toBe('number');
      expect(typeof body.data.pendingOrders).toBe('number');
      expect(typeof body.data.totalRevenueCents).toBe('number');
      expect(body.data.inventory).toBeDefined();
      expect(typeof body.data.inventory.total).toBe('number');
      expect(typeof body.data.inventory.available).toBe('number');
      expect(typeof body.data.inventory.donated).toBe('number');
      expect(Array.isArray(body.data.upcomingDeliveries)).toBe(true);
    });
  });

  describe('GET /api/v1/admin/orders', () => {
    it('returns 200 with paginated order list', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/orders',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.data).toBeDefined();
      expect(Array.isArray(body.data.items)).toBe(true);
    });

    it('filters by status query param', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/orders?status=confirmed',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      for (const item of body.data.items) {
        expect(item.status).toBe('confirmed');
      }
    });

    it('supports cursor pagination', async () => {
      // First page with small limit
      const page1 = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/orders?limit=1',
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(page1.statusCode).toBe(200);
      const body1 = JSON.parse(page1.payload);
      expect(body1.data.items.length).toBeLessThanOrEqual(1);

      if (body1.data.nextCursor) {
        const page2 = await app.inject({
          method: 'GET',
          url: `/api/v1/admin/orders?limit=1&cursor=${body1.data.nextCursor}`,
          headers: { authorization: `Bearer ${adminToken}` },
        });
        expect(page2.statusCode).toBe(200);
        const body2 = JSON.parse(page2.payload);
        expect(Array.isArray(body2.data.items)).toBe(true);
        if (body1.data.items.length > 0 && body2.data.items.length > 0) {
          expect(body2.data.items[0].id).not.toBe(body1.data.items[0].id);
        }
      }
    });
  });

  describe('PATCH /api/v1/admin/orders/:id/status', () => {
    let orderId: string;
    let addressId: string;

    beforeEach(async () => {
      // Create an address for the customer
      const address = await prisma.address.create({
        data: {
          userId: customerId,
          label: 'Test Address',
          line1: '123 Test St',
          city: 'paris',
          postalCode: '75001',
          countryCode: 'FR',
        },
      });
      addressId = address.id;

      // Get a product
      const product = await prisma.product.findFirst();
      if (!product) throw new Error('No product found in DB');

      // Create order with status 'confirmed'
      const order = await prisma.order.create({
        data: {
          userId: customerId,
          addressId: address.id,
          orderNumber: `TEST-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          status: 'confirmed',
          rentalStart: new Date('2026-05-01'),
          rentalEnd: new Date('2026-05-05'),
          deliveryMethod: 'personal',
          subtotal: 100.0,
          total: 100.0,
          items: {
            create: {
              productId: product.id,
              quantity: 1,
              city: 'paris',
              priceAtTime: 20.0,
              conditionAtRent: 'new',
              cycleAtRent: 0,
            },
          },
        },
      });
      orderId = order.id;
    });

    afterEach(async () => {
      await prisma.orderStatusHistory.deleteMany({ where: { orderId } });
      await prisma.orderItem.deleteMany({ where: { orderId } });
      await prisma.carbonSaving.deleteMany({ where: { orderId } });
      await prisma.delivery.deleteMany({ where: { orderId } });
      await prisma.payment.deleteMany({ where: { orderId } });
      await prisma.productLifecycleLog.deleteMany({ where: { orderId } });
      await prisma.order.deleteMany({ where: { id: orderId } });
      await prisma.address.deleteMany({ where: { id: addressId } });
    });

    it('executes a valid transition and returns 200', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/admin/orders/${orderId}/status`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { status: 'preparing' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.data).toBeDefined();
      expect(body.data.status).toBe('preparing');
    });

    it('rejects invalid transition with error status', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/admin/orders/${orderId}/status`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { status: 'delivered' },
      });

      expect(res.statusCode).toBeGreaterThanOrEqual(400);
      expect(res.statusCode).toBeLessThan(500);
      const body = JSON.parse(res.payload);
      expect(body.error).toBeDefined();
    });

    it('returns 404 for nonexistent order', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/v1/admin/orders/00000000-0000-0000-0000-000000000000/status',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { status: 'preparing' },
      });

      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.payload);
      expect(body.error).toBeDefined();
      expect(body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('GET /api/v1/admin/customers', () => {
    it('returns 200 with customer list', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/customers',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.data).toBeDefined();
      expect(Array.isArray(body.data.items)).toBe(true);
      expect(body.data.items.length).toBeGreaterThan(0);
    });

    it('filters customers by search query q', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/customers?q=Customer',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.data.items.length).toBeGreaterThan(0);
      for (const item of body.data.items) {
        const match =
          (item.email ?? '').toLowerCase().includes('customer') ||
          (item.firstName ?? '').toLowerCase().includes('customer') ||
          (item.lastName ?? '').toLowerCase().includes('customer');
        expect(match).toBe(true);
      }
    });

    it('supports cursor pagination', async () => {
      const page1 = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/customers?limit=1',
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(page1.statusCode).toBe(200);
      const body1 = JSON.parse(page1.payload);
      expect(body1.data.items.length).toBeLessThanOrEqual(1);

      if (body1.data.nextCursor) {
        const page2 = await app.inject({
          method: 'GET',
          url: `/api/v1/admin/customers?limit=1&cursor=${body1.data.nextCursor}`,
          headers: { authorization: `Bearer ${adminToken}` },
        });
        expect(page2.statusCode).toBe(200);
        const body2 = JSON.parse(page2.payload);
        expect(Array.isArray(body2.data.items)).toBe(true);
        if (body1.data.items.length > 0 && body2.data.items.length > 0) {
          expect(body2.data.items[0].id).not.toBe(body1.data.items[0].id);
        }
      }
    });
  });

  describe('GET /api/v1/admin/customers/:id', () => {
    it('returns 200 with customer detail including orders, addresses, spend', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/admin/customers/${customerId}`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.data).toBeDefined();
      expect(body.data.id).toBe(customerId);
      expect(body.data.email).toBe('customer@rental.local');
      expect(Array.isArray(body.data.recentOrders)).toBe(true);
      expect(Array.isArray(body.data.addresses)).toBe(true);
      expect(typeof body.data.totalSpentCents).toBe('number');
      expect(typeof body.data.totalOrders).toBe('number');
    });

    it('returns 404 for nonexistent customer', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/customers/00000000-0000-0000-0000-000000000000',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.payload);
      expect(body.error).toBeDefined();
    });
  });

  describe('Capsule CRUD', () => {
    let categoryId: string;
    let capsuleId: string;

    beforeEach(async () => {
      const category = await prisma.category.findFirst();
      if (!category) throw new Error('No category found in DB');
      categoryId = category.id;
    });

    afterEach(async () => {
      if (capsuleId) {
        // Clean up capsule and its items
        await prisma.capsuleWardrobeItem.deleteMany({ where: { capsuleId } }).catch(() => {});
        await prisma.capsuleWardrobe.delete({ where: { id: capsuleId } }).catch(() => {});
        capsuleId = '';
      }
    });

    it('GET /capsules returns 200 with list', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/capsules',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.data).toBeDefined();
      expect(Array.isArray(body.data)).toBe(true);
      // Seeded capsules should exist
      expect(body.data.length).toBeGreaterThan(0);
    });

    it('POST /capsules creates a capsule and returns 201', async () => {
      const slug = `test-capsule-${Date.now()}`;
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/capsules',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          slug,
          nameEn: 'Test Capsule',
          nameFr: 'Capsule Test',
          nameEs: 'Cápsula Test',
          descriptionEn: 'Test description',
          descriptionFr: 'Description test',
          descriptionEs: 'Descripción test',
          categoryType: 'business',
          season: 'all_season',
          gender: 'unisex',
          basePrice: 100,
          imageUrl: 'http://example.com/img.jpg',
          items: [{ categoryId, quantity: 1, isRequired: true }],
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.payload);
      expect(body.data).toBeDefined();
      expect(body.data.slug).toBe(slug);
      expect(body.data.items).toBeDefined();
      expect(body.data.items.length).toBe(1);
      capsuleId = body.data.id;
    });

    it('PATCH /capsules/:id updates a capsule and returns 200', async () => {
      // Create first
      const slug = `patch-capsule-${Date.now()}`;
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/capsules',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          slug,
          nameEn: 'Original',
          nameFr: 'Original',
          nameEs: 'Original',
          descriptionEn: 'desc',
          descriptionFr: 'desc',
          descriptionEs: 'desc',
          categoryType: 'business',
          season: 'all_season',
          gender: 'unisex',
          basePrice: 100,
          imageUrl: 'http://example.com/img.jpg',
          items: [{ categoryId, quantity: 1, isRequired: true }],
        },
      });
      expect(createRes.statusCode).toBe(201);
      const created = JSON.parse(createRes.payload);
      capsuleId = created.data.id;

      // Update
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v1/admin/capsules/${capsuleId}`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { nameEn: 'Updated Capsule' },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.data).toBeDefined();
      expect(body.data.nameEn).toBe('Updated Capsule');
    });

    it('DELETE /capsules/:id soft-deletes and returns 204', async () => {
      // Create first
      const slug = `delete-capsule-${Date.now()}`;
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/capsules',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          slug,
          nameEn: 'To Delete',
          nameFr: 'To Delete',
          nameEs: 'To Delete',
          descriptionEn: 'desc',
          descriptionFr: 'desc',
          descriptionEs: 'desc',
          categoryType: 'business',
          season: 'all_season',
          gender: 'unisex',
          basePrice: 100,
          imageUrl: 'http://example.com/img.jpg',
          items: [{ categoryId, quantity: 1, isRequired: true }],
        },
      });
      expect(createRes.statusCode).toBe(201);
      const created = JSON.parse(createRes.payload);
      capsuleId = created.data.id;

      // Delete (soft)
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v1/admin/capsules/${capsuleId}`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(204);

      // Verify isActive is false
      const capsule = await prisma.capsuleWardrobe.findUnique({ where: { id: capsuleId } });
      expect(capsule).toBeDefined();
      expect(capsule!.isActive).toBe(false);
    });
  });

  describe('GET /api/v1/admin/deliveries', () => {
    it('returns 200 with deliveries list', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/deliveries',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.data).toBeDefined();
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('respects limit query param', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/deliveries?limit=1',
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.payload);
      expect(body.data.length).toBeLessThanOrEqual(1);
    });
  });

  describe('Auth gates', () => {
    it('returns 401 when no token is provided', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/dashboard',
      });

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.payload);
      expect(body.error).toBeDefined();
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('returns 403 when customer token is used', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/dashboard',
        headers: { authorization: `Bearer ${customerToken}` },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.payload);
      expect(body.error).toBeDefined();
      expect(body.error.code).toBe('FORBIDDEN');
    });
  });
});
