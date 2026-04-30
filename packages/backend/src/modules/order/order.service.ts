import { prisma } from '../../config/database.js';
import { orderRepository } from './order.repository.js';
import { availabilityService } from '../catalog/availability.service.js';
import { calculatePrice } from './pricing.service.js';
import { applyTransition, findTransition } from './order-state-machine.js';
import { eventBus } from '../../common/events/event-bus.js';
import { NotFoundError, ForbiddenError, ConflictError } from '../../common/errors/index.js';
import { paymentService } from '../payment/payment.service.js';
import { generateOrderNumber } from '../../common/utils/order-number.js';
import { buildPaginatedResult } from '../../common/utils/pagination.js';
import { computeNextCycle } from '../inventory/lifecycle.service.js';
import type { Result } from '../../common/types/result.js';
import { ok, fail } from '../../common/types/result.js';
import type { OrderId, UserId, ProductId, AddressId } from '../../common/types/branded.js';
import type { PaginationParams } from '../../common/types/pagination.js';
import type { Order, OrderStatus, ProductStatus, UserRole, DeliveryMethod } from '@prisma/client';
import type { DateRange } from '../../common/utils/date.js';
import { parseDate } from '../../common/utils/date.js';

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

/** Map a destination order status to the unit status it implies. */
function unitStatusForOrderStatus(orderStatus: OrderStatus): ProductStatus | null {
  switch (orderStatus) {
    case 'pending_payment':
    case 'confirmed':
    case 'preparing':
      return 'reserved';
    case 'out_for_delivery':
    case 'delivered':
    case 'active_rental':
    case 'return_initiated':
    case 'return_in_transit':
      return 'rented';
    case 'returned':
    case 'inspecting':
      return 'in_inspection';
    case 'completed':
    case 'cancelled':
    case 'refunded':
      return null; // special-cased below
    default:
      return null;
  }
}

/** Apply the unit-level side effects of a status transition inside the given tx. */
async function applyUnitLifecycle(tx: Tx, orderId: OrderId, newStatus: OrderStatus): Promise<void> {
  const unitIds = await tx.orderItem
    .findMany({ where: { orderId }, select: { unitIds: true } })
    .then((items) =>
      items.flatMap((i) =>
        Array.isArray(i.unitIds) ? i.unitIds.filter((v): v is string => typeof v === 'string') : [],
      ),
    );

  if (unitIds.length === 0) return;

  // cancelled / refunded: release reserved units back to available. Units already in `rented`/return pipeline
  // are left alone — those require the return flow to come back.
  if (newStatus === 'cancelled' || newStatus === 'refunded') {
    await tx.inventoryUnit.updateMany({
      where: { id: { in: unitIds }, status: 'reserved' },
      data: { status: 'available' },
    });
    return;
  }

  // completed: inspection done → cycle+1, back to `available` (or `retired` if end-of-life).
  if (newStatus === 'completed') {
    const units = await tx.inventoryUnit.findMany({
      where: { id: { in: unitIds } },
      include: { product: { select: { maxCycles: true } } },
    });
    for (const u of units) {
      const { newCycleCount, newCondition, isEndOfLife } = computeNextCycle(
        u.cycleCount,
        u.product.maxCycles,
      );
      await tx.inventoryUnit.update({
        where: { id: u.id },
        data: {
          cycleCount: newCycleCount,
          condition: newCondition,
          status: isEndOfLife ? 'retired' : 'available',
          ...(isEndOfLife && { retiredAt: new Date() }),
        },
      });
    }
    return;
  }

  const target = unitStatusForOrderStatus(newStatus);
  if (!target) return;
  await tx.inventoryUnit.updateMany({
    where: { id: { in: unitIds } },
    data: { status: target },
  });
}
export interface OrderLineInput {
  productId: ProductId;
  quantity: number;
  city: string;
}

export interface CreateOrderInput {
  userId: UserId;
  /** Preferred: explicit line items with qty + city. */
  items?: OrderLineInput[];
  /** Legacy: flat list of productIds (each becomes qty=1, city defaults to 'paris'). */
  productIds?: ProductId[];
  rentalStart: string; // YYYY-MM-DD
  rentalEnd: string; // YYYY-MM-DD
  deliveryMethod: DeliveryMethod;
  addressId: AddressId;
  locale?: string;
  notes?: string;
}

