import type { Product } from '@prisma/client';
import type { DeliveryMethod } from '@prisma/client';
import { rentalDays } from '../../common/utils/date.js';
import type { DateRange } from '../../common/utils/date.js';
import { CONDITION_PRICE_FACTOR } from '../inventory/lifecycle.service.js';
import { getDeliveryFee } from '../delivery/delivery.config.js';

export interface PriceBreakdown {
  subtotal: number;
  deliveryFee: number;
  depositAmount: number;
  total: number;
  itemPrices: Array<{ productId: string; pricePerDay: number; days: number; lineTotal: number }>;
  days: number;
}

export function calculatePrice(
  products: Pick<Product, 'id' | 'rentalPricePerDay' | 'condition'>[],
  dateRange: DateRange,
  deliveryMethod: DeliveryMethod,
): PriceBreakdown {
  const days = rentalDays(dateRange);

  const itemPrices = products.map((product) => {
    const basePrice = Number(product.rentalPricePerDay);
    const conditionFactor = CONDITION_PRICE_FACTOR[product.condition];
    const pricePerDay = Math.round(basePrice * conditionFactor * 100) / 100;
    const lineTotal = Math.round(pricePerDay * days * 100) / 100;
    return {
      productId: product.id,
      pricePerDay,
      days,
      lineTotal,
    };
  });

  const subtotal = itemPrices.reduce((sum, item) => sum + item.lineTotal, 0);
  const deliveryFee = getDeliveryFee(deliveryMethod);
  const depositAmount = Math.max(30, Math.round(subtotal * 0.5 * 100) / 100);
  const total = Math.round((subtotal + deliveryFee) * 100) / 100;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    deliveryFee,
    depositAmount,
    total,
    itemPrices,
    days,
  };
}
