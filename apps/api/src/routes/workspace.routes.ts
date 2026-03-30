import { Router } from 'express';
import { WorkspaceController } from '../controllers/workspace.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  Permissions,
  createWorkspaceSchema,
  inviteMemberSchema,
  updateMemberRoleSchema,
} from '@flowforge/shared';

export const workspaceRoutes = Router();

workspaceRoutes.use(authenticate);

workspaceRoutes.get('/', WorkspaceController.list);
workspaceRoutes.post('/', validate(createWorkspaceSchema), WorkspaceController.create);
workspaceRoutes.get('/:id', WorkspaceController.getById);
workspaceRoutes.patch(
  '/:id',
  requirePermission(Permissions.MANAGE_SETTINGS),
  WorkspaceController.update,
);
workspaceRoutes.delete(
  '/:id',
  requirePermission(Permissions.DELETE_WORKSPACE),
  WorkspaceController.delete,
);

// Member management
workspaceRoutes.post(
  '/:id/members',
  requirePermission(Permissions.INVITE_MEMBERS),
  validate(inviteMemberSchema),
  WorkspaceController.inviteMember,
);
workspaceRoutes.patch(
  '/:id/members/:userId',
  requirePermission(Permissions.MANAGE_MEMBERS),
  validate(updateMemberRoleSchema),
  WorkspaceController.updateMemberRole,
);
workspaceRoutes.delete(
  '/:id/members/:userId',
  requirePermission(Permissions.MANAGE_MEMBERS),
  WorkspaceController.removeMember,
);