export type OrderError =
  | { type: 'PRODUCT_UNAVAILABLE'; unavailable: Array<{ productId: string; reason: string }> }
  | { type: 'INVALID_DATE_RANGE'; reason: string }
  | { type: 'MIN_RENTAL_DAYS'; minimum: number }
  | { type: 'PRODUCTS_NOT_FOUND'; missing: string[] };

export interface UserOrdersFilter {
  status?: OrderStatus;
  fromDate?: Date;
}

const MIN_RENTAL_DAYS = 1;

export class OrderService {
  async createOrder(
    input: CreateOrderInput,
  ): Promise<Result<Awaited<ReturnType<typeof orderRepository.create>>, OrderError>> {
    const rentalStart = parseDate(input.rentalStart);
    const rentalEnd = parseDate(input.rentalEnd);

    if (rentalEnd < rentalStart) {
      return fail({ type: 'INVALID_DATE_RANGE', reason: 'End date must be after start date' });
    }

    const dateRange: DateRange = { start: rentalStart, end: rentalEnd };
    const days = Math.ceil((rentalEnd.getTime() - rentalStart.getTime()) / 86400000) + 1;

    if (days < MIN_RENTAL_DAYS) {
      return fail({ type: 'MIN_RENTAL_DAYS', minimum: MIN_RENTAL_DAYS });
    }

    // Normalize input to line items
    const lineItems: OrderLineInput[] = input.items
      ? input.items
      : (input.productIds ?? []).map((id) => ({ productId: id, quantity: 1, city: 'paris' }));

    if (lineItems.length === 0) {
      return fail({ type: 'PRODUCTS_NOT_FOUND', missing: [] });
    }

    // Atomic: check availability + reserve + create order in a single transaction
    const cities = new Set(lineItems.map((it) => it.city));
    const result = await prisma.$transaction(async (tx) => {
      // 1. Re-check availability
      const availCheck = await availabilityService.checkLineItems(lineItems, dateRange);
      if (!availCheck.ok) {
        throw new ConflictError('Products unavailable', availCheck.unavailable);
      }

      // 2. Fetch product details
      const productIds = lineItems.map((it) => it.productId);
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, rentalPricePerDay: true, condition: true },
      });

      if (products.length !== new Set(productIds).size) {
        const found = new Set(products.map((p) => p.id));
        const missing = productIds.filter((id) => !found.has(id));
        throw new ConflictError('Some products not found', { missing });
      }

      // 3. Allocate specific inventory units per line
      const allocatedUnits = new Map<number, string[]>();
      for (let i = 0; i < lineItems.length; i++) {
        const line = lineItems[i]!;
        const unitIds = await availabilityService.allocateUnits(
          line.productId as unknown as string,
          line.city,
          line.quantity,
          dateRange,
          tx,
        );
        allocatedUnits.set(i, unitIds);
      }

      // 4. Pricing — expand qty into one pricing entry per unit
      const pricingProducts = lineItems.flatMap((line) => {
        const p = products.find((pr) => pr.id === line.productId)!;
        return Array.from({ length: line.quantity }, () => p);
      });
      const price = calculatePrice(pricingProducts, dateRange, input.deliveryMethod);

