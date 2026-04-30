import { prisma } from '../../config/database.js';
import type { Delivery, DeliveryStatus, Prisma } from '@prisma/client';
import type { OrderId, DeliveryId } from '../../common/types/branded.js';

export class DeliveryRepository {
  async findByOrderId(orderId: OrderId): Promise<Delivery[]> {
    return prisma.delivery.findMany({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: DeliveryId): Promise<Delivery | null> {
    return prisma.delivery.findUnique({ where: { id } });
  }

  async create(data: Prisma.DeliveryCreateInput): Promise<Delivery> {
    return prisma.delivery.create({ data });
  }

  async updateStatus(
    id: DeliveryId,
    status: DeliveryStatus,
    timestamps: {
      pickedUpAt?: Date;
      deliveredAt?: Date;
    } = {},
  ): Promise<Delivery> {
    return prisma.delivery.update({
      where: { id },
      data: { status, ...timestamps },
    });
  }

  async findUpcoming(limit: number): Promise<Delivery[]> {
    return prisma.delivery.findMany({
      where: {
        status: { in: ['scheduled', 'picked_up', 'in_transit'] },
        scheduledAt: { gte: new Date() },
      },
      orderBy: { scheduledAt: 'asc' },
      take: limit,
    });
  }
}

export const deliveryRepository = new DeliveryRepository();
