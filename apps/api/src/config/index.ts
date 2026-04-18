import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGODB_URI: z
    .string()
    .default('mongodb+srv://sachin:parasf@1234@cluster0.ga05pix.mongodb.net/?appName=Cluster0'),
  REDIS_URL: z
    .string()
    .default(
      'rediss://default:gQAAAAAAATd4AAIncDI4NDNhZmZlNDYxMjQ0ZDExYjdlZmRhYzAxOGZiYWQwZXAyNzk3MzY@pleasing-shepherd-79736.upstash.io:6379',
    ),
  JWT_SECRET: z.string().min(16),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
  AUTH_REFRESH_COOKIE_NAME: z.string().default('ff_refresh'),
  AUTH_CSRF_COOKIE_NAME: z.string().default('ff_csrf'),
  AUTH_REFRESH_COOKIE_PATH: z.string().default('/api/v1/auth'),
  AUTH_CSRF_COOKIE_PATH: z.string().default('/'),
  AUTH_COOKIE_SAME_SITE: z.enum(['lax', 'strict', 'none']).default('lax'),
  AUTH_COOKIE_SECURE: z.string().optional(),
  AUTH_EMAIL_VERIFICATION_EXPIRY: z.string().default('24h'),
  AUTH_REFRESH_REPLAY_TTL_SECONDS: z.coerce.number().default(3600),
  AUTH_REFRESH_SESSION_LIMIT: z.coerce.number().default(5),
  WEB_APP_URL: z.string().url().default('http://localhost:3000'),
  API_PUBLIC_URL: z.string().url().default('http://localhost:4000'),
  EMAIL_FROM: z.string().email().default('no-reply@flowforge.dev'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_SECURE: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().min(1),
  STRIPE_WEBHOOK_SECRET: z.string().min(1),
  STRIPE_PRICE_PRO_MONTHLY: z.string().min(1),
  FREE_EXECUTION_LIMIT: z.coerce.number().int().positive().default(1000),
  PRO_EXECUTION_LIMIT: z.coerce.number().int().positive().default(10000),
  ENTERPRISE_EXECUTION_LIMIT: z.coerce.number().int().positive().default(100000),
});

function loadConfig() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Invalid environment variables:', result.error.flatten().fieldErrors);
    process.exit(1);
  }

  const rawSecure = result.data.AUTH_COOKIE_SECURE;
  const secure =
    rawSecure === undefined
      ? result.data.NODE_ENV === 'production'
      : rawSecure.toLowerCase() === 'true';
  const smtpSecure = (result.data.SMTP_SECURE || '').toLowerCase() === 'true';

  if (result.data.AUTH_COOKIE_SAME_SITE === 'none' && !secure) {
    console.error('AUTH_COOKIE_SECURE must be true when AUTH_COOKIE_SAME_SITE is "none"');
    process.exit(1);
  }

  if (result.data.SMTP_HOST && !result.data.SMTP_PORT) {
    console.error('SMTP_PORT is required when SMTP_HOST is set');
    process.exit(1);
  }

  if (result.data.SMTP_HOST && (!result.data.SMTP_USER || !result.data.SMTP_PASS)) {
    console.error('SMTP_USER and SMTP_PASS are required when SMTP_HOST is set');
    process.exit(1);
  }

  return {
    ...result.data,
    AUTH_COOKIE_SECURE: secure,
    SMTP_SECURE: smtpSecure,
  };
}

export const config = loadConfig();
export type Config = ReturnType<typeof loadConfig>;
