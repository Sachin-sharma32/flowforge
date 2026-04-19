import { Router } from 'express';
import { z } from 'zod';
import { WorkflowController } from '../controllers/workflow.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireSuperAdmin } from '../middleware/super-admin.middleware';
import { validate } from '../middleware/validate.middleware';
import { objectIdSchema } from '@flowforge/shared';

export const adminWorkflowRoutes = Router();

// Schema for admin template routes (only templateId, no workspaceId)
const templateParamsSchema = z.object({
  templateId: objectIdSchema,
});

// All admin workflow routes require authentication and super admin
adminWorkflowRoutes.use(authenticate);
adminWorkflowRoutes.use(requireSuperAdmin);

adminWorkflowRoutes.get(
  '/templates/:templateId',
  validate(templateParamsSchema, 'params'),
  WorkflowController.getGlobalTemplate,
);
adminWorkflowRoutes.post('/templates', WorkflowController.createGlobalTemplate);
adminWorkflowRoutes.patch(
  '/templates/:templateId',
  validate(templateParamsSchema, 'params'),
  WorkflowController.updateGlobalTemplate,
);
adminWorkflowRoutes.delete(
  '/templates/:templateId',
  validate(templateParamsSchema, 'params'),
  WorkflowController.deleteGlobalTemplate,
);
