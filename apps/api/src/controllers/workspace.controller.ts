import { Request, Response, NextFunction } from 'express';
import { WorkspaceService } from '../services/workspace.service';
import { Organization } from '../models/organization.model';

const workspaceService = new WorkspaceService();

export class WorkspaceController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const workspaces = await workspaceService.listByUser(req.user!.userId);
      res.json({ success: true, data: workspaces });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const workspace = await workspaceService.getById(req.params.id);
      res.json({ success: true, data: workspace });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const org = await Organization.findOne({ ownerId: req.user!.userId });
      const workspace = await workspaceService.create(
        req.body,
        req.user!.userId,
        org!._id.toString(),
      );
      res.status(201).json({ success: true, data: workspace });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const workspace = await workspaceService.update(req.params.id, req.body);
      res.json({ success: true, data: workspace });
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      await workspaceService.delete(req.params.id, req.user!.userId);
      res.json({ success: true, data: { message: 'Workspace deleted' } });
    } catch (error) {
      next(error);
    }
  }

  static async inviteMember(req: Request, res: Response, next: NextFunction) {
    try {
      const workspace = await workspaceService.inviteMember(req.params.id, req.body);
      res.json({ success: true, data: workspace });
    } catch (error) {
      next(error);
    }
  }

  static async updateMemberRole(req: Request, res: Response, next: NextFunction) {
    try {
      const workspace = await workspaceService.updateMemberRole(
        req.params.id,
        req.params.userId,
        req.body.role,
      );
      res.json({ success: true, data: workspace });
    } catch (error) {
      next(error);
    }
  }

  static async removeMember(req: Request, res: Response, next: NextFunction) {
    try {
      const workspace = await workspaceService.removeMember(req.params.id, req.params.userId);
      res.json({ success: true, data: workspace });
    } catch (error) {
      next(error);
    }
  }
}
