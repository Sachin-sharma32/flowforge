import Redis from 'ioredis';
import { config } from './index';
import { logger } from '../infrastructure/logger';

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
