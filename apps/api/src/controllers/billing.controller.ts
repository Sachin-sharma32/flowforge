import { NextFunction, Request, Response } from 'express';
import { BillingService } from '../services/billing.service';

const billingService = new BillingService();

export class BillingController {
  static async summary(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await billingService.getSummary(req.params.workspaceId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async checkout(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await billingService.createCheckoutSession(req.params.workspaceId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async cancel(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await billingService.cancelSubscription(req.params.workspaceId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  static async razorpayWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const signature = req.headers['x-razorpay-signature'];
      const signatureHeader = Array.isArray(signature) ? signature[0] : signature;

      await billingService.handleRazorpayWebhook(req.body as Buffer, signatureHeader);
      res.json({ success: true, data: { received: true } });
    } catch (error) {
      next(error);
    }
  }
}
