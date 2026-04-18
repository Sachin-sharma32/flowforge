import { Router } from 'express';
import { Permissions, workspaceIdParamsSchema } from '@flowforge/shared';
import { BillingController } from '../controllers/billing.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validate.middleware';

export const workspaceBillingRoutes = Router({ mergeParams: true });
export const billingRoutes = Router();

workspaceBillingRoutes.use(authenticate);
workspaceBillingRoutes.use(validate(workspaceIdParamsSchema, 'params'));
workspaceBillingRoutes.get(
  '/summary',
  requirePermission(Permissions.MANAGE_BILLING),
  BillingController.summary,
);
workspaceBillingRoutes.post(
  '/checkout',
  requirePermission(Permissions.MANAGE_BILLING),
  BillingController.checkout,
);
workspaceBillingRoutes.post(
  '/cancel',
  requirePermission(Permissions.MANAGE_BILLING),
  BillingController.cancel,
);

billingRoutes.post('/webhooks/razorpay', BillingController.razorpayWebhook);
