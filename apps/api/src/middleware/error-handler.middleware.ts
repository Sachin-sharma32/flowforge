import { Request, Response, NextFunction } from 'express';
import { AppError } from '../domain/errors';
import { logger } from '../infrastructure/logger';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError && err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      ...(err.context && { context: err.context }),
    });
    return;
  }

  logger.error({
    err,
    requestId: req.id,
    method: req.method,
    url: req.url,
  }, 'Unhandled error');

  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
}
