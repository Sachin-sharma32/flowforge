import { NextFunction, Request, Response } from 'express';
import { ConnectorService } from '../services/connector.service';

const connectorService = new ConnectorService();

export class ConnectorController {
  static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const connectors = await connectorService.list(req.params.workspaceId);
      res.json({ success: true, data: connectors });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const connector = await connectorService.getById(
        req.params.connectorId,
        req.params.workspaceId,
      );
      res.json({ success: true, data: connector });
    } catch (error) {
      next(error);
    }
  }

  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const connector = await connectorService.create(
        req.body,
        req.params.workspaceId,
        req.user!.userId,
      );
      res.status(201).json({ success: true, data: connector });
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const connector = await connectorService.update(
        req.params.connectorId,
        req.params.workspaceId,
        req.body,
      );
      res.json({ success: true, data: connector });
    } catch (error) {
      next(error);
    }
  }

  static async remove(req: Request, res: Response, next: NextFunction) {
    try {
      await connectorService.remove(req.params.connectorId, req.params.workspaceId);
      res.json({ success: true, data: { message: 'Connector removed' } });
    } catch (error) {
      next(error);
    }
  }
}
