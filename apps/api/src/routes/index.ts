import { Router } from 'express';
import { authRoutes } from './auth.routes';
import { workspaceRoutes } from './workspace.routes';
import { workflowRoutes } from './workflow.routes';
import { executionRoutes } from './execution.routes';
import { webhookRoutes } from './webhook.routes';
import { billingRoutes, workspaceBillingRoutes } from './billing.routes';

export const routes = Router();

routes.use('/auth', authRoutes);
routes.use('/workspaces', workspaceRoutes);
routes.use('/workspaces/:workspaceId/workflows', workflowRoutes);
routes.use('/workspaces/:workspaceId/executions', executionRoutes);
routes.use('/workspaces/:workspaceId/billing', workspaceBillingRoutes);
routes.use('/webhooks', webhookRoutes);
routes.use('/billing', billingRoutes);
