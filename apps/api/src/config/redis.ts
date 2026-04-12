import Redis from 'ioredis';
import { config } from './index';
import { logger } from '../infrastructure/logger';

let sharedRedisClient: Redis | null = null;

export function createRedisClient(): Redis {
  const client = new Redis(config.REDIS_URL, {
    maxRetriesPerRequest: null,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });

  client.on('connect', () => logger.info('Redis connected'));
  client.on('error', (err) => logger.error({ err }, 'Redis error'));

  return client;
}

export function getSharedRedisClient(): Redis {
  if (!sharedRedisClient) {
    sharedRedisClient = createRedisClient();
  }
  return sharedRedisClient;
}

export async function disconnectSharedRedisClient(): Promise<void> {
  if (!sharedRedisClient) {
    return;
  }

  const client = sharedRedisClient;
  sharedRedisClient = null;
  await client.quit();
}
