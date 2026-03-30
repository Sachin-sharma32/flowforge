import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { config } from './index';
import { logger } from '../infrastructure/logger';

export function createSocketServer(httpServer: HttpServer): SocketServer {
  const io = new SocketServer(httpServer, {
    cors: {
      origin: config.CORS_ORIGIN,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    socket.on('join:workspace', (workspaceId: string) => {
      socket.join(`workspace:${workspaceId}:executions`);
      logger.debug(`Socket ${socket.id} joined workspace:${workspaceId}:executions`);
    });

    socket.on('leave:workspace', (workspaceId: string) => {
      socket.leave(`workspace:${workspaceId}:executions`);
    });

    socket.on('disconnect', () => {
      logger.debug(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}
