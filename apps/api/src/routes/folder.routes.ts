import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import { FolderController } from '../controllers/folder.controller';
import {
  Permissions,
  createFolderSchema,
  folderParamsSchema,
  folderListQuerySchema,
  updateFolderSchema,
  workspaceIdParamsSchema,
} from '@flowforge/shared';

export const folderRoutes = Router({ mergeParams: true });

folderRoutes.use(authenticate);

folderRoutes.get(
  '/',
  validate(workspaceIdParamsSchema, 'params'),
  validate(folderListQuerySchema, 'query'),
  requirePermission(Permissions.VIEW_WORKFLOWS),
  FolderController.list,
);

folderRoutes.post(
  '/',
  validate(workspaceIdParamsSchema, 'params'),
  requirePermission(Permissions.MANAGE_SETTINGS),
  validate(createFolderSchema),
  FolderController.create,
);

folderRoutes.get(
  '/:id',
  validate(folderParamsSchema, 'params'),
  requirePermission(Permissions.VIEW_WORKFLOWS),
  FolderController.getById,
);

folderRoutes.patch(
  '/:id',
  validate(folderParamsSchema, 'params'),
  requirePermission(Permissions.MANAGE_SETTINGS),
  validate(updateFolderSchema),
  FolderController.update,
);

folderRoutes.delete(
  '/:id',
  validate(folderParamsSchema, 'params'),
  requirePermission(Permissions.MANAGE_SETTINGS),
  FolderController.delete,
);
