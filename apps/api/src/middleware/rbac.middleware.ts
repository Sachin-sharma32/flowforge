import { Request, Response, NextFunction } from 'express';
import { hasPermission, PermissionType, RoleType } from '@flowforge/shared';
import { ForbiddenError, NotFoundError } from '../domain/errors';
import { Workspace } from '../models/workspace.model';

declare global {
  namespace Express {
    interface Request {
      workspaceRole?: RoleType;
      workspaceId?: string;
    }
  }
}

export function requirePermission(permission: PermissionType) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const workspaceId = req.params.workspaceId || req.params.id;
      const userId = req.user?.userId;

      if (!userId) {
        next(new ForbiddenError('Authentication required'));
        return;
      }

      if (!workspaceId) {
        next(new ForbiddenError('Workspace context required'));
        return;
      }

      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        next(new NotFoundError('Workspace not found'));
        return;
      }

      const member = workspace.members.find(
        (m) => m.userId.toString() === userId,
      );
      if (!member) {
        next(new ForbiddenError('You are not a member of this workspace'));
        return;
      }

      if (!hasPermission(member.role as RoleType, permission)) {
        next(new ForbiddenError(`Insufficient permissions: ${permission} required`));
        return;
      }

      req.workspaceRole = member.role as RoleType;
      req.workspaceId = workspaceId;
      next();
    } catch (error) {
      next(error);
    }
  };
}
