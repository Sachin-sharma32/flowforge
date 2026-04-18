import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config';
import { requestIdMiddleware } from './middleware/request-id.middleware';
import { generalLimiter } from './middleware/rate-limit.middleware';
import { errorHandler } from './middleware/error-handler.middleware';
import { logger } from './infrastructure/logger';
import { routes } from './routes';

export function createApp() {
  const app = express();

  // Security
  app.use(helmet());
  app.use(cors({ origin: config.CORS_ORIGIN, credentials: true }));

  // Razorpay webhook signature verification requires raw body
  app.use('/api/v1/billing/webhooks/razorpay', express.raw({ type: 'application/json' }));

  // Parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Request ID
  app.use(requestIdMiddleware);

  // Rate limiting
  app.use(generalLimiter);

  // Request logging
  app.use((req, _res, next) => {
    logger.debug({ method: req.method, url: req.url, requestId: req.id }, 'Incoming request');
    next();
  });

  // Routes
  app.use('/api/v1', routes);

  // Health check
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // Error handling (must be last)
  app.use(errorHandler);

  return app;
}
