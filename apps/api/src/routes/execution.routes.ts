import { Router } from 'express';
import { ExecutionController } from '../controllers/execution.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  Permissions,
  executionListQuerySchema,
  executionParamsSchema,
  executionTimelineQuerySchema,
  workspaceIdParamsSchema,
} from '@flowforge/shared';

export const executionRoutes = Router({ mergeParams: true });

executionRoutes.use(authenticate);

executionRoutes.get(
  '/',
  validate(workspaceIdParamsSchema, 'params'),
  validate(executionListQuerySchema, 'query'),
  requirePermission(Permissions.VIEW_EXECUTIONS),
  ExecutionController.list,
);
executionRoutes.get(
  '/stats',
  validate(workspaceIdParamsSchema, 'params'),
  requirePermission(Permissions.VIEW_EXECUTIONS),
  ExecutionController.stats,
);
executionRoutes.get(
  '/stats/timeline',
  validate(workspaceIdParamsSchema, 'params'),
  validate(executionTimelineQuerySchema, 'query'),
  requirePermission(Permissions.VIEW_EXECUTIONS),
  ExecutionController.timeline,
);
executionRoutes.get(
  '/stats/by-workflow',
  validate(workspaceIdParamsSchema, 'params'),
  requirePermission(Permissions.VIEW_EXECUTIONS),
  ExecutionController.statsByWorkflow,
);
executionRoutes.get(
  '/stats/summary',
  validate(workspaceIdParamsSchema, 'params'),
  requirePermission(Permissions.VIEW_EXECUTIONS),
  ExecutionController.dashboardSummary,
);
executionRoutes.get(
  '/stats/recent-activity',
  validate(workspaceIdParamsSchema, 'params'),
  requirePermission(Permissions.VIEW_EXECUTIONS),
  ExecutionController.workflowRecentActivity,
);
executionRoutes.get(
  '/:id',
  validate(executionParamsSchema, 'params'),
  requirePermission(Permissions.VIEW_EXECUTIONS),
  ExecutionController.getById,
);
executionRoutes.post(
  '/:id/cancel',
  validate(executionParamsSchema, 'params'),
  requirePermission(Permissions.CANCEL_EXECUTION),
  ExecutionController.cancel,
);
