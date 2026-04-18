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

  static async listMembers(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await workspaceService.listMembers(
        req.params.id,
        Number(req.query.page) || 1,
        Number(req.query.limit) || 20,
      );
      res.json({ success: true, data: result.data, pagination: result.pagination });
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
      const invitation = await workspaceService.inviteMember(
        req.params.id,
        req.body,
        req.user!.userId,
      );
      res.json({ success: true, data: { message: 'Invitation sent', invitation } });
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

  static async getMyInvitations(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await (await import('../models/user.model')).User.findById(req.user!.userId);
      if (!user) return res.status(404).json({ success: false, error: 'User not found' });
      const invitations = await workspaceService.getInvitationsForUser(user.email);
      res.json({ success: true, data: invitations });
    } catch (error) {
      next(error);
    }
  }

  static async acceptInvitation(req: Request, res: Response, next: NextFunction) {
    try {
      const workspace = await workspaceService.acceptInvitation(req.params.token, req.user!.userId);
      res.json({ success: true, data: workspace });
    } catch (error) {
      next(error);
    }
  }

  static async declineInvitation(req: Request, res: Response, next: NextFunction) {
    try {
      const invitation = await workspaceService.declineInvitation(
        req.params.token,
        req.user!.userId,
      );
      res.json({ success: true, data: invitation });
    } catch (error) {
      next(error);
    }
  }

  static async getWorkspaceInvitations(req: Request, res: Response, next: NextFunction) {
    try {
      const invitations = await workspaceService.getInvitationsForWorkspace(req.params.id);
      res.json({ success: true, data: invitations });
    } catch (error) {
      next(error);
    }
  }
}
