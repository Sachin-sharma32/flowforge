import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { Workflow } from '../models/workflow.model';
import { Workspace } from '../models/workspace.model';
import { ExecutionService } from '../services/execution.service';
import { NotFoundError, UnauthorizedError } from '../domain/errors';
import { logger } from '../infrastructure/logger';

const executionService = new ExecutionService();

export class WebhookController {
  static async handle(req: Request, res: Response, next: NextFunction) {
    try {
      const { workspaceId, path } = req.params;

      // Validate webhook secret
      const workspace = await Workspace.findById(workspaceId);
      if (!workspace) {
        throw new NotFoundError('Workspace not found');
      }

      const providedSecret = req.headers['x-webhook-secret'] as string | undefined;
      const signature = req.headers['x-webhook-signature'] as string | undefined;
      const webhookSecret = workspace.settings.webhookSecret;

      if (signature) {
        // HMAC signature validation
        const expectedSignature = crypto
          .createHmac('sha256', webhookSecret)
          .update(JSON.stringify(req.body))
          .digest('hex');
        if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
          throw new UnauthorizedError('Invalid webhook signature');
        }
      } else if (providedSecret) {
        // Direct secret comparison
        if (providedSecret !== webhookSecret) {
          throw new UnauthorizedError('Invalid webhook secret');
        }
      } else {
        throw new UnauthorizedError('Webhook secret or signature header required');
      }

      const workflow = await Workflow.findOne({
        workspaceId,
        'trigger.type': 'webhook',
        'trigger.config.path': path,
        status: 'active',
      });

      if (!workflow) {
        throw new NotFoundError('No active workflow found for this webhook');
      }

      const execution = await executionService.create(
        workflow._id.toString(),
        workspaceId,
        'webhook',
        {
          headers: req.headers,
          body: req.body,
          query: req.query,
          method: req.method,
        },
      );

      const { WorkflowProcessor } = await import('../engine/workflow-processor');
      const processor = new WorkflowProcessor();
      processor.process(execution._id.toString()).catch((err) => {
        logger.error(
          { err, executionId: execution._id.toString() },
          'Webhook-triggered workflow processing failed',
        );
      });

      res.status(200).json({
        success: true,
        data: { executionId: execution._id, status: 'queued' },
      });
    } catch (error) {
      next(error);
    }
  }
}
