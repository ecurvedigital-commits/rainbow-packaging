import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  APP_TIMEZONE: z.string().default('Asia/Kolkata'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  LOG_LEVEL: z.string().default('info'),

  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  MONGODB_DB_NAME: z.string().default('rainbow_dev'),

  JWT_ACCESS_SECRET: z.string().min(16, 'JWT_ACCESS_SECRET must be at least 16 characters'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().min(16, 'JWT_REFRESH_SECRET must be at least 16 characters'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  BCRYPT_SALT_ROUNDS: z.coerce.number().default(12),
  COOKIE_SECURE: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(false),
  COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),

  AGING_THRESHOLD_DAYS: z.coerce.number().default(30),
  DIGEST_ENABLED: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(true),
  DIGEST_TIME: z.string().default('20:00'),

  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: z.coerce.number().optional().default(587),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  EMAIL_FROM: z.string().default('Rainbow Packages <no-reply@example.com>'),

  SEED_ADMIN_NAME: z.string().optional().default('Admin'),
  SEED_ADMIN_USERNAME: z.string().optional().default('admin'),
  SEED_ADMIN_EMAIL: z.string().optional().default('admin@rainbowpackages.com'),
  SEED_ADMIN_PASSWORD: z.string().optional().default('Admin@12345'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const invalidFields = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ');
  console.error(`FATAL: Invalid environment configuration. Missing or invalid variables: ${invalidFields}`);
  process.exit(1);
}

const rawEnv = parsed.data;

export const env = Object.freeze({
  ...rawEnv,
  CORS_ORIGINS: rawEnv.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean),
});
