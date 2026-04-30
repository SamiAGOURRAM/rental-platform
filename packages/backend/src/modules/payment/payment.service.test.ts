import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PaymentService } from './payment.service.js';
import { paymentGatewayFactory } from './payment-gateway.factory.js';
import { paymentRepository } from './payment.repository.js';
import { orderRepository } from '../order/order.repository.js';
import { eventBus } from '../../common/events/event-bus.js';
import { getRedis } from '../../config/redis.js';
import { config } from '../../config/index.js';
import { ConflictError } from '../../common/errors/index.js';
import type { OrderId } from '../../common/types/branded.js';

// ── Hoisted mutable mock objects (safe to reference in vi.mock factories) ──
const { mockGateway } = vi.hoisted(() => ({
  mockGateway: {
    createCheckoutSession: vi.fn(),
    retrieveSession: vi.fn(),
    createRefund: vi.fn(),
  },
}));

const { mockRedis } = vi.hoisted(() => ({
  mockRedis: {
    get: vi.fn(),
    setex: vi.fn(),
  },
}));

const { mockConfig } = vi.hoisted(() => ({
  mockConfig: {
    STRIPE_CURRENCY: 'eur',
    USE_MOCK_PAYMENT: false,
    STRIPE_WEBHOOK_SECRET: 'whsec_test_secret',
  },
}));

const { mockConstructEvent } = vi.hoisted(() => ({
  mockConstructEvent: vi.fn(),
}));

// ── Module mocks ──────────────────────────────────────────────

vi.mock('./stripe.adapter.js', () => ({
  stripe: {
    webhooks: {
      constructEvent: mockConstructEvent,
    },
  },
}));

vi.mock('./payment-gateway.factory.js', () => ({
  paymentGatewayFactory: {
    create: vi.fn().mockReturnValue(mockGateway),
  },
}));

vi.mock('./payment.repository.js', () => ({
  paymentRepository: {
    findByIdempotencyKey: vi.fn(),
    findByOrderId: vi.fn(),
    findByStripeSessionId: vi.fn(),
    create: vi.fn(),
    updateStatus: vi.fn(),
    updateBySessionId: vi.fn(),
    updateByPaymentIntentId: vi.fn(),
    deleteByIdempotencyKey: vi.fn(),
  },
}));

vi.mock('../order/order.repository.js', () => ({
  orderRepository: {
    findById: vi.fn(),
  },
}));

vi.mock('../../common/events/event-bus.js', () => ({
  eventBus: {
    emit: vi.fn(),
    on: vi.fn(),
  },
}));

vi.mock('../../config/redis.js', () => ({
  getRedis: vi.fn().mockReturnValue(mockRedis),
}));

vi.mock('../../config/index.js', () => ({
  config: mockConfig,
}));

// ── Helpers ───────────────────────────────────────────────────

const orderId = 'order-1' as OrderId;

function makeOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: orderId,
    orderNumber: 'ORD-001',
    status: 'pending_payment',
    subtotal: 100,
    deliveryFee: 4.5,
    total: 104.5,
    items: [{ id: 'item-1', productId: 'prod-1', quantity: 1 }],
    rentalStart: new Date('2026-06-01'),
    rentalEnd: new Date('2026-06-15'),
    ...overrides,
  };
}

function makePayment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pay-1',
    orderId,
    stripeSessionId: 'cs_test_123',
    stripePaymentIntent: 'pi_test_123',
    type: 'rental' as const,
    amount: 104.5,
    currency: 'eur',
    status: 'succeeded' as const,
    idempotencyKey: 'checkout:order-1',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function makeStripeEvent(
  type: string,
  objectId: string,
  metadata?: Record<string, string>,
  paymentIntent?: string,
) {
  return {
    type,
    id: `evt_${objectId}`,
    data: {
      object: {
        id: objectId,
        ...(metadata && { metadata }),
        ...(paymentIntent && { payment_intent: paymentIntent }),
      },
    },
  };
}

// ── Test suite ────────────────────────────────────────────────

