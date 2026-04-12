import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGODB_URI: z.string().default('mongodb://localhost:27017/flowforge'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
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
  AUTH_REFRESH_REPLAY_TTL_SECONDS: z.coerce.number().default(3600),
  AUTH_REFRESH_SESSION_LIMIT: z.coerce.number().default(5),
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

  if (result.data.AUTH_COOKIE_SAME_SITE === 'none' && !secure) {
    console.error('AUTH_COOKIE_SECURE must be true when AUTH_COOKIE_SAME_SITE is "none"');
    process.exit(1);
  }

  return {
    ...result.data,
    AUTH_COOKIE_SECURE: secure,
  };
}

export const config = loadConfig();
export type Config = ReturnType<typeof loadConfig>;
