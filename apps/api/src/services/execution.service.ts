import mongoose from 'mongoose';
import { Execution, IExecutionDocument } from '../models/execution.model';
import { Workflow } from '../models/workflow.model';
import { NotFoundError, ForbiddenError } from '../domain/errors';
import { Workspace } from '../models/workspace.model';
import { Organization } from '../models/organization.model';
import { UsageService } from './usage.service';

export interface ExecutionQuery {
  workspaceId: string;
  workflowId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export class ExecutionService {
  private usageService = new UsageService();

  async list(query: ExecutionQuery) {
    const { workspaceId, workflowId, status, page = 1, limit = 20 } = query;
    const filter: Record<string, unknown> = { workspaceId };

    if (workflowId) filter.workflowId = workflowId;
    if (status) filter.status = status;

    const [executions, total] = await Promise.all([
      Execution.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('workflowId', 'name')
        .lean(),
      Execution.countDocuments(filter),
    ]);

    return {
      data: executions,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(executionId: string, workspaceId: string): Promise<IExecutionDocument> {
    const execution = await Execution.findOne({ _id: executionId, workspaceId }).populate(
      'workflowId',
      'name steps',
    );
    if (!execution) throw new NotFoundError('Execution not found');
    return execution;
  }

  async create(
    workflowId: string,
    workspaceId: string,
    triggerType: string,
    payload?: Record<string, unknown>,
  ) {
    const workflow = await Workflow.findOne({ _id: workflowId, workspaceId });
    if (!workflow) throw new NotFoundError('Workflow not found');

    if (workflow.status !== 'active' && triggerType !== 'manual') {
      throw new ForbiddenError('Workflow is not active');
    }

    const workspace = await Workspace.findById(workspaceId).select('organizationId');
    if (!workspace) throw new NotFoundError('Workspace not found');

    const organization = await Organization.findById(workspace.organizationId).select(
      'plan limits',
    );
    if (!organization) throw new NotFoundError('Organization not found');

    await this.usageService.reserveExecution(
      organization._id.toString(),
      organization.plan,
      organization.limits.maxExecutionsPerMonth,
    );

    const execution = await Execution.create({
      workflowId,
      workspaceId,
      status: 'pending',
      trigger: { type: triggerType, payload },
      steps: workflow.steps.map((step) => ({
        stepId: step.id,
        status: 'pending',
      })),
    });

    // Update last executed timestamp
    await Workflow.findByIdAndUpdate(workflowId, { lastExecutedAt: new Date() });

    return execution;
  }

  async cancel(executionId: string, workspaceId: string) {
    const execution = await Execution.findOneAndUpdate(
      { _id: executionId, workspaceId, status: { $in: ['pending', 'running'] } },
      { status: 'cancelled', completedAt: new Date() },
      { new: true },
    );
    if (!execution) throw new NotFoundError('Execution not found or already completed');
    return execution;
  }

  async getStats(workspaceId: string) {
    const workspaceObjectId = this.toObjectId(workspaceId);
    const stats = await Execution.aggregate([
      { $match: { workspaceId: workspaceObjectId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
          avgDurationMs: { $avg: '$durationMs' },
        },
      },
    ]);

    if (!stats.length) {
      return { total: 0, completed: 0, failed: 0, avgDurationMs: 0, successRate: 0 };
    }

    const { total = 0, completed = 0, failed = 0, avgDurationMs = 0 } = stats[0];
    return {
      total,
      completed,
      failed,
      avgDurationMs: Math.round(avgDurationMs ?? 0),
      successRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }

  async getTimeline(workspaceId: string, days: number = 14) {
    const workspaceObjectId = this.toObjectId(workspaceId);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const pipeline = await Execution.aggregate([
      {
        $match: {
          workspaceId: workspaceObjectId,
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Fill in missing days with zero values
    const timeline: Array<{ date: string; total: number; completed: number; failed: number }> = [];
    const dataMap = new Map(pipeline.map((p) => [p._id, p]));

    for (let i = 0; i <= days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split('T')[0];
      const entry = dataMap.get(key);
      timeline.push({
        date: key,
        total: entry?.total || 0,
        completed: entry?.completed || 0,
        failed: entry?.failed || 0,
      });
    }

    return timeline;
  }

  async getStatsByWorkflow(workspaceId: string) {
    const workspaceObjectId = this.toObjectId(workspaceId);
    const stats = await Execution.aggregate([
      { $match: { workspaceId: workspaceObjectId } },
      {
        $group: {
          _id: '$workflowId',
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
          avgDurationMs: { $avg: '$durationMs' },
        },
      },
      { $sort: { total: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'workflows',
          localField: '_id',
          foreignField: '_id',
          as: 'workflow',
        },
      },
      { $unwind: { path: '$workflow', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          workflowId: '$_id',
          workflowName: { $ifNull: ['$workflow.name', 'Deleted Workflow'] },
          total: 1,
          completed: 1,
          failed: 1,
          avgDurationMs: { $round: [{ $ifNull: ['$avgDurationMs', 0] }, 0] },
          successRate: {
            $cond: [
              { $gt: ['$total', 0] },
              { $round: [{ $multiply: [{ $divide: ['$completed', '$total'] }, 100] }, 0] },
              0,
            ],
          },
        },
      },
    ]);

    return stats;
  }

  async updateStepStatus(
    executionId: string,
    stepId: string,
    update: {
      status: string;
      input?: Record<string, unknown>;
      output?: Record<string, unknown>;
      error?: string;
      startedAt?: Date;
      completedAt?: Date;
      durationMs?: number;
    },
  ) {
    return Execution.findOneAndUpdate(
      { _id: executionId, 'steps.stepId': stepId },
      {
        $set: {
          'steps.$.status': update.status,
          ...(update.input && { 'steps.$.input': update.input }),
          ...(update.output && { 'steps.$.output': update.output }),
          ...(update.error && { 'steps.$.error': update.error }),
          ...(update.startedAt && { 'steps.$.startedAt': update.startedAt }),
          ...(update.completedAt && { 'steps.$.completedAt': update.completedAt }),
          ...(update.durationMs !== undefined && { 'steps.$.durationMs': update.durationMs }),
        },
      },
      { new: true },
    );
  }

  private toObjectId(id: string): mongoose.Types.ObjectId {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError('Invalid workspace ID');
    }
    return new mongoose.Types.ObjectId(id);
  }
}