      // 5. Create order
      const productById = new Map(products.map((p) => [p.id, p]));
      const order = await tx.order.create({
        data: {
          userId: input.userId,
          addressId: input.addressId,
          orderNumber: generateOrderNumber(),
          status: 'pending_payment',
          rentalStart,
          rentalEnd,
          deliveryMethod: input.deliveryMethod,
          subtotal: price.subtotal,
          deliveryFee: price.deliveryFee,
          depositAmount: price.depositAmount,
          total: price.total,
          locale: input.locale ?? 'fr',
          notes: input.notes,
          items: {
            create: lineItems.map((line, idx) => {
              const product = productById.get(line.productId as unknown as string)!;
              return {
                productId: line.productId,
                quantity: line.quantity,
                city: line.city,
                unitIds: allocatedUnits.get(idx) ?? [],
                priceAtTime: Number(product.rentalPricePerDay),
                conditionAtRent: product.condition,
                cycleAtRent: 0,
              };
            }),
          },
          statusHistory: {
            create: { toStatus: 'pending_payment', changedBy: input.userId },
          },
        },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  nameEn: true,
                  nameFr: true,
                  nameEs: true,
                  brand: true,
                  images: { where: { isPrimary: true }, take: 1 },
                },
              },
            },
          },
        },
      });

      // 6. Mark those specific units as reserved
      const allUnitIds = Array.from(allocatedUnits.values()).flat();
      if (allUnitIds.length > 0) {
        await tx.inventoryUnit.updateMany({
          where: { id: { in: allUnitIds } },
          data: { status: 'reserved' },
        });
      }

      return order;
    });

    // Invalidate availability cache for all affected cities
    for (const city of cities) {
      await availabilityService.invalidateCache(city);
    }

    return ok(result);
  }

  async getOrder(orderId: OrderId, requesterId: UserId, requesterRole: UserRole) {
    const order = await orderRepository.findById(orderId);
    if (!order) throw new NotFoundError('Order', orderId);

    // Customers can only see their own orders
    if (requesterRole === 'customer' && order.userId !== requesterId) {
      throw new ForbiddenError('You do not have access to this order');
    }

    return order;
  }

  async getUserOrders(userId: UserId, pagination: PaginationParams, filter?: UserOrdersFilter) {
    const { items, total } = await orderRepository.findByUserId(
      userId,
      pagination.limit,
      pagination.cursor,
      filter,
    );
    return buildPaginatedResult(items, pagination.limit, total);
  }

  async transitionStatus(
    orderId: OrderId,
    newStatus: OrderStatus,
    actor: { id: UserId; role: UserRole },
    reason?: string,
  ): Promise<Order> {
    const order = await orderRepository.findById(orderId);
    if (!order) throw new NotFoundError('Order', orderId);

    const transitionName = findTransition(order.status, newStatus);
    if (!transitionName) {
      throw new ConflictError(`Cannot transition order from '${order.status}' to '${newStatus}'`);
    }

    const productIds = await orderRepository.getItemProductIds(orderId);

    const result = applyTransition(transitionName, order.status, actor, {
      orderId,
      userId: order.userId as UserId,
      itemIds: productIds,
      previousStatus: order.status,
    });

    if (!result.ok) {
      if (result.error.type === 'UNAUTHORIZED') {
        throw new ForbiddenError(`Required role: ${result.error.requiredRoles.join(' or ')}`);
      }
      throw new ConflictError(`Invalid transition: ${order.status} → ${newStatus}`);
    }

    // Atomic: order status update + unit lifecycle + history row in one tx
    const updated = await prisma.$transaction(async (tx) => {
      const o = await tx.order.update({
        where: { id: orderId },
        data: { status: result.value.newStatus },
      });
      await tx.orderStatusHistory.create({
        data: {
          orderId,
          fromStatus: order.status,
          toStatus: result.value.newStatus,
          changedBy: actor.id,
          reason,
        },
      });
      await applyUnitLifecycle(tx, orderId, result.value.newStatus);
      return o;
    });

    // Invalidate availability cache for all cities that this order touches
    const cities = await prisma.orderItem.findMany({
      where: { orderId },
      select: { city: true },
      distinct: ['city'],
    });
    for (const c of cities) {
      await availabilityService.invalidateCache(c.city);
    }

    // Emit domain events
    for (const event of result.value.events) {
      eventBus.emitEvent(event);
    }

    return updated;
  }

  async cancelOrder(orderId: OrderId, actor: { id: UserId; role: UserRole }): Promise<Order> {
    const order = await orderRepository.findById(orderId);
    if (!order) throw new NotFoundError('Order', orderId);

    // If order is already paid (status beyond pending_payment), attempt refund
    if (order.status !== 'pending_payment') {
      const refundResult = await paymentService.refundOrder(
        orderId,
        undefined,
        'Order cancelled by user',
      );
      if (!refundResult.ok) {
        console.warn(
          `[OrderService] Refund failed for cancelled order ${orderId}:`,
          refundResult.error,
        );
      }
    }

    return this.transitionStatus(orderId, 'cancelled', actor, 'Cancelled by user');
  }

  async initiateReturn(orderId: OrderId, actor: { id: UserId; role: UserRole }): Promise<Order> {
    return this.transitionStatus(orderId, 'return_initiated', actor);
  }
}

export const orderService = new OrderService();
