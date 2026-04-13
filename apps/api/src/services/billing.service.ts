import mongoose from 'mongoose';
import { config } from '../config';
import { getLimitsForPlan, type BillingPlan } from '../domain/billing';
import { ForbiddenError, NotFoundError } from '../domain/errors';
import { BillingEvent } from '../models/billing-event.model';
import { Organization, type IOrganizationDocument } from '../models/organization.model';
import { User } from '../models/user.model';
import { Workspace } from '../models/workspace.model';
import { getStripeClient } from './stripe-client';
import { UsageService } from './usage.service';
import { logger } from '../infrastructure/logger';

interface StripeWebhookEvent {
  id: string;
  type: string;
  data: { object: unknown };
}

interface StripeCheckoutSession {
  mode?: string;
  subscription?: string | { id: string };
}

interface StripeSubscription {
  id: string;
  status: string;
  customer?: string | { id: string };
  items?: { data?: Array<{ price?: { id?: string } }> };
  metadata?: Record<string, string>;
  current_period_start?: number;
  current_period_end?: number;
  cancel_at_period_end?: boolean;
}

interface StripeInvoice {
  customer?: string | { id: string };
  subscription?: string | { id: string };
}

interface StripeClient {
  checkout: {
    sessions: {
      create(params: Record<string, unknown>): Promise<{ url?: string }>;
    };
  };
  billingPortal: {
    sessions: {
      create(params: Record<string, unknown>): Promise<{ url: string }>;
    };
  };
  customers: {
    create(params: Record<string, unknown>): Promise<{ id: string }>;
  };
  subscriptions: {
    retrieve(subscriptionId: string): Promise<StripeSubscription>;
  };
  webhooks: {
    constructEvent(payload: Buffer, signature: string, secret: string): StripeWebhookEvent;
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
  canManagePortal: boolean;
}

export class BillingService {
  constructor(
    private readonly stripe: StripeClient = getStripeClient() as StripeClient,
    private readonly usageService = new UsageService(),
  ) {}

  async getSummary(workspaceId: string): Promise<BillingSummary> {
    const { organization } = await this.getOrganizationByWorkspace(workspaceId);
    const usage = await this.usageService.getCurrentMonthUsage(
      organization._id.toString(),
      organization.limits.maxExecutionsPerMonth,
    );

    return {
      organizationId: organization._id.toString(),
      workspaceId,
      plan: organization.plan,
      subscriptionStatus: organization.billing?.subscriptionStatus || 'none',
      cancelAtPeriodEnd: organization.billing?.cancelAtPeriodEnd || false,
      currentPeriodStart: organization.billing?.currentPeriodStart,
      currentPeriodEnd: organization.billing?.currentPeriodEnd,
      usage,
      canUpgrade: organization.plan === 'free',
      canManagePortal: Boolean(organization.billing?.stripeCustomerId),
    };
  }

