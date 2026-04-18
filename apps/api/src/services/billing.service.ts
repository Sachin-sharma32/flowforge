import crypto from 'crypto';
import mongoose from 'mongoose';
import Razorpay from 'razorpay';
import { config } from '../config';
import { getLimitsForPlan, type BillingPlan } from '../domain/billing';
import { ForbiddenError, NotFoundError } from '../domain/errors';
import { BillingEvent } from '../models/billing-event.model';
import { Organization, type IOrganizationDocument } from '../models/organization.model';
import { Workspace } from '../models/workspace.model';
import { getRazorpayClient } from './stripe-client';
import { UsageService } from './usage.service';
import { logger } from '../infrastructure/logger';

interface RazorpaySubscription {
  id: string;
  plan_id?: string;
  status: string;
  current_start?: number;
  current_end?: number;
  notes?: Record<string, string>;
  short_url?: string;
}

interface RazorpayWebhookPayload {
  event: string;
  payload: {
    subscription?: { entity: RazorpaySubscription };
    payment?: { entity: Record<string, unknown> };
  };
}

export interface BillingSummary {
  organizationId: string;
  workspaceId: string;
  plan: BillingPlan;
  subscriptionStatus:
    | 'none'
    | 'active'
    | 'trialing'
    | 'past_due'
    | 'unpaid'
    | 'incomplete'
    | 'incomplete_expired'
    | 'canceled';
  cancelAtPeriodEnd: boolean;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  usage: {
    periodKey: string;
    used: number;
    limit: number;
    remaining: number;
    percentUsed: number;
  };
  canUpgrade: boolean;
  canCancel: boolean;
}

export class BillingService {
  constructor(
    private readonly razorpay: Razorpay = getRazorpayClient(),
    private readonly usageService = new UsageService(),
  ) {}

  async getSummary(workspaceId: string): Promise<BillingSummary> {
    const { organization } = await this.getOrganizationByWorkspace(workspaceId);
    const usage = await this.usageService.getCurrentMonthUsage(
      organization._id.toString(),
      organization.limits.maxExecutionsPerMonth,
    );

    const subscriptionStatus = organization.billing?.subscriptionStatus || 'none';
    const canCancel =
      Boolean(organization.billing?.razorpaySubscriptionId) &&
      (subscriptionStatus === 'active' || subscriptionStatus === 'past_due');

    return {
      organizationId: organization._id.toString(),
      workspaceId,
      plan: organization.plan,
      subscriptionStatus,
      cancelAtPeriodEnd: organization.billing?.cancelAtPeriodEnd || false,
      currentPeriodStart: organization.billing?.currentPeriodStart,
      currentPeriodEnd: organization.billing?.currentPeriodEnd,
      usage,
      canUpgrade: organization.plan === 'free',
      canCancel,
    };
  }

  async createCheckoutSession(workspaceId: string) {
    const { organization } = await this.getOrganizationByWorkspace(workspaceId);

    if (organization.plan !== 'free') {
      throw new ForbiddenError('Organization is already on a paid plan');
    }

    const sdkSub = await this.razorpay.subscriptions.create({
      plan_id: config.RAZORPAY_PLAN_PRO_MONTHLY,
      customer_notify: 1,
      total_count: 120,
      quantity: 1,
      notes: {
        organizationId: organization._id.toString(),
        targetPlan: 'pro',
      },
    });

    const subscription = sdkSub as unknown as RazorpaySubscription;

    if (!subscription.short_url) {
      throw new Error('Razorpay subscription did not return a checkout URL');
    }

    return { url: subscription.short_url };
  }

  async cancelSubscription(workspaceId: string) {
    const { organization } = await this.getOrganizationByWorkspace(workspaceId);
    const subscriptionId = organization.billing?.razorpaySubscriptionId;

    if (!subscriptionId) {
      throw new ForbiddenError('No active subscription to cancel');
    }

    await (
      this.razorpay.subscriptions.cancel as unknown as (id: string, atEnd: boolean) => Promise<void>
    )(subscriptionId, false);

    organization.plan = 'free';
    organization.limits = getLimitsForPlan('free');
    organization.billing = {
      ...organization.billing,
      subscriptionStatus: 'canceled',
      cancelAtPeriodEnd: false,
      lastWebhookAt: new Date(),
    };

    await organization.save();
    return { cancelled: true };
  }

  async handleRazorpayWebhook(rawBody: Buffer, signature?: string) {
    if (!signature) {
      throw new ForbiddenError('Razorpay signature header missing');
    }

    const hmac = crypto.createHmac('sha256', config.RAZORPAY_WEBHOOK_SECRET);
    hmac.update(rawBody.toString());
    const digest = hmac.digest('hex');

    if (digest !== signature) {
      throw new ForbiddenError('Invalid Razorpay webhook signature');
    }

    const event = JSON.parse(rawBody.toString()) as RazorpayWebhookPayload;
    return this.processRazorpayEvent(event);
  }

