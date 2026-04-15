import { Request, Response, NextFunction } from 'express';
import { WorkflowService } from '../services/workflow.service';
import { ExecutionService } from '../services/execution.service';
import { UnauthorizedError } from '../domain/errors';
import { logger } from '../infrastructure/logger';

const workflowService = new WorkflowService();
const executionService = new ExecutionService();

function requireUser(req: Request): { userId: string } {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }
  return req.user;
}

export class WorkflowController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await workflowService.list({
        workspaceId: req.params.workspaceId,
        status: req.query.status as string,
        folderId: req.query.folderId as string,
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
        search: req.query.search as string,
        sortBy: req.query.sortBy as 'updatedAt' | 'createdAt' | 'name' | 'lastExecutedAt',
        sortOrder: req.query.sortOrder as 'asc' | 'desc',
        dateFrom: req.query.dateFrom as string,
        dateTo: req.query.dateTo as string,
        workspaceRole: req.workspaceRole,
      });
      res.json({ success: true, data: result.data, pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const workflow = await workflowService.getById(
        req.params.id,
        req.params.workspaceId,
        req.workspaceRole,
      );
      res.json({ success: true, data: workflow });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const user = requireUser(req);
      const workflow = await workflowService.create(
        req.body,
        req.params.workspaceId,
        user.userId,
        req.workspaceRole,
      );
      res.status(201).json({ success: true, data: workflow });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const user = requireUser(req);
      const workflow = await workflowService.update(
        req.params.id,
        req.params.workspaceId,
        req.body,
        user.userId,
        req.workspaceRole,
      );
      res.json({ success: true, data: workflow });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await workflowService.delete(req.params.id, req.params.workspaceId, req.workspaceRole);
      res.json({ success: true, data: { message: 'Workflow archived' } });
    } catch (error) {
      next(error);
    }
  }

  static async duplicate(req: Request, res: Response, next: NextFunction) {
    try {
      const user = requireUser(req);
      const workflow = await workflowService.duplicate(
        req.params.id,
        req.params.workspaceId,
        user.userId,
        req.workspaceRole,
      );
      res.status(201).json({ success: true, data: workflow });
    } catch (error) {
      next(error);
    }
  }

  static async activate(req: Request, res: Response, next: NextFunction) {
    try {
      const workflow = await workflowService.activate(
        req.params.id,
        req.params.workspaceId,
        req.workspaceRole,
      );
      res.json({ success: true, data: workflow });
    } catch (error) {
      next(error);
    }
  }

  static async pause(req: Request, res: Response, next: NextFunction) {
    try {
      const workflow = await workflowService.pause(
        req.params.id,
        req.params.workspaceId,
        req.workspaceRole,
      );
      res.json({ success: true, data: workflow });
    } catch (error) {
      next(error);
    }
  }

  static async execute(req: Request, res: Response, next: NextFunction) {
    try {
      const execution = await executionService.create(
        req.params.id,
        req.params.workspaceId,
        'manual',
        req.body.payload,
        req.workspaceRole,
      );
      const { WorkflowProcessor } = await import('../engine/workflow-processor');
      const processor = new WorkflowProcessor();
      processor.process(execution._id.toString()).catch((err) => {
        logger.error({ err, executionId: execution._id.toString() }, 'Workflow processing failed');
      });

      res.status(201).json({ success: true, data: execution });
    } catch (error) {
      next(error);
    }
  }
}
