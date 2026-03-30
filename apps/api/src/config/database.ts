import mongoose from 'mongoose';
import { config } from './index';
import { logger } from '../infrastructure/logger';

export async function connectDatabase(): Promise<typeof mongoose> {
  try {
    const conn = await mongoose.connect(config.MONGODB_URI);
    logger.info(`MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    logger.error({ err: error }, 'MongoDB connection error');
    process.exit(1);
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  logger.info('MongoDB disconnected');
}