  async processRazorpayEvent(event: RazorpayWebhookPayload): Promise<{ duplicate: boolean }> {
    const eventId = this.deriveEventId(event);
    const duplicate = await this.isDuplicateEvent(eventId, event.event);
    if (duplicate) {
      return { duplicate: true };
    }

    const subscription = event.payload?.subscription?.entity;

    switch (event.event) {
      case 'subscription.activated':
      case 'subscription.charged':
        if (subscription) {
          await this.applySubscriptionSnapshot(subscription);
        }
        break;
      case 'subscription.halted':
        if (subscription) {
          await this.handleSubscriptionHalted(subscription);
        }
        break;
      case 'subscription.cancelled':
      case 'subscription.completed':
      case 'subscription.expired':
        if (subscription) {
          await this.handleSubscriptionEnded(subscription);
        }
        break;
      default:
        logger.info({ eventType: event.event }, 'Ignoring unsupported Razorpay webhook event');
    }

    await BillingEvent.updateOne(
      { provider: 'razorpay', eventId },
      { $set: { processedAt: new Date() } },
    );

    return { duplicate: false };
  }

  private async applySubscriptionSnapshot(subscription: RazorpaySubscription) {
    const organization = await this.findOrganizationFromSubscription(subscription);
    if (!organization) {
      logger.warn(
        { subscriptionId: subscription.id },
        'Organization not found for Razorpay subscription',
      );
      return;
    }

    const plan = this.resolvePlanFromSubscription(subscription);

    organization.plan = plan;
    organization.limits = getLimitsForPlan(plan);
    organization.billing = {
      ...organization.billing,
      razorpaySubscriptionId: subscription.id,
      razorpayPlanId: subscription.plan_id,
      subscriptionStatus: this.toInternalSubscriptionStatus(subscription.status),
      currentPeriodStart: this.toDate(subscription.current_start),
      currentPeriodEnd: this.toDate(subscription.current_end),
      cancelAtPeriodEnd: false,
      lastWebhookAt: new Date(),
    };

    await organization.save();
  }

  private async handleSubscriptionHalted(subscription: RazorpaySubscription) {
    const organization = await this.findOrganizationFromSubscription(subscription);
    if (!organization) {
      logger.warn(
        { subscriptionId: subscription.id },
        'Organization not found for halted subscription',
      );
      return;
    }

    organization.billing = {
      ...organization.billing,
      razorpaySubscriptionId: subscription.id,
      subscriptionStatus: 'past_due',
      lastWebhookAt: new Date(),
    };

    await organization.save();
  }

  private async handleSubscriptionEnded(subscription: RazorpaySubscription) {
    const organization = await this.findOrganizationFromSubscription(subscription);
    if (!organization) {
      logger.warn(
        { subscriptionId: subscription.id },
        'Organization not found for ended subscription',
      );
      return;
    }

    organization.plan = 'free';
    organization.limits = getLimitsForPlan('free');
    organization.billing = {
      ...organization.billing,
      razorpaySubscriptionId: subscription.id,
      subscriptionStatus: 'canceled',
      cancelAtPeriodEnd: false,
      lastWebhookAt: new Date(),
    };

    await organization.save();
  }

  private resolvePlanFromSubscription(subscription: RazorpaySubscription): BillingPlan {
    const isActiveLike = ['active', 'authenticated'].includes(subscription.status);
    if (isActiveLike && subscription.plan_id === config.RAZORPAY_PLAN_PRO_MONTHLY) {
      return 'pro';
    }
    return 'free';
  }

  private async getOrganizationByWorkspace(workspaceId: string): Promise<{
    workspaceId: string;
    organization: IOrganizationDocument;
  }> {
    if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
      throw new NotFoundError('Workspace not found');
    }

    const workspace = await Workspace.findById(workspaceId).select('organizationId');
    if (!workspace) {
      throw new NotFoundError('Workspace not found');
    }

    const organization = await Organization.findById(workspace.organizationId);
    if (!organization) {
      throw new NotFoundError('Organization not found');
    }

    return { workspaceId, organization };
  }

  private async findOrganizationFromSubscription(
    subscription: RazorpaySubscription,
  ): Promise<IOrganizationDocument | null> {
    const metadataOrgId = subscription.notes?.organizationId;

    if (metadataOrgId && mongoose.Types.ObjectId.isValid(metadataOrgId)) {
      const orgByMetadata = await Organization.findById(metadataOrgId);
      if (orgByMetadata) {
        return orgByMetadata;
      }
    }

    return Organization.findOne({ 'billing.razorpaySubscriptionId': subscription.id });
  }

  private deriveEventId(event: RazorpayWebhookPayload): string {
    const subscriptionId = event.payload?.subscription?.entity?.id ?? '';
    return `${event.event}:${subscriptionId}:${Date.now()}`;
  }

  private toDate(unixSeconds?: number): Date | undefined {
    if (!unixSeconds) return undefined;
    return new Date(unixSeconds * 1000);
  }

  private toInternalSubscriptionStatus(status: string): BillingSummary['subscriptionStatus'] {
    switch (status) {
      case 'active':
        return 'active';
      case 'authenticated':
        return 'trialing';
      case 'pending':
      case 'halted':
        return 'past_due';
      case 'cancelled':
      case 'completed':
      case 'expired':
        return 'canceled';
      default:
        return 'none';
    }
  }

  private async isDuplicateEvent(eventId: string, eventType: string): Promise<boolean> {
    try {
      await BillingEvent.create({
        provider: 'razorpay',
        eventId,
        eventType,
      });
      return false;
    } catch (error: unknown) {
      if (this.hasMongoDuplicateCode(error)) {
        return true;
      }
      throw error;
    }
  }

  private hasMongoDuplicateCode(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    return (error as { code?: unknown }).code === 11000;
  }
}
