import { Router } from 'express';
import { WorkflowController } from '../controllers/workflow.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import { Permissions, createWorkflowSchema, updateWorkflowSchema } from '@flowforge/shared';

export const workflowRoutes = Router({ mergeParams: true });

workflowRoutes.use(authenticate);

workflowRoutes.get('/', requirePermission(Permissions.VIEW_WORKFLOWS), WorkflowController.list);
workflowRoutes.post(
  '/',
  requirePermission(Permissions.CREATE_WORKFLOW),
  validate(createWorkflowSchema),
  WorkflowController.create,
);
workflowRoutes.get(
  '/:id',
  requirePermission(Permissions.VIEW_WORKFLOWS),
  WorkflowController.getById,
);
workflowRoutes.patch(
  '/:id',
  requirePermission(Permissions.EDIT_WORKFLOW),
  validate(updateWorkflowSchema),
  WorkflowController.update,
);
workflowRoutes.delete(
  '/:id',
  requirePermission(Permissions.DELETE_WORKFLOW),
  WorkflowController.delete,
);
workflowRoutes.post(
  '/:id/duplicate',
  requirePermission(Permissions.CREATE_WORKFLOW),
  WorkflowController.duplicate,
);
workflowRoutes.post(
  '/:id/activate',
  requirePermission(Permissions.EDIT_WORKFLOW),
  WorkflowController.activate,
);
workflowRoutes.post(
  '/:id/pause',
  requirePermission(Permissions.EDIT_WORKFLOW),
  WorkflowController.pause,
);
workflowRoutes.post(
  '/:id/execute',
  requirePermission(Permissions.EXECUTE_WORKFLOW),
  WorkflowController.execute,
);
