import Stripe from 'stripe';
import { config } from '../../config/index.js';

/** Singleton Stripe client */
export const stripe = new Stripe(config.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
  typescript: true,
});

export type { Stripe };
