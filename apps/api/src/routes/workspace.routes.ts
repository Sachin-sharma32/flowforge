import { Router } from 'express';
import { WorkspaceController } from '../controllers/workspace.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  Permissions,
  createWorkspaceSchema,
  inviteMemberSchema,
  updateWorkspaceSchema,
  updateMemberRoleSchema,
  workspaceMembersListQuerySchema,
  workspaceMemberParamsSchema,
  workspaceParamsSchema,
} from '@flowforge/shared';

export const workspaceRoutes = Router();

workspaceRoutes.use(authenticate);

// Invitation routes (must be before /:id to avoid conflicts)
workspaceRoutes.get('/invitations/mine', WorkspaceController.getMyInvitations);
workspaceRoutes.post('/invitations/:token/accept', WorkspaceController.acceptInvitation);
workspaceRoutes.post('/invitations/:token/decline', WorkspaceController.declineInvitation);

workspaceRoutes.get('/', WorkspaceController.list);
workspaceRoutes.post('/', validate(createWorkspaceSchema), WorkspaceController.create);
workspaceRoutes.get('/:id', validate(workspaceParamsSchema, 'params'), WorkspaceController.getById);
workspaceRoutes.get(
  '/:id/members',
  validate(workspaceParamsSchema, 'params'),
  validate(workspaceMembersListQuerySchema, 'query'),
  requirePermission(Permissions.MANAGE_MEMBERS),
  WorkspaceController.listMembers,
);
workspaceRoutes.patch(
  '/:id',
  validate(workspaceParamsSchema, 'params'),
  requirePermission(Permissions.MANAGE_SETTINGS),
  validate(updateWorkspaceSchema),
  WorkspaceController.update,
);
workspaceRoutes.delete(
  '/:id',
  validate(workspaceParamsSchema, 'params'),
  requirePermission(Permissions.DELETE_WORKSPACE),
  WorkspaceController.delete,
);

// Member management
workspaceRoutes.post(
  '/:id/members',
  validate(workspaceParamsSchema, 'params'),
  requirePermission(Permissions.INVITE_MEMBERS),
  validate(inviteMemberSchema),
  WorkspaceController.inviteMember,
);
workspaceRoutes.patch(
  '/:id/members/:userId',
  validate(workspaceMemberParamsSchema, 'params'),
  requirePermission(Permissions.MANAGE_MEMBERS),
  validate(updateMemberRoleSchema),
  WorkspaceController.updateMemberRole,
);
workspaceRoutes.delete(
  '/:id/members/:userId',
  validate(workspaceMemberParamsSchema, 'params'),
  requirePermission(Permissions.MANAGE_MEMBERS),
  WorkspaceController.removeMember,
);

// Invitations for a specific workspace
workspaceRoutes.get(
  '/:id/invitations',
  validate(workspaceParamsSchema, 'params'),
  requirePermission(Permissions.MANAGE_MEMBERS),
  WorkspaceController.getWorkspaceInvitations,
);
