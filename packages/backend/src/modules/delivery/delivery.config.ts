import type { DeliveryMethod } from '@prisma/client';

export interface DeliveryOption {
  value: DeliveryMethod;
  labelKey: string;
  descriptionKey: string;
  outboundFee: number;
  returnFee: number;
  totalFee: number;
}

export const DELIVERY_METHODS: DeliveryOption[] = [
  {
    value: 'personal',
    labelKey: 'delivery.method.personal.label',
    descriptionKey: 'delivery.method.personal.description',
    outboundFee: 0,
    returnFee: 0,
    totalFee: 0,
  },
  {
    value: 'mondial_relay',
    labelKey: 'delivery.method.mondialRelay.label',
    descriptionKey: 'delivery.method.mondialRelay.description',
    outboundFee: 4.5,
    returnFee: 4.5,
    totalFee: 9.0,
  },
  {
    value: 'chronopost',
    labelKey: 'delivery.method.chronopost.label',
    descriptionKey: 'delivery.method.chronopost.description',
    outboundFee: 9.9,
    returnFee: 9.9,
    totalFee: 19.8,
  },
  {
    value: 'colissimo',
    labelKey: 'delivery.method.colissimo.label',
    descriptionKey: 'delivery.method.colissimo.description',
    outboundFee: 7.0,
    returnFee: 7.0,
    totalFee: 14.0,
  },
];

export function getDeliveryFee(method: DeliveryMethod): number {
  const option = DELIVERY_METHODS.find((m) => m.value === method);
  return option?.totalFee ?? 0;
}

export function getDeliveryFeeOutbound(method: DeliveryMethod): number {
  const option = DELIVERY_METHODS.find((m) => m.value === method);
  return option?.outboundFee ?? 0;
}

export function getDeliveryConfig(): { outbound: number; return: number } {
  return { outbound: 0, return: 0 };
}
