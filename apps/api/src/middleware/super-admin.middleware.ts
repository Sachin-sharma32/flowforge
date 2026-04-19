import { Request, Response, NextFunction } from 'express';
import { User } from '../models/user.model';
import { ForbiddenError, UnauthorizedError } from '../domain/errors';

/**
 * Middleware to check if the authenticated user is a super admin.
 * Must be used after the authenticate middleware.
 */
export async function requireSuperAdmin(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user?.userId) {
      throw new UnauthorizedError('Authentication required');
    }

    const user = await User.findById(req.user.userId);

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (!user.isSuperAdmin) {
      throw new ForbiddenError('Super admin access required');
    }

    next();
  } catch (error) {
    next(error);
  }
}
