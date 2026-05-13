import 'dotenv/config';
import { z } from 'zod';

const BillingProviderNameSchema = z.enum([
  'stub',
  'stripe',
  'payoneer',
  'mercado_pago',
]);

const splitCsv = (value: string) =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const parseJsonRecord = (value: string) => {
  const parsed: unknown = JSON.parse(value);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Expected JSON object');
  }

  return parsed as Record<string, string>;
};

const EnvSchema = z.object({
  NODE_ENV: z.string().default('production'),
  PORT: z.coerce.number().default(3000),

  DATABASE_URL: z.string().min(1),
  MIGRATE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRES_IN: z.coerce.number().default(900),
  JWT_REFRESH_SECRET: z.string().min(15),
  JWT_REFRESH_EXPIRES_IN: z.coerce.number().default(2592000),
  MEDIA_STORAGE_DRIVER: z.enum(['local']).default('local'),
  MEDIA_LOCAL_DIR: z.string().default('.tmp/media'),
  MEDIA_MAX_UPLOAD_BYTES: z.coerce.number().default(5 * 1024 * 1024),
  BILLING_PROVIDER: BillingProviderNameSchema.default('stub'),
  BILLING_LOCAL_PROVIDER: z.enum(['stub']).default('stub'),
  BILLING_DEFAULT_PROVIDER: BillingProviderNameSchema.default('stub'),
  BILLING_NATIONAL_PROVIDER: BillingProviderNameSchema.default('mercado_pago'),
  BILLING_NATIONAL_COUNTRIES: z
    .string()
    .default('BR')
    .transform((value) => splitCsv(value).map((item) => item.toUpperCase())),
  BILLING_NATIONAL_CURRENCIES: z
    .string()
    .default('BRL')
    .transform((value) => splitCsv(value).map((item) => item.toUpperCase())),
  BILLING_INTERNATIONAL_PROVIDERS: z
    .string()
    .default('stripe,payoneer')
    .transform((value) =>
      splitCsv(value).map((item) => BillingProviderNameSchema.parse(item)),
    ),
  BILLING_APP_BASE_URL: z.string().url().default('http://localhost:3100'),
  BILLING_WEBHOOK_SECRET: z
    .string()
    .min(16)
    .default('local-billing-webhook-secret'),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PRICE_MAP: z
    .string()
    .default('{}')
    .transform((value) => parseJsonRecord(value)),
  MERCADO_PAGO_ACCESS_TOKEN: z.string().optional(),
  MERCADO_PAGO_PREAPPROVAL_PLAN_MAP: z
    .string()
    .default('{}')
    .transform((value) => parseJsonRecord(value)),
  CORS_ORIGIN: z
    .string()
    .default('http://localhost:4200')
    .transform((v) =>
      v
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    ),
});

export const env = EnvSchema.parse(process.env);
