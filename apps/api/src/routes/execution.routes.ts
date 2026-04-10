import { Router } from 'express';
import { ExecutionController } from '../controllers/execution.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';
import { Permissions } from '@flowforge/shared';

export const executionRoutes = Router({ mergeParams: true });

executionRoutes.use(authenticate);

executionRoutes.get('/', requirePermission(Permissions.VIEW_EXECUTIONS), ExecutionController.list);
executionRoutes.get(
  '/stats',
  requirePermission(Permissions.VIEW_EXECUTIONS),
  ExecutionController.stats,
);
executionRoutes.get(
  '/:id',
  requirePermission(Permissions.VIEW_EXECUTIONS),
  ExecutionController.getById,
);
executionRoutes.post(
  '/:id/cancel',
  requirePermission(Permissions.CANCEL_EXECUTION),
  ExecutionController.cancel,
);
