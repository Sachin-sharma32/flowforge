import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';
import { ConnectorController } from '../controllers/connector.controller';
import {
  Permissions,
  createConnectorSchema,
  updateConnectorSchema,
  connectorParamsSchema,
  workspaceIdParamsSchema,
} from '@flowforge/shared';

export const connectorRoutes = Router({ mergeParams: true });

connectorRoutes.use(authenticate);

connectorRoutes.get(
  '/',
  validate(workspaceIdParamsSchema, 'params'),
  requirePermission(Permissions.VIEW_WORKFLOWS),
  ConnectorController.list,
);

connectorRoutes.post(
  '/',
  validate(workspaceIdParamsSchema, 'params'),
  requirePermission(Permissions.MANAGE_SETTINGS),
  validate(createConnectorSchema),
  ConnectorController.create,
);

connectorRoutes.get(
  '/:connectorId',
  validate(connectorParamsSchema, 'params'),
  requirePermission(Permissions.VIEW_WORKFLOWS),
  ConnectorController.getById,
);

connectorRoutes.patch(
  '/:connectorId',
  validate(connectorParamsSchema, 'params'),
  requirePermission(Permissions.MANAGE_SETTINGS),
  validate(updateConnectorSchema),
  ConnectorController.update,
);

connectorRoutes.delete(
  '/:connectorId',
  validate(connectorParamsSchema, 'params'),
  requirePermission(Permissions.MANAGE_SETTINGS),
  ConnectorController.remove,
);
