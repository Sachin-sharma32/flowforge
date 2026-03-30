import { Execution, IExecutionDocument } from '../models/execution.model';
import { Workflow } from '../models/workflow.model';
import { NotFoundError, ForbiddenError } from '../domain/errors';

export interface ExecutionQuery {
  workspaceId: string;
  workflowId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export class ExecutionService {
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

  async create(workflowId: string, workspaceId: string, triggerType: string, payload?: Record<string, unknown>) {
    const workflow = await Workflow.findOne({ _id: workflowId, workspaceId });
    if (!workflow) throw new NotFoundError('Workflow not found');

    if (workflow.status !== 'active' && triggerType !== 'manual') {
      throw new ForbiddenError('Workflow is not active');
    }

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
    const stats = await Execution.aggregate([
      { $match: { workspaceId } },
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

    const { total, completed, failed, avgDurationMs } = stats[0];
    return {
      total,
      completed,
      failed,
      avgDurationMs: Math.round(avgDurationMs || 0),
      successRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
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
}
