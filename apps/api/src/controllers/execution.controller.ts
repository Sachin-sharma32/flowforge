import { Request, Response, NextFunction } from 'express';
import { ExecutionService } from '../services/execution.service';

const executionService = new ExecutionService();

export class ExecutionController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await executionService.list({
        workspaceId: req.params.workspaceId,
        workflowId: req.query.workflowId as string,
        folderId: req.query.folderId as string,
        status: req.query.status as string,
        triggerType: req.query.triggerType as string,
        page: Number(req.query.page) || 1,
        limit: Number(req.query.limit) || 20,
        search: req.query.search as string,
        sortBy: req.query.sortBy as 'createdAt' | 'status' | 'durationMs',
        sortOrder: req.query.sortOrder as 'asc' | 'desc',
        dateFrom: req.query.dateFrom as string,
        dateTo: req.query.dateTo as string,
        durationMin: req.query.durationMin ? Number(req.query.durationMin) : undefined,
        durationMax: req.query.durationMax ? Number(req.query.durationMax) : undefined,
        workspaceRole: req.workspaceRole,
      });
      res.json({ success: true, data: result.data, pagination: result.pagination });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const execution = await executionService.getById(
        req.params.id,
        req.params.workspaceId,
        req.workspaceRole,
      );
      res.json({ success: true, data: execution });
    } catch (error) {
      next(error);
    }
  }

  static async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const execution = await executionService.cancel(
        req.params.id,
        req.params.workspaceId,
        req.workspaceRole,
      );
      res.json({ success: true, data: execution });
    } catch (error) {
      next(error);
    }
  }

  static async stats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await executionService.getStats(req.params.workspaceId, req.workspaceRole);
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }

  static async timeline(req: Request, res: Response, next: NextFunction) {
    try {
      const days = Math.min(Number(req.query.days) || 14, 90);
      const timeline = await executionService.getTimeline(
        req.params.workspaceId,
        days,
        req.workspaceRole,
      );
      res.json({ success: true, data: timeline });
    } catch (error) {
      next(error);
    }
  }

  static async statsByWorkflow(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await executionService.getStatsByWorkflow(
        req.params.workspaceId,
        req.workspaceRole,
      );
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }
}