  async createCheckoutSession(workspaceId: string) {
    const { organization } = await this.getOrganizationByWorkspace(workspaceId);

    if (organization.plan !== 'free') {
      throw new ForbiddenError('Organization is already on a paid plan');
    }

    const customerId = await this.ensureStripeCustomer(organization);

    const session = await this.stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: config.STRIPE_PRICE_PRO_MONTHLY, quantity: 1 }],
      success_url: `${config.WEB_APP_URL}/settings?billing=success`,
      cancel_url: `${config.WEB_APP_URL}/settings?billing=cancel`,
      client_reference_id: organization._id.toString(),
      metadata: {
        organizationId: organization._id.toString(),
        targetPlan: 'pro',
      },
      subscription_data: {
        metadata: {
          organizationId: organization._id.toString(),
          targetPlan: 'pro',
        },
      },
      allow_promotion_codes: true,
    });

    if (!session.url) {
      throw new Error('Stripe checkout session did not return a redirect URL');
    }

    return { url: session.url };
  }

  async createPortalSession(workspaceId: string) {
    const { organization } = await this.getOrganizationByWorkspace(workspaceId);
    const customerId = await this.ensureStripeCustomer(organization);

    const session = await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${config.WEB_APP_URL}/settings`,
    });

    return { url: session.url };
  }

  async handleStripeWebhook(rawBody: Buffer, signature?: string) {
    if (!signature) {
      throw new ForbiddenError('Stripe signature header missing');
    }

    let event: StripeWebhookEvent;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, config.STRIPE_WEBHOOK_SECRET);
    } catch {
      throw new ForbiddenError('Invalid Stripe webhook signature');
    }

    return this.processStripeEvent(event);
  }

  async processStripeEvent(event: StripeWebhookEvent): Promise<{ duplicate: boolean }> {
    const duplicate = await this.isDuplicateEvent(event);
    if (duplicate) {
      return { duplicate: true };
    }

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutSessionCompleted(event.data.object);
        break;
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await this.applySubscriptionSnapshot(event.data.object);
        break;
      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event.data.object);
        break;
      default:
        logger.info({ eventType: event.type }, 'Ignoring unsupported Stripe webhook event');
    }

    await BillingEvent.updateOne(
      { provider: 'stripe', eventId: event.id },
      { $set: { processedAt: new Date() } },
    );

    return { duplicate: false };
  }

  private async handleCheckoutSessionCompleted(rawSession: unknown) {
    const session = this.asCheckoutSession(rawSession);
    if (session.mode !== 'subscription' || !session.subscription) {
      return;
    }

    const subscriptionId =
      typeof session.subscription === 'string' ? session.subscription : session.subscription.id;

    const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
    await this.applySubscriptionSnapshot(subscription);
  }

  private async handleInvoicePaymentFailed(rawInvoice: unknown) {
    const invoice = this.asInvoice(rawInvoice);
    const subscriptionId =
      typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;

    const customerId =
      typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;

    const organization = await this.findOrganizationByStripeReference(subscriptionId, customerId);
    if (!organization) {
      logger.warn(
        { subscriptionId, customerId },
        'Billing organization not found for invoice event',
      );
      return;
    }

    organization.billing = {
      ...organization.billing,
      stripeCustomerId: customerId || organization.billing?.stripeCustomerId,
      stripeSubscriptionId: subscriptionId || organization.billing?.stripeSubscriptionId,
      subscriptionStatus: 'past_due',
      lastWebhookAt: new Date(),
    };

    await organization.save();
  }

  private async applySubscriptionSnapshot(rawSubscription: unknown) {
    const subscription = this.asSubscription(rawSubscription);
    const customerId =
      typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;

    const organization = await this.findOrganizationFromSubscription(subscription, customerId);
    if (!organization) {
      logger.warn(
        { subscriptionId: subscription.id, customerId },
        'Billing organization not found for Stripe subscription',
      );
      return;
    }

    const plan = this.resolvePlanFromSubscription(subscription);
    const priceId = subscription.items?.data?.[0]?.price?.id;

    organization.plan = plan;
    organization.limits = getLimitsForPlan(plan);
    organization.billing = {
      ...organization.billing,
      stripeCustomerId: customerId || organization.billing?.stripeCustomerId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: priceId,
      subscriptionStatus: this.toInternalSubscriptionStatus(subscription.status),
      currentPeriodStart: this.toDate(subscription.current_period_start),
      currentPeriodEnd: this.toDate(subscription.current_period_end),
      cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
      lastWebhookAt: new Date(),
    };

    await organization.save();
  }

  private resolvePlanFromSubscription(subscription: StripeSubscription): BillingPlan {
    const status = subscription.status;
    const isActiveLike = ['active', 'trialing', 'past_due', 'unpaid'].includes(status);
    const priceId = subscription.items?.data?.[0]?.price?.id;

    if (isActiveLike && priceId === config.STRIPE_PRICE_PRO_MONTHLY) {
      return 'pro';
    }

    return 'free';
  }

  private async ensureStripeCustomer(organization: IOrganizationDocument): Promise<string> {
    const existingCustomerId = organization.billing?.stripeCustomerId;
    if (existingCustomerId) {
      return existingCustomerId;
    }

    const owner = await User.findById(organization.ownerId).select('email name').lean();

    const customer = await this.stripe.customers.create({
      email: owner?.email,
      name: owner?.name || organization.name,
      metadata: {
        organizationId: organization._id.toString(),
      },
    });

    organization.billing = {
      ...organization.billing,
      stripeCustomerId: customer.id,
      subscriptionStatus: organization.billing?.subscriptionStatus || 'none',
    };

    await organization.save();
    return customer.id;
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
    subscription: StripeSubscription,
    customerId?: string,
  ): Promise<IOrganizationDocument | null> {
    const metadataOrgId = subscription.metadata?.organizationId;

    if (metadataOrgId && mongoose.Types.ObjectId.isValid(metadataOrgId)) {
      const orgByMetadata = await Organization.findById(metadataOrgId);
      if (orgByMetadata) {
        return orgByMetadata;
      }
    }

    return this.findOrganizationByStripeReference(subscription.id, customerId);
  }

  private async findOrganizationByStripeReference(
    subscriptionId?: string,
    customerId?: string,
  ): Promise<IOrganizationDocument | null> {
    const filters: Array<Record<string, unknown>> = [];

    if (subscriptionId) {
      filters.push({ 'billing.stripeSubscriptionId': subscriptionId });
    }
    if (customerId) {
      filters.push({ 'billing.stripeCustomerId': customerId });
    }

    if (!filters.length) {
      return null;
    }

    return Organization.findOne({ $or: filters });
  }

  private toDate(unixSeconds?: number): Date | undefined {
    if (!unixSeconds) {
      return undefined;
    }
    return new Date(unixSeconds * 1000);
  }

  private toInternalSubscriptionStatus(
    status: string,
  ):
    | 'none'
    | 'active'
    | 'trialing'
    | 'past_due'
    | 'unpaid'
    | 'incomplete'
    | 'incomplete_expired'
    | 'canceled' {
    switch (status) {
      case 'active':
      case 'trialing':
      case 'past_due':
      case 'unpaid':
      case 'incomplete':
      case 'incomplete_expired':
      case 'canceled':
        return status;
      case 'paused':
        return 'past_due';
      default:
        return 'none';
    }
  }

  private async isDuplicateEvent(event: StripeWebhookEvent): Promise<boolean> {
    try {
      await BillingEvent.create({
        provider: 'stripe',
        eventId: event.id,
        eventType: event.type,
      });
      return false;
    } catch (error: unknown) {
      if (this.hasMongoDuplicateCode(error)) {
        return true;
      }
      throw error;
    }
  }

  private asCheckoutSession(value: unknown): StripeCheckoutSession {
    return (value || {}) as StripeCheckoutSession;
  }

  private asInvoice(value: unknown): StripeInvoice {
    return (value || {}) as StripeInvoice;
  }

  private asSubscription(value: unknown): StripeSubscription {
    return (value || {}) as StripeSubscription;
  }

  private hasMongoDuplicateCode(error: unknown): boolean {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const maybeCode = (error as { code?: unknown }).code;
    return maybeCode === 11000;
  }
}
