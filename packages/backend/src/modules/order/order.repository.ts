import { prisma } from '../../config/database.js';
import type { Order, OrderItem, OrderStatusHistory, Prisma, OrderStatus } from '@prisma/client';
import type { OrderId, UserId, ProductId } from '../../common/types/branded.js';
import { decodeCursor } from '../../common/utils/pagination.js';

type OrderWithItems = Order & {
  items: (OrderItem & {
    product: {
      id: string;
      nameEn: string;
      nameFr: string;
      nameEs: string;
      brand: string;
      images: { url: string }[];
    };
  })[];
};

interface FindByUserIdFilter {
  status?: OrderStatus;
  fromDate?: Date;
}

function isUuid(value: string): boolean {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
    value,
  );
}

function resolveCursorId(cursor?: string): string | undefined {
  if (!cursor) return undefined;

  if (isUuid(cursor)) return cursor;

  try {
    const decoded = decodeCursor(cursor);
    if (isUuid(decoded)) return decoded;
  } catch {
    return undefined;
  }

  return undefined;
}

export class OrderRepository {
  async findById(id: OrderId): Promise<OrderWithItems | null> {
    return prisma.order.findUnique({
      where: { id },
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
  }

  async findByUserId(
    userId: UserId,
    limit: number,
    cursor?: string,
    filter?: FindByUserIdFilter,
  ): Promise<{ items: OrderWithItems[]; total: number }> {
    const where: Prisma.OrderWhereInput = {
      userId,
      ...(filter?.status ? { status: filter.status } : {}),
      ...(filter?.fromDate ? { createdAt: { gte: filter.fromDate } } : {}),
    };
    const cursorId = resolveCursorId(cursor);

    const [items, total] = await Promise.all([
      prisma.order.findMany({
        where,
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
        take: limit + 1,
        ...(cursorId && { skip: 1, cursor: { id: cursorId } }),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.order.count({ where }),
    ]);
    return { items, total };
  }

  async findAll(
    filter: { status?: OrderStatus; userId?: string },
    limit: number,
    cursor?: string,
  ): Promise<{ items: OrderWithItems[]; total: number }> {
    const where: Prisma.OrderWhereInput = {
      ...(filter.status && { status: filter.status }),
      ...(filter.userId && { userId: filter.userId }),
    };
    const cursorId = resolveCursorId(cursor);

    const [items, total] = await Promise.all([
      prisma.order.findMany({
        where,
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
        take: limit + 1,
        ...(cursorId && { skip: 1, cursor: { id: cursorId } }),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.order.count({ where }),
    ]);
    return { items, total };
  }

  async create(data: Prisma.OrderCreateInput): Promise<OrderWithItems> {
    return prisma.order.create({
      data,
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
  }

  async updateStatus(
    id: OrderId,
    status: OrderStatus,
    changedBy: UserId,
    previousStatus: OrderStatus,
    reason?: string,
  ): Promise<Order> {
    return prisma.$transaction(async (tx) => {
      const order = await tx.order.update({ where: { id }, data: { status } });
      await tx.orderStatusHistory.create({
        data: { orderId: id, fromStatus: previousStatus, toStatus: status, changedBy, reason },
      });
      return order;
    });
  }

  async getStatusHistory(id: OrderId): Promise<OrderStatusHistory[]> {
    return prisma.orderStatusHistory.findMany({
      where: { orderId: id },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getItemProductIds(orderId: OrderId): Promise<ProductId[]> {
    const items = await prisma.orderItem.findMany({
      where: { orderId },
      select: { productId: true },
    });
    return items.map((i) => i.productId as ProductId);
  }

  /** Collect every inventoryUnit ID allocated to this order across all line items. */
  async getItemUnitIds(orderId: OrderId): Promise<string[]> {
    const items = await prisma.orderItem.findMany({
      where: { orderId },
      select: { unitIds: true },
    });
    const out: string[] = [];
    for (const it of items) {
      if (Array.isArray(it.unitIds)) {
        for (const id of it.unitIds) {
          if (typeof id === 'string') out.push(id);
        }
      }
    }
    return out;
  }
}

export const orderRepository = new OrderRepository();
