import { prisma } from '../../config/database.js';
import type { CarbonSaving } from '@prisma/client';
import type { OrderId, UserId } from '../../common/types/branded.js';

export class CarbonRepository {
  async findByOrderId(orderId: OrderId): Promise<CarbonSaving | null> {
    return prisma.carbonSaving.findUnique({ where: { orderId } });
  }

  async create(data: {
    userId: UserId;
    orderId: OrderId;
    luggageCo2Kg: number;
    reuseCo2Kg: number;
    totalCo2Kg: number;
    itemsReused: number;
    weightAvoidedKg: number;
    calculationVersion: number;
  }): Promise<CarbonSaving> {
    return prisma.carbonSaving.create({ data });
  }

  async getUserStats(userId: UserId): Promise<{
    totalCo2Kg: number;
    totalItemsReused: number;
    totalWeightAvoidedKg: number;
    orderCount: number;
  }> {
    const result = await prisma.carbonSaving.aggregate({
      where: { userId },
      _sum: {
        totalCo2Kg: true,
        itemsReused: true,
        weightAvoidedKg: true,
      },
      _count: { id: true },
    });

    return {
      totalCo2Kg: Number(result._sum.totalCo2Kg ?? 0),
      totalItemsReused: result._sum.itemsReused ?? 0,
      totalWeightAvoidedKg: Number(result._sum.weightAvoidedKg ?? 0),
      orderCount: result._count.id,
    };
  }

  async getPlatformStats(): Promise<{
    totalCo2Kg: number;
    totalItemsReused: number;
    totalOrders: number;
  }> {
    const result = await prisma.carbonSaving.aggregate({
      _sum: { totalCo2Kg: true, itemsReused: true },
      _count: { id: true },
    });

    return {
      totalCo2Kg: Number(result._sum.totalCo2Kg ?? 0),
      totalItemsReused: result._sum.itemsReused ?? 0,
      totalOrders: result._count.id,
    };
  }
}

export const carbonRepository = new CarbonRepository();
