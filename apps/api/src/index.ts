import 'dotenv/config';
import http from 'http';
import { createApp } from './server';
import { config } from './config';
import { connectDatabase } from './config/database';
import { createRedisClient } from './config/redis';
import { createSocketServer } from './config/socket';
import { EventBus } from './infrastructure/event-bus';
import { logger } from './infrastructure/logger';

async function bootstrap() {
  // Connect to MongoDB
  await connectDatabase();

  // Connect to Redis
  const redis = createRedisClient();

  // Create Express app
  const app = createApp();

  // Create HTTP server
  const server = http.createServer(app);

  // Create Socket.io server
  const io = createSocketServer(server);

  // Wire EventBus to Socket.io
  const eventBus = EventBus.getInstance();
  eventBus.setSocketServer(io);

  // Start server
  server.listen(config.PORT, () => {
    logger.info(`FlowForge API running on port ${config.PORT}`);
    logger.info(`Environment: ${config.NODE_ENV}`);
  });

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down...');
    server.close();
    redis.disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

bootstrap().catch((error) => {
  logger.error(error, 'Failed to start server');
  process.exit(1);
});
