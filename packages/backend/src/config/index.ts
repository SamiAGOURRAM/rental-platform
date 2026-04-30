import { z } from 'zod';

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),

  // Database
  DATABASE_URL: z.string().url(),

  // Redis
  REDIS_URL: z.string().url(),

  // Auth
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('30d'),

  // Stripe
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),
  STRIPE_CURRENCY: z.string().length(3).default('eur'),
  USE_MOCK_PAYMENT: z.coerce.boolean().default(false),

  // Storage
  STORAGE_BUCKET_URL: z.string().url(),

  // Email
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email().default('noreply@localhost'),

  // Delivery
  DELIVERY_METHODS: z
    .object({
      personal: z.object({ outbound: z.number(), return: z.number() }),
      mondial_relay: z.object({ outbound: z.number(), return: z.number() }),
      chronopost: z.object({ outbound: z.number(), return: z.number() }),
      colissimo: z.object({ outbound: z.number(), return: z.number() }),
    })
    .default({
      personal: { outbound: 0, return: 0 },
      mondial_relay: { outbound: 4.5, return: 4.5 },
      chronopost: { outbound: 9.9, return: 9.9 },
      colissimo: { outbound: 7.0, return: 7.0 },
    }),
  DEFAULT_CITY: z.string().default('paris'),
  DEFAULT_LOCALE: z.enum(['en', 'fr', 'es']).default('fr'),
  CORS_ORIGINS: z.string().default('http://localhost:3001'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
});

function loadConfig() {
  const result = configSchema.safeParse(process.env);

  if (!result.success) {
    const missing = result.error.errors
      .map((e) => `  ${e.path.join('.')}: ${e.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${missing}`);
  }

  return result.data;
}

export const config = loadConfig();
export type Config = typeof config;
