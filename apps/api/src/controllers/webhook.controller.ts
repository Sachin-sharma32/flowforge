import { Request, Response, NextFunction } from 'express';
import { Workflow } from '../models/workflow.model';
import { ExecutionService } from '../services/execution.service';
import { NotFoundError } from '../domain/errors';

const executionService = new ExecutionService();

export class WebhookController {
  static async handle(req: Request, res: Response, next: NextFunction) {
    try {
      const { workspaceId, path } = req.params;

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
      processor.process(execution._id.toString()).catch(() => {});

      res.status(200).json({
        success: true,
        data: { executionId: execution._id, status: 'queued' },
      });
    } catch (error) {
      next(error);
    }
  }
}
