import { Server as SocketServer } from 'socket.io';
import { logger } from './logger';

type EventHandler = (payload: Record<string, unknown>) => void;

export class EventBus {
  private static instance: EventBus;
  private handlers = new Map<string, EventHandler[]>();
  private io?: SocketServer;

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  setSocketServer(io: SocketServer): void {
    this.io = io;
  }

  publish(event: string, payload: Record<string, unknown>): void {
    logger.debug({ event, payload }, 'Event published');

    // Notify local subscribers
    const handlers = this.handlers.get(event) || [];
    for (const handler of handlers) {
      try {
        handler(payload);
      } catch (error) {
        logger.error({ event, error }, 'Event handler error');
      }
    }

    // Broadcast via Socket.io to workspace room
    if (this.io && payload.workspaceId) {
      const room = `workspace:${payload.workspaceId}:executions`;
      this.io.to(room).emit(event, {
        type: event,
        timestamp: new Date().toISOString(),
        ...payload,
      });
    }
  }

  subscribe(event: string, handler: EventHandler): () => void {
    const existing = this.handlers.get(event) || [];
    existing.push(handler);
    this.handlers.set(event, existing);

    // Return unsubscribe function
    return () => {
      const list = this.handlers.get(event) || [];
      this.handlers.set(
        event,
        list.filter((h) => h !== handler),
      );
    };
  }
}
