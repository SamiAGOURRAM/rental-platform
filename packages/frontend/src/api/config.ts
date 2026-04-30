import { fetchApi } from './client';

export interface DeliveryMethodConfig {
  value: 'personal' | 'mondial_relay' | 'chronopost' | 'colissimo';
  labelKey: string;
  descriptionKey: string;
  outboundFee: number;
  returnFee: number;
  totalFee: number;
}

export interface AppConfig {
  deliveryMethods: DeliveryMethodConfig[];
  defaultCity: string;
  defaultLocale: string;
  currency: string;
  mockPayment: boolean;
}

export function getAppConfig(): Promise<AppConfig> {
  return fetchApi('/config');
}
