import { Router } from 'express';
import { WorkflowController } from '../controllers/workflow.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';
import { requireSuperAdmin } from '../middleware/super-admin.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  Permissions,
  createWorkflowSchema,
  updateWorkflowSchema,
  workflowExecuteSchema,
  workflowListQuerySchema,
  workflowParamsSchema,
  workspaceIdParamsSchema,
} from '@flowforge/shared';

export const workflowRoutes = Router({ mergeParams: true });

workflowRoutes.use(authenticate);

// Public template routes (available to all authenticated users)
workflowRoutes.get(
  '/templates/list',
  validate(workspaceIdParamsSchema, 'params'),
  requirePermission(Permissions.VIEW_WORKFLOWS),
  WorkflowController.listTemplates,
);
workflowRoutes.post(
  '/templates/:templateId/use',
  validate(workspaceIdParamsSchema, 'params'),
  requirePermission(Permissions.CREATE_WORKFLOW),
  WorkflowController.createFromTemplate,
);

// Super admin only routes for global template management
workflowRoutes.get(
  '/admin/templates/:templateId',
  requireSuperAdmin,
  WorkflowController.getGlobalTemplate,
);
workflowRoutes.post('/admin/templates', requireSuperAdmin, WorkflowController.createGlobalTemplate);
workflowRoutes.patch(
  '/admin/templates/:templateId',
  requireSuperAdmin,
  WorkflowController.updateGlobalTemplate,
);
workflowRoutes.delete(
  '/admin/templates/:templateId',
  requireSuperAdmin,
  WorkflowController.deleteGlobalTemplate,
);
workflowRoutes.get(
  '/',
  validate(workspaceIdParamsSchema, 'params'),
  validate(workflowListQuerySchema, 'query'),
  requirePermission(Permissions.VIEW_WORKFLOWS),
  WorkflowController.list,
);
workflowRoutes.post(
  '/',
  validate(workspaceIdParamsSchema, 'params'),
  requirePermission(Permissions.CREATE_WORKFLOW),
  validate(createWorkflowSchema),
  WorkflowController.create,
);
workflowRoutes.get(
  '/:id',
  validate(workflowParamsSchema, 'params'),
  requirePermission(Permissions.VIEW_WORKFLOWS),
  WorkflowController.getById,
);
workflowRoutes.patch(
  '/:id',
  validate(workflowParamsSchema, 'params'),
  requirePermission(Permissions.EDIT_WORKFLOW),
  validate(updateWorkflowSchema),
  WorkflowController.update,
);
workflowRoutes.delete(
  '/:id',
  validate(workflowParamsSchema, 'params'),
  requirePermission(Permissions.DELETE_WORKFLOW),
  WorkflowController.delete,
);
workflowRoutes.post(
  '/:id/duplicate',
  validate(workflowParamsSchema, 'params'),
  requirePermission(Permissions.CREATE_WORKFLOW),
  WorkflowController.duplicate,
);
workflowRoutes.post(
  '/:id/activate',
  validate(workflowParamsSchema, 'params'),
  requirePermission(Permissions.EDIT_WORKFLOW),
  WorkflowController.activate,
);
workflowRoutes.post(
  '/:id/pause',
  validate(workflowParamsSchema, 'params'),
  requirePermission(Permissions.EDIT_WORKFLOW),
  WorkflowController.pause,
);
workflowRoutes.post(
  '/:id/execute',
  validate(workflowParamsSchema, 'params'),
  validate(workflowExecuteSchema),
  requirePermission(Permissions.EXECUTE_WORKFLOW),
  WorkflowController.execute,
);
