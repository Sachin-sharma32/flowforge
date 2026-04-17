import { NextFunction, Request, Response } from 'express';
import { FolderService } from '../services/folder.service';

const folderService = new FolderService();

export class FolderController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await folderService.list({
        workspaceId: req.params.workspaceId,
        workspaceRole: req.workspaceRole,
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
      const folder = await folderService.getById(
        req.params.id,
        req.params.workspaceId,
        req.workspaceRole,
      );
      res.json({ success: true, data: folder });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const folder = await folderService.create(req.body, req.params.workspaceId);
      res.status(201).json({ success: true, data: folder });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const folder = await folderService.update(req.params.id, req.params.workspaceId, req.body);
      res.json({ success: true, data: folder });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await folderService.delete(req.params.id, req.params.workspaceId);
      res.json({ success: true, data: { message: 'Folder deleted' } });
    } catch (error) {
      next(error);
    }
  }
}
