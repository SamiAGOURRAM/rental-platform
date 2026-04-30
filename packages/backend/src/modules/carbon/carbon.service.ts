import { carbonRepository } from './carbon.repository.js';
import { luggageWeightFormula } from './formulas/luggage-weight.formula.js';
import { reuseSavingsFormula } from './formulas/reuse-savings.formula.js';
import { prisma } from '../../config/database.js';
import type { OrderId, UserId } from '../../common/types/branded.js';
import type { CarbonSaving } from '@prisma/client';

const FORMULA_VERSION = 1;

export interface CarbonEquivalents {
  carKmAvoided: number; // 1 kg CO2 ≈ 4.76 km at 0.21 kg/km
  treeDaysAbsorbed: number; // 1 tree absorbs ~22 kg CO2/year → 0.0603 kg/day
  smartphoneCharges: number; // 1 charge ≈ 0.008 kg CO2
  shortHaulFlightKm: number; // short-haul: ~0.17 kg CO2 per km per passenger
}

export interface UserCarbonStats {
  totalCo2SavedKg: number;
  totalItemsReused: number;
  totalWeightAvoidedKg: number;
  orderCount: number;
  equivalents: CarbonEquivalents;
}

export interface PlatformCarbonStats {
  totalCo2SavedKg: number;
  totalItemsReused: number;
  totalOrders: number;
  equivalents: CarbonEquivalents;
}

function toEquivalents(co2Kg: number): CarbonEquivalents {
  return {
    carKmAvoided: Math.round(co2Kg / 0.21),
    treeDaysAbsorbed: Math.round(co2Kg / 0.0603),
    smartphoneCharges: Math.round(co2Kg / 0.008),
    shortHaulFlightKm: Math.round(co2Kg / 0.17),
  };
}

export class CarbonService {
  async calculateForOrder(orderId: OrderId): Promise<CarbonSaving> {
    // Avoid double-calculating
    const existing = await carbonRepository.findByOrderId(orderId);
    if (existing) return existing;

    // Fetch order items with product weight and category
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              include: { category: true },
            },
          },
        },
      },
    });

    if (!order) throw new Error(`Order ${orderId} not found`);

    // Expand quantity — one formula input per physical unit rented
    const formulaInputs = order.items.flatMap((item) =>
      Array.from({ length: item.quantity }, () => ({
        weightGrams: item.product.weightGrams,
        categorySlug: item.product.category.slug,
      })),
    );

    const luggageCo2Kg = luggageWeightFormula.calculate(formulaInputs);
    const reuseCo2Kg = reuseSavingsFormula.calculate(formulaInputs);
    const totalCo2Kg = Math.round((luggageCo2Kg + reuseCo2Kg) * 1000) / 1000;
    const weightAvoidedKg = formulaInputs.reduce((sum, i) => sum + i.weightGrams / 1000, 0);

    const saving = await carbonRepository.create({
      userId: order.userId as UserId,
      orderId,
      luggageCo2Kg,
      reuseCo2Kg,
      totalCo2Kg,
      itemsReused: order.items.reduce((sum, it) => sum + it.quantity, 0),
      weightAvoidedKg: Math.round(weightAvoidedKg * 1000) / 1000,
      calculationVersion: FORMULA_VERSION,
    });

    // Update order with carbon saved
    await prisma.order.update({
      where: { id: orderId },
      data: { carbonSavedKg: totalCo2Kg },
    });

    return saving;
  }

  async getUserCarbonStats(userId: UserId): Promise<UserCarbonStats> {
    const stats = await carbonRepository.getUserStats(userId);
    return {
      totalCo2SavedKg: stats.totalCo2Kg,
      totalItemsReused: stats.totalItemsReused,
      totalWeightAvoidedKg: stats.totalWeightAvoidedKg,
      orderCount: stats.orderCount,
      equivalents: toEquivalents(stats.totalCo2Kg),
    };
  }

  async getPlatformStats(): Promise<PlatformCarbonStats> {
    const stats = await carbonRepository.getPlatformStats();
    return {
      totalCo2SavedKg: stats.totalCo2Kg,
      totalItemsReused: stats.totalItemsReused,
      totalOrders: stats.totalOrders,
      equivalents: toEquivalents(stats.totalCo2Kg),
    };
  }
}

export const carbonService = new CarbonService();
