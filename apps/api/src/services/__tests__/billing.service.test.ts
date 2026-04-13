import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { BillingService } from '../billing.service';
import { Organization } from '../../models/organization.model';
import { BillingEvent } from '../../models/billing-event.model';
import { getLimitsForPlan } from '../../domain/billing';
import { config } from '../../config';

function createStripeMock() {
  return {
    checkout: {
      sessions: {
        create: jest.fn(),
      },
    },
    billingPortal: {
      sessions: {
        create: jest.fn(),
      },
    },
    customers: {
      create: jest.fn(),
    },
    subscriptions: {
      retrieve: jest.fn(),
    },
    webhooks: {
      constructEvent: jest.fn(),
    },
  };
}

describe('BillingService webhook sync', () => {
  let mongoServer: MongoMemoryServer;
  let billingService: BillingService;
  const stripeMock = createStripeMock();

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  beforeEach(() => {
    billingService = new BillingService(stripeMock);
  });

  afterEach(async () => {
    await Promise.all([Organization.deleteMany({}), BillingEvent.deleteMany({})]);
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('upgrades organization to pro on subscription update', async () => {
    const ownerId = new mongoose.Types.ObjectId();
    const org = await Organization.create({
      name: 'Acme',
      slug: 'acme',
      ownerId,
      plan: 'free',
      limits: getLimitsForPlan('free'),
      billing: { stripeCustomerId: 'cus_123', subscriptionStatus: 'none' },
    });

    const event = {
      id: 'evt_subscription_updated',
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_123',
          status: 'active',
          customer: 'cus_123',
          items: { data: [{ price: { id: config.STRIPE_PRICE_PRO_MONTHLY } }] },
          metadata: { organizationId: org._id.toString() },
          current_period_start: 1710000000,
          current_period_end: 1712592000,
          cancel_at_period_end: false,
        },
      },
    };

    const result = await billingService.processStripeEvent(event);
    expect(result.duplicate).toBe(false);

    const updated = await Organization.findById(org._id);
    expect(updated?.plan).toBe('pro');
    expect(updated?.limits.maxExecutionsPerMonth).toBe(config.PRO_EXECUTION_LIMIT);
    expect(updated?.billing?.stripeSubscriptionId).toBe('sub_123');
    expect(updated?.billing?.subscriptionStatus).toBe('active');
  });

  it('downgrades organization to free on subscription deleted', async () => {
    const ownerId = new mongoose.Types.ObjectId();
    const org = await Organization.create({
      name: 'Acme Pro',
      slug: 'acme-pro',
      ownerId,
      plan: 'pro',
      limits: getLimitsForPlan('pro'),
      billing: {
        stripeCustomerId: 'cus_pro',
        stripeSubscriptionId: 'sub_pro',
        subscriptionStatus: 'active',
      },
    });

    const event = {
      id: 'evt_subscription_deleted',
      type: 'customer.subscription.deleted',
      data: {
        object: {
          id: 'sub_pro',
          status: 'canceled',
          customer: 'cus_pro',
          items: { data: [{ price: { id: config.STRIPE_PRICE_PRO_MONTHLY } }] },
          metadata: { organizationId: org._id.toString() },
          current_period_start: 1710000000,
          current_period_end: 1712592000,
          cancel_at_period_end: true,
        },
      },
    };

    await billingService.processStripeEvent(event);

    const updated = await Organization.findById(org._id);
    expect(updated?.plan).toBe('free');
    expect(updated?.limits.maxExecutionsPerMonth).toBe(config.FREE_EXECUTION_LIMIT);
    expect(updated?.billing?.subscriptionStatus).toBe('canceled');
  });

  it('ignores duplicate webhook events idempotently', async () => {
    const event = {
      id: 'evt_duplicate',
      type: 'invoice.payment_failed',
      data: {
        object: {
          customer: 'cus_missing',
          subscription: 'sub_missing',
        },
      },
    };

    const first = await billingService.processStripeEvent(event);
    const second = await billingService.processStripeEvent(event);

    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(true);
  });
});