describe('PaymentService', () => {
  let service: PaymentService;
  const locale = 'fr';
  const successUrl = 'https://example.com/success';
  const cancelUrl = 'https://example.com/cancel';

  beforeEach(() => {
    service = new PaymentService();
    vi.clearAllMocks();
    mockConfig.USE_MOCK_PAYMENT = false;
  });

  // ═══════════════════════════════════════════════════════════════
  // createCheckoutSession
  // ═══════════════════════════════════════════════════════════════

  describe('createCheckoutSession', () => {
    it('returns ORDER_NOT_FOUND when order does not exist', async () => {
      vi.mocked(orderRepository.findById).mockResolvedValue(null);

      const result = await service.createCheckoutSession(orderId, locale, successUrl, cancelUrl);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toEqual({ type: 'ORDER_NOT_FOUND' });
      }
    });

    it('returns ALREADY_PAID when order status is not pending_payment', async () => {
      vi.mocked(orderRepository.findById).mockResolvedValue(
        makeOrder({ status: 'confirmed' }) as any,
      );

      const result = await service.createCheckoutSession(orderId, locale, successUrl, cancelUrl);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toEqual({ type: 'ALREADY_PAID' });
      }
    });

    it('returns existing session URL when an open session already exists', async () => {
      vi.mocked(orderRepository.findById).mockResolvedValue(makeOrder() as any);
      vi.mocked(paymentRepository.findByIdempotencyKey).mockResolvedValue(
        makePayment({ stripeSessionId: 'cs_open_123' }) as any,
      );
      mockGateway.retrieveSession.mockResolvedValue({
        id: 'cs_open_123',
        status: 'open' as const,
        url: 'https://checkout.stripe.com/pay/cs_open_123',
        paymentIntentId: null,
      });

      const result = await service.createCheckoutSession(orderId, locale, successUrl, cancelUrl);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual({
          sessionId: 'cs_open_123',
          url: 'https://checkout.stripe.com/pay/cs_open_123',
        });
      }
      expect(paymentRepository.findByIdempotencyKey).toHaveBeenCalledWith('checkout:order-1');
      expect(mockGateway.retrieveSession).toHaveBeenCalledWith('cs_open_123');
    });

    it('creates a new session successfully (real payment mode)', async () => {
      vi.mocked(orderRepository.findById).mockResolvedValue(makeOrder() as any);
      vi.mocked(paymentRepository.findByIdempotencyKey).mockResolvedValue(null);
      mockGateway.createCheckoutSession.mockResolvedValue({
        sessionId: 'cs_new_456',
        url: 'https://checkout.stripe.com/pay/cs_new_456',
      });
      vi.mocked(paymentRepository.create).mockResolvedValue(
        makePayment({ stripeSessionId: 'cs_new_456', id: 'pay-2' }) as any,
      );

      const result = await service.createCheckoutSession(orderId, locale, successUrl, cancelUrl);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value).toEqual({
          sessionId: 'cs_new_456',
          url: 'https://checkout.stripe.com/pay/cs_new_456',
        });
      }
      expect(mockGateway.createCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({ orderId, orderNumber: 'ORD-001' }),
      );
      expect(paymentRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId,
          stripeSessionId: 'cs_new_456',
          type: 'rental',
          amount: 104.5,
          currency: 'eur',
          idempotencyKey: 'checkout:order-1',
        }),
      );
      expect(eventBus.emit).not.toHaveBeenCalled();
    });

    it('auto-succeeds in mock payment mode', async () => {
      mockConfig.USE_MOCK_PAYMENT = true;
      vi.mocked(orderRepository.findById).mockResolvedValue(makeOrder() as any);
      vi.mocked(paymentRepository.findByIdempotencyKey).mockResolvedValue(null);
      mockGateway.createCheckoutSession.mockResolvedValue({
        sessionId: 'cs_mock_789',
        url: 'https://checkout.stripe.com/pay/cs_mock_789',
      });
      vi.mocked(paymentRepository.create).mockResolvedValue(
        makePayment({ stripeSessionId: 'cs_mock_789', id: 'pay-3' }) as any,
      );

      const result = await service.createCheckoutSession(orderId, locale, successUrl, cancelUrl);

      expect(result.ok).toBe(true);
      expect(paymentRepository.updateBySessionId).toHaveBeenCalledWith('cs_mock_789', {
        status: 'succeeded',
        stripePaymentIntent: 'mock_pi_cs_mock_789',
      });
      expect(eventBus.emit).toHaveBeenCalledWith(
        'PAYMENT_SUCCEEDED',
        expect.objectContaining({
          orderId,
          amount: 104.5,
        }),
      );
    });

    it('returns SESSION_CREATION_FAILED when gateway throws', async () => {
      vi.mocked(orderRepository.findById).mockResolvedValue(makeOrder() as any);
      vi.mocked(paymentRepository.findByIdempotencyKey).mockResolvedValue(null);
      mockGateway.createCheckoutSession.mockRejectedValue(new Error('Stripe API error'));

      const result = await service.createCheckoutSession(orderId, locale, successUrl, cancelUrl);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toEqual({
          type: 'SESSION_CREATION_FAILED',
          reason: 'Stripe API error',
        });
      }
    });

    it('creates new session when existing session is expired', async () => {
      vi.mocked(orderRepository.findById).mockResolvedValue(makeOrder() as any);
      vi.mocked(paymentRepository.findByIdempotencyKey).mockResolvedValue(
        makePayment({ stripeSessionId: 'cs_expired' }) as any,
      );
      mockGateway.retrieveSession.mockRejectedValue(new Error('No such session'));
      mockGateway.createCheckoutSession.mockResolvedValue({
        sessionId: 'cs_fresh',
        url: 'https://checkout.stripe.com/pay/cs_fresh',
      });
      vi.mocked(paymentRepository.create).mockResolvedValue(
        makePayment({ stripeSessionId: 'cs_fresh', id: 'pay-4' }) as any,
      );

      const result = await service.createCheckoutSession(orderId, locale, successUrl, cancelUrl);

      expect(result.ok).toBe(true);
      expect(paymentRepository.deleteByIdempotencyKey).toHaveBeenCalledWith('checkout:order-1');
      expect(mockGateway.createCheckoutSession).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // handleWebhook
  // ═══════════════════════════════════════════════════════════════

  describe('handleWebhook', () => {
    const payload = Buffer.from('test-payload');
    const signature = 'test-signature';

    it('skips verification in mock mode', async () => {
      mockConfig.USE_MOCK_PAYMENT = true;

      await service.handleWebhook(payload, signature);

      expect(mockConstructEvent).not.toHaveBeenCalled();
      expect(paymentRepository.updateBySessionId).not.toHaveBeenCalled();
    });

    it('throws ConflictError on invalid signature', async () => {
      mockConstructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      await expect(service.handleWebhook(payload, signature)).rejects.toThrow(ConflictError);
      await expect(service.handleWebhook(payload, signature)).rejects.toMatchObject({
        code: 'CONFLICT',
        statusCode: 409,
      });
    });

    it('no-ops when event was already processed (Redis dedupe)', async () => {
      const event = makeStripeEvent('checkout.session.completed', 'cs_dedupe', {
        orderId,
      });
      mockConstructEvent.mockReturnValue(event);
      mockRedis.get.mockResolvedValue('1');

      await service.handleWebhook(payload, signature);

      expect(mockRedis.get).toHaveBeenCalledWith('stripe:webhook:evt_cs_dedupe');
      expect(paymentRepository.updateBySessionId).not.toHaveBeenCalled();
      expect(eventBus.emit).not.toHaveBeenCalled();
    });

    it('processes checkout.session.completed event', async () => {
      const event = makeStripeEvent('checkout.session.completed', 'cs_ok', { orderId }, 'pi_456');
      mockConstructEvent.mockReturnValue(event);
      mockRedis.get.mockResolvedValue(null);
      vi.mocked(paymentRepository.updateBySessionId).mockResolvedValue(makePayment() as any);
      vi.mocked(orderRepository.findById).mockResolvedValue(makeOrder() as any);

      await service.handleWebhook(payload, signature);

      expect(paymentRepository.updateBySessionId).toHaveBeenCalledWith('cs_ok', {
        status: 'succeeded',
        stripePaymentIntent: 'pi_456',
      });
      expect(orderRepository.findById).toHaveBeenCalledWith(orderId);
      expect(eventBus.emit).toHaveBeenCalledWith(
        'PAYMENT_SUCCEEDED',
        expect.objectContaining({
          orderId,
          amount: 104.5,
        }),
      );
      expect(mockRedis.setex).toHaveBeenCalledWith('stripe:webhook:evt_cs_ok', 86400, '1');
    });

    it('skips checkout.session.completed processing when metadata is missing orderId', async () => {
      const event = makeStripeEvent('checkout.session.completed', 'cs_nometa');
      mockConstructEvent.mockReturnValue(event);
      mockRedis.get.mockResolvedValue(null);

      await service.handleWebhook(payload, signature);

      expect(paymentRepository.updateBySessionId).not.toHaveBeenCalled();
      expect(eventBus.emit).not.toHaveBeenCalled();
      expect(mockRedis.setex).toHaveBeenCalledWith('stripe:webhook:evt_cs_nometa', 86400, '1');
    });

    it('processes checkout.session.expired event', async () => {
      const event = makeStripeEvent('checkout.session.expired', 'cs_exp', {
        orderId,
      });
      mockConstructEvent.mockReturnValue(event);
      mockRedis.get.mockResolvedValue(null);

      await service.handleWebhook(payload, signature);

      expect(paymentRepository.updateBySessionId).toHaveBeenCalledWith('cs_exp', {
        status: 'failed',
      });
      expect(eventBus.emit).toHaveBeenCalledWith('PAYMENT_FAILED', {
        orderId,
        reason: 'checkout.session.expired',
      });
      expect(mockRedis.setex).toHaveBeenCalledWith('stripe:webhook:evt_cs_exp', 86400, '1');
    });

    it('processes payment_intent.payment_failed event', async () => {
      const event = makeStripeEvent('payment_intent.payment_failed', 'pi_fail', {
        orderId,
      });
      mockConstructEvent.mockReturnValue(event);
      mockRedis.get.mockResolvedValue(null);

      await service.handleWebhook(payload, signature);

      expect(paymentRepository.updateByPaymentIntentId).toHaveBeenCalledWith('pi_fail', {
        status: 'failed',
      });
      expect(eventBus.emit).toHaveBeenCalledWith('PAYMENT_FAILED', {
        orderId,
        reason: 'payment_intent.payment_failed',
      });
      expect(mockRedis.setex).toHaveBeenCalledWith('stripe:webhook:evt_pi_fail', 86400, '1');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // refundOrder
  // ═══════════════════════════════════════════════════════════════

  describe('refundOrder', () => {
    it('returns NO_PAYMENT when no rental payment exists', async () => {
      vi.mocked(paymentRepository.findByOrderId).mockResolvedValue([]);

      const result = await service.refundOrder(orderId);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toEqual({ type: 'NO_PAYMENT' });
      }
    });

    it('returns NO_PAYMENT when payment exists but has not succeeded', async () => {
      vi.mocked(paymentRepository.findByOrderId).mockResolvedValue([
        makePayment({ status: 'pending', stripePaymentIntent: null }) as any,
      ]);

      const result = await service.refundOrder(orderId);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toEqual({ type: 'NO_PAYMENT' });
      }
    });

    it('returns NO_PAYMENT when payment succeeded but has no stripePaymentIntent', async () => {
      vi.mocked(paymentRepository.findByOrderId).mockResolvedValue([
        makePayment({ status: 'succeeded', stripePaymentIntent: null }) as any,
      ]);

      const result = await service.refundOrder(orderId);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toEqual({ type: 'NO_PAYMENT' });
      }
    });

    it('updates status to refunded in mock mode', async () => {
      mockConfig.USE_MOCK_PAYMENT = true;
      const payment = makePayment({ id: 'pay-mock-refund' });
      vi.mocked(paymentRepository.findByOrderId).mockResolvedValue([payment as any]);
      vi.mocked(paymentRepository.updateStatus).mockResolvedValue(
        makePayment({ id: 'pay-mock-refund', status: 'refunded' }) as any,
      );

      const result = await service.refundOrder(orderId);

      expect(result.ok).toBe(true);
      expect(paymentRepository.updateStatus).toHaveBeenCalledWith('pay-mock-refund', 'refunded');
      expect(mockGateway.createRefund).not.toHaveBeenCalled();
    });

    it('calls gateway and updates status for a real refund', async () => {
      const payment = makePayment({ id: 'pay-real' });
      vi.mocked(paymentRepository.findByOrderId).mockResolvedValue([payment as any]);
      mockGateway.createRefund.mockResolvedValue({
        id: 're_123',
        status: 'succeeded',
      });
      vi.mocked(paymentRepository.updateStatus).mockResolvedValue(
        makePayment({ id: 'pay-real', status: 'refunded' }) as any,
      );

      const result = await service.refundOrder(orderId, undefined, 'requested_by_customer');

      expect(result.ok).toBe(true);
      expect(mockGateway.createRefund).toHaveBeenCalledWith({
        paymentIntentId: 'pi_test_123',
        amount: undefined,
        reason: 'requested_by_customer',
        metadata: { orderId },
      });
      expect(paymentRepository.updateStatus).toHaveBeenCalledWith('pay-real', 'refunded');
    });

    it('sets partially_refunded when amount is specified', async () => {
      const payment = makePayment({ id: 'pay-partial' });
      vi.mocked(paymentRepository.findByOrderId).mockResolvedValue([payment as any]);
      mockGateway.createRefund.mockResolvedValue({
        id: 're_456',
        status: 'succeeded',
      });
      vi.mocked(paymentRepository.updateStatus).mockResolvedValue(
        makePayment({ id: 'pay-partial', status: 'partially_refunded' }) as any,
      );

      const result = await service.refundOrder(orderId, 50);

      expect(result.ok).toBe(true);
      expect(mockGateway.createRefund).toHaveBeenCalledWith({
        paymentIntentId: 'pi_test_123',
        amount: 50,
        reason: undefined,
        metadata: { orderId },
      });
      expect(paymentRepository.updateStatus).toHaveBeenCalledWith(
        'pay-partial',
        'partially_refunded',
      );
    });

    it('returns REFUND_FAILED when gateway throws', async () => {
      const payment = makePayment({ id: 'pay-fail' });
      vi.mocked(paymentRepository.findByOrderId).mockResolvedValue([payment as any]);
      mockGateway.createRefund.mockRejectedValue(new Error('Refund declined'));

      const result = await service.refundOrder(orderId);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toEqual({
          type: 'REFUND_FAILED',
          message: 'Refund declined',
        });
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // getOrderPayments
  // ═══════════════════════════════════════════════════════════════

  describe('getOrderPayments', () => {
    it('returns payments for a valid order', async () => {
      vi.mocked(orderRepository.findById).mockResolvedValue(makeOrder() as any);
      const payments = [makePayment()];
      vi.mocked(paymentRepository.findByOrderId).mockResolvedValue(payments as any);

      const result = await service.getOrderPayments(orderId);

      expect(result).toEqual(payments);
      expect(orderRepository.findById).toHaveBeenCalledWith(orderId);
      expect(paymentRepository.findByOrderId).toHaveBeenCalledWith(orderId);
    });

    it('throws NotFoundError when order does not exist', async () => {
      vi.mocked(orderRepository.findById).mockResolvedValue(null);

      await expect(service.getOrderPayments(orderId)).rejects.toMatchObject({
        code: 'NOT_FOUND',
        statusCode: 404,
      });
    });
  });
});
