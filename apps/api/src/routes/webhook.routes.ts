import { Router } from 'express';
import { WebhookController } from '../controllers/webhook.controller';
import { validate } from '../middleware/validate.middleware';
import { webhookIngressParamsSchema } from '@flowforge/shared';

export const webhookRoutes = Router();

// Webhooks are unauthenticated — they use workspace-level secrets
webhookRoutes.post(
  '/:workspaceId/:path',
  validate(webhookIngressParamsSchema, 'params'),
  WebhookController.handle,
);
webhookRoutes.get(
  '/:workspaceId/:path',
  validate(webhookIngressParamsSchema, 'params'),
  WebhookController.handle,
);
