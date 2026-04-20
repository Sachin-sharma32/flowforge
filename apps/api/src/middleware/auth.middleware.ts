import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { UnauthorizedError } from '../domain/errors';
import { User } from '../models/user.model';

export interface JwtPayload {
  userId: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

// In-memory throttle: track last update timestamp per user to avoid DB write
// amplification on every authenticated request. 60s cadence is plenty for
// "active in the last hour" displays.
const ACTIVITY_HEARTBEAT_MS = 60 * 1000;
const lastHeartbeatByUser = new Map<string, number>();

function updateLastActive(userId: string): void {
  const now = Date.now();
  const previous = lastHeartbeatByUser.get(userId) ?? 0;
  if (now - previous < ACTIVITY_HEARTBEAT_MS) return;
  lastHeartbeatByUser.set(userId, now);
  // Fire and forget; we never want auth to fail on a heartbeat update.
  User.updateOne({ _id: userId }, { $set: { lastActiveAt: new Date(now) } }).catch(() => {
    /* noop */
  });
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    next(new UnauthorizedError('Access token required'));
    return;
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as JwtPayload;
    req.user = decoded;
    updateLastActive(decoded.userId);
    next();
  } catch {
    next(new UnauthorizedError('Invalid or expired access token'));
  }
}
