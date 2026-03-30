import { Router } from 'express';
import { WebhookController } from '../controllers/webhook.controller';

export const webhookRoutes = Router();

// Webhooks are unauthenticated — they use workspace-level secrets
webhookRoutes.post('/:workspaceId/:path', WebhookController.handle);
webhookRoutes.get('/:workspaceId/:path', WebhookController.handle);
