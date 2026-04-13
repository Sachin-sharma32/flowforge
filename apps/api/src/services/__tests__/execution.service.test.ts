import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ExecutionService } from '../execution.service';
import { Execution } from '../../models/execution.model';
import { Organization } from '../../models/organization.model';
import { Workspace } from '../../models/workspace.model';
import { Workflow } from '../../models/workflow.model';
import { OrganizationUsage } from '../../models/organization-usage.model';
import { getLimitsForPlan } from '../../domain/billing';
import { PaymentRequiredError } from '../../domain/errors';

describe('ExecutionService', () => {
  let mongoServer: MongoMemoryServer;
  const executionService = new ExecutionService();

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  afterEach(async () => {
    await Promise.all([
      Execution.deleteMany({}),
      Workflow.deleteMany({}),
      Workspace.deleteMany({}),
      Organization.deleteMany({}),
      OrganizationUsage.deleteMany({}),
    ]);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('returns correct stats when workspaceId is passed as string', async () => {
    const workspaceA = new mongoose.Types.ObjectId();
    const workspaceB = new mongoose.Types.ObjectId();
    const workflowId = new mongoose.Types.ObjectId();

    await Execution.create([
      {
        workflowId,
        workspaceId: workspaceA,
        status: 'completed',
        trigger: { type: 'manual' },
        steps: [],
        durationMs: 100,
      },
      {
        workflowId,
        workspaceId: workspaceA,
        status: 'failed',
        trigger: { type: 'manual' },
        steps: [],
        durationMs: 300,
      },
      {
        workflowId,
        workspaceId: workspaceB,
        status: 'completed',
        trigger: { type: 'manual' },
        steps: [],
        durationMs: 200,
      },
    ]);

    const stats = await executionService.getStats(workspaceA.toString());
    expect(stats.total).toBe(2);
    expect(stats.completed).toBe(1);
    expect(stats.failed).toBe(1);
    expect(stats.avgDurationMs).toBe(200);
    expect(stats.successRate).toBe(50);
  });

  it('enforces organization monthly execution quota on creation', async () => {
    const ownerId = new mongoose.Types.ObjectId();
    const organization = await Organization.create({
      name: 'Acme Org',
      slug: 'acme-org',
      ownerId,
      plan: 'free',
      limits: { ...getLimitsForPlan('free'), maxExecutionsPerMonth: 1 },
      billing: { subscriptionStatus: 'none', cancelAtPeriodEnd: false },
    });

    const workspace = await Workspace.create({
      organizationId: organization._id,
      name: 'Default Workspace',
      slug: 'default',
      members: [{ userId: ownerId, role: 'owner', joinedAt: new Date() }],
    });

    const workflow = await Workflow.create({
      workspaceId: workspace._id,
      name: 'Test Workflow',
      description: 'Quota test',
      status: 'active',
      trigger: { type: 'manual', config: {} },
      steps: [
        {
          id: 'step-1',
          type: 'delay',
          name: 'Delay',
          config: { delayMs: 1 },
          position: { x: 0, y: 0 },
          connections: [],
        },
      ],
      variables: [],
      version: 1,
      createdBy: ownerId,
      updatedBy: ownerId,
    });

    const firstExecution = await executionService.create(
      workflow._id.toString(),
      workspace._id.toString(),
      'manual',
      { sample: true },
    );
    expect(firstExecution.status).toBe('pending');

    await expect(
      executionService.create(workflow._id.toString(), workspace._id.toString(), 'manual'),
    ).rejects.toBeInstanceOf(PaymentRequiredError);

    const usage = await OrganizationUsage.findOne({ organizationId: organization._id });
    expect(usage?.executionsUsed).toBe(1);
  });
});
