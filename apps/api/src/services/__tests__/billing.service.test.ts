import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { BillingService } from '../billing.service';
import { Organization } from '../../models/organization.model';
import { BillingEvent } from '../../models/billing-event.model';
import { getLimitsForPlan } from '../../domain/billing';
import { config } from '../../config';

function createRazorpayMock() {
  return {
    subscriptions: {
      create: jest.fn(),
      cancel: jest.fn(),
      fetch: jest.fn(),
    },
  };
}

describe('BillingService webhook sync', () => {
  let mongoServer: MongoMemoryServer;
  let billingService: BillingService;
  const razorpayMock = createRazorpayMock();

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  beforeEach(() => {
    billingService = new BillingService(razorpayMock as never);
  });

  afterEach(async () => {
    await Promise.all([Organization.deleteMany({}), BillingEvent.deleteMany({})]);
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('upgrades organization to pro on subscription.activated', async () => {
    const ownerId = new mongoose.Types.ObjectId();
    const org = await Organization.create({
      name: 'Acme',
      slug: 'acme',
      ownerId,
      plan: 'free',
      limits: getLimitsForPlan('free'),
    });

    const event = {
      event: 'subscription.activated',
      payload: {
        subscription: {
          entity: {
            id: 'sub_123',
            plan_id: config.RAZORPAY_PLAN_PRO_MONTHLY,
            status: 'active',
            current_start: 1710000000,
            current_end: 1712592000,
            notes: { organizationId: org._id.toString() },
          },
        },
      },
    };

    const result = await billingService.processRazorpayEvent(event);
    expect(result.duplicate).toBe(false);

    const updated = await Organization.findById(org._id);
    expect(updated?.plan).toBe('pro');
    expect(updated?.limits.maxExecutionsPerMonth).toBe(config.PRO_EXECUTION_LIMIT);
    expect(updated?.billing?.razorpaySubscriptionId).toBe('sub_123');
    expect(updated?.billing?.subscriptionStatus).toBe('active');
  });

  it('downgrades organization to free on subscription.cancelled', async () => {
    const ownerId = new mongoose.Types.ObjectId();
    const org = await Organization.create({
      name: 'Acme Pro',
      slug: 'acme-pro',
      ownerId,
      plan: 'pro',
      limits: getLimitsForPlan('pro'),
      billing: {
        razorpaySubscriptionId: 'sub_pro',
        subscriptionStatus: 'active',
      },
    });

    const event = {
      event: 'subscription.cancelled',
      payload: {
        subscription: {
          entity: {
            id: 'sub_pro',
            plan_id: config.RAZORPAY_PLAN_PRO_MONTHLY,
            status: 'cancelled',
            notes: { organizationId: org._id.toString() },
          },
        },
      },
    };

    await billingService.processRazorpayEvent(event);

    const updated = await Organization.findById(org._id);
    expect(updated?.plan).toBe('free');
    expect(updated?.limits.maxExecutionsPerMonth).toBe(config.FREE_EXECUTION_LIMIT);
    expect(updated?.billing?.subscriptionStatus).toBe('canceled');
  });

  it('ignores duplicate webhook events idempotently', async () => {
    const event = {
      event: 'subscription.halted',
      payload: {
        subscription: {
          entity: {
            id: 'sub_halted',
            status: 'halted',
            notes: {},
          },
        },
      },
    };

    const first = await billingService.processRazorpayEvent(event);
    const second = await billingService.processRazorpayEvent(event);

    expect(first.duplicate).toBe(false);
    expect(second.duplicate).toBe(true);
  });
});
