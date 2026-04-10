import { Request, Response, NextFunction } from 'express';
import { ExecutionService } from '../services/execution.service';

const executionService = new ExecutionService();

export class ExecutionController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await executionService.list({
        workspaceId: req.params.workspaceId,
        workflowId: req.query.workflowId as string,
        status: req.query.status as string,
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
      });
      res.json({ success: true, data: result.data, pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const execution = await executionService.getById(req.params.id, req.params.workspaceId);
      res.json({ success: true, data: execution });
    } catch (error) {
      next(error);
    }
  }

  static async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const execution = await executionService.cancel(req.params.id, req.params.workspaceId);
      res.json({ success: true, data: execution });
    } catch (error) {
      next(error);
    }
  }

  static async stats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await executionService.getStats(req.params.workspaceId);
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }
}
