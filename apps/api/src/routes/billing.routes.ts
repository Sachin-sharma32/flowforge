import { Router } from 'express';
import { Permissions } from '@flowforge/shared';
import { BillingController } from '../controllers/billing.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';

export const workspaceBillingRoutes = Router({ mergeParams: true });
export const billingRoutes = Router();

workspaceBillingRoutes.use(authenticate);
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
  '/portal',
  requirePermission(Permissions.MANAGE_BILLING),
  BillingController.portal,
);

billingRoutes.post('/webhooks/stripe', BillingController.stripeWebhook);
