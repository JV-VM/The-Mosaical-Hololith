import 'dotenv/config';
import { z } from 'zod';

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
