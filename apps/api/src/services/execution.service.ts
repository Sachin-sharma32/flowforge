import mongoose from 'mongoose';
import { RoleType } from '@flowforge/shared';
import { Execution, IExecutionDocument } from '../models/execution.model';
import { Workflow } from '../models/workflow.model';
import { NotFoundError, ForbiddenError } from '../domain/errors';
import { Workspace } from '../models/workspace.model';
import { Organization } from '../models/organization.model';
import { UsageService } from './usage.service';
import { assertFolderAccessById, getAccessibleFolderIds } from './folder-access.service';

export interface ExecutionQuery {
  workspaceId: string;
  workflowId?: string;
  folderId?: string;
  status?: string;
  triggerType?: string;
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'createdAt' | 'status' | 'durationMs';
  sortOrder?: 'asc' | 'desc';
  dateFrom?: string;
  dateTo?: string;
  durationMin?: number;
  durationMax?: number;
  workspaceRole?: RoleType;
}

interface ExecutionListItem {
  _id: mongoose.Types.ObjectId | string;
  id?: string;
  workflowId?:
    | mongoose.Types.ObjectId
    | string
    | {
        _id?: mongoose.Types.ObjectId | string;
        name?: string;
        folderId?: mongoose.Types.ObjectId | string | null;
      }
    | null;
  status: string;
  trigger?: {
    type?: string;
    payload?: Record<string, unknown>;
  };
  durationMs?: number;
  createdAt: Date;
  [key: string]: unknown;
}

interface ExecutionListResult {
  data: ExecutionListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class ExecutionService {
  private usageService = new UsageService();

  async list(query: ExecutionQuery): Promise<ExecutionListResult> {
    const {
      workspaceId,
      workflowId,
      folderId,
      status,
      triggerType,
      page = 1,
      limit = 20,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      dateFrom,
      dateTo,
      durationMin,
      durationMax,
      workspaceRole,
    } = query;

    const filter: Record<string, unknown> = { workspaceId };

    if (workflowId) filter.workflowId = workflowId;
    if (status) filter.status = status;
    if (triggerType) filter['trigger.type'] = triggerType;

    if (dateFrom || dateTo) {
      const range: Record<string, Date> = {};
      const fromDate = this.parseFilterDate(dateFrom, 'start');
      const toDate = this.parseFilterDate(dateTo, 'end');
      if (fromDate) {
        range.$gte = fromDate;
      }
      if (toDate) {
        range.$lte = toDate;
      }
      if (Object.keys(range).length > 0) {
        filter.createdAt = range;
      }
    }

    if (durationMin !== undefined || durationMax !== undefined) {
      const durationRange: Record<string, number> = {};
      if (durationMin !== undefined && Number.isFinite(durationMin)) {
        durationRange.$gte = durationMin;
      }
      if (durationMax !== undefined && Number.isFinite(durationMax)) {
        durationRange.$lte = durationMax;
      }
      if (Object.keys(durationRange).length > 0) {
        filter.durationMs = durationRange;
      }
    }

    const sortFieldMap: Record<string, string> = {
      createdAt: 'createdAt',
      status: 'status',
      durationMs: 'durationMs',
    };

    const sortField = sortFieldMap[sortBy] || 'createdAt';
    const sortDirection = sortOrder === 'asc' ? 1 : -1;

    const rawExecutions = (await Execution.find(filter)
      .sort({ [sortField]: sortDirection })
      .populate('workflowId', 'name folderId')
      .lean()) as ExecutionListItem[];

    let accessibleFolderIdsSet: Set<string> | null = null;
    if (workspaceRole && workspaceRole !== 'owner') {
      const accessibleFolderIds = await getAccessibleFolderIds(workspaceId, workspaceRole, 'view');
      accessibleFolderIdsSet = new Set(accessibleFolderIds.map((id) => id.toString()));
    }

    const normalizedFolderFilter = folderId || undefined;
    const normalizedSearch = search?.trim().toLowerCase();

    const filteredExecutions = rawExecutions.filter((execution) => {
      const workflowMeta = this.getWorkflowMeta(execution.workflowId);
      const workflowFolderId = workflowMeta.folderId;
      const workflowName = workflowMeta.name.toLowerCase();

      if (normalizedFolderFilter && workflowFolderId !== normalizedFolderFilter) {
        return false;
      }

      if (
        accessibleFolderIdsSet &&
        workflowFolderId !== null &&
        !accessibleFolderIdsSet.has(workflowFolderId)
      ) {
        return false;
      }

      if (normalizedSearch && !workflowName.includes(normalizedSearch)) {
        return false;
      }

      return true;
    });

    const total = filteredExecutions.length;
    const paged = filteredExecutions.slice((page - 1) * limit, (page - 1) * limit + limit);

    const normalized: ExecutionListItem[] = paged.map((execution) => ({
      ...execution,
      id: String(execution._id),
    }));

    return {
      data: normalized,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(
    executionId: string,
    workspaceId: string,
    workspaceRole?: RoleType,
  ): Promise<IExecutionDocument> {
    const execution = await Execution.findOne({ _id: executionId, workspaceId }).populate(
      'workflowId',
      'name steps folderId',
    );
    if (!execution) throw new NotFoundError('Execution not found');

    if (workspaceRole) {
      const workflowMeta = this.getWorkflowMeta(execution.workflowId);
      if (workflowMeta.folderId) {
        await assertFolderAccessById(workflowMeta.folderId, workspaceId, workspaceRole, 'view');
      }
    }

    return execution;
  }

  async create(
    workflowId: string,
    workspaceId: string,
    triggerType: string,
    payload?: Record<string, unknown>,
    workspaceRole?: RoleType,
  ) {
    const workflow = await Workflow.findOne({ _id: workflowId, workspaceId });
    if (!workflow) throw new NotFoundError('Workflow not found');

    if (workspaceRole && workflow.folderId) {
      await assertFolderAccessById(
        workflow.folderId.toString(),
        workspaceId,
        workspaceRole,
        'execute',
      );
    }

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

    await Workflow.findByIdAndUpdate(workflowId, { lastExecutedAt: new Date() });

    return execution;
  }

  async cancel(executionId: string, workspaceId: string, workspaceRole?: RoleType) {
    const existing = await Execution.findOne({ _id: executionId, workspaceId }).populate(
      'workflowId',
      'folderId',
    );

    if (!existing || !['pending', 'running'].includes(existing.status)) {
      throw new NotFoundError('Execution not found or already completed');
    }

    if (workspaceRole) {
      const workflowMeta = this.getWorkflowMeta(existing.workflowId);
      if (workflowMeta.folderId) {
        await assertFolderAccessById(workflowMeta.folderId, workspaceId, workspaceRole, 'edit');
      }
    }

    const execution = await Execution.findOneAndUpdate(
      { _id: executionId, workspaceId, status: { $in: ['pending', 'running'] } },
      { status: 'cancelled', completedAt: new Date() },
      { new: true },
    );

    if (!execution) {
      throw new NotFoundError('Execution not found or already completed');
    }

    return execution;
  }

  async getStats(workspaceId: string, workspaceRole?: RoleType) {
    if (workspaceRole && workspaceRole !== 'owner') {
      const listed = await this.list({ workspaceId, workspaceRole, page: 1, limit: 100000 });
      const executions = listed.data;

      const completed = executions.filter((execution) => execution.status === 'completed').length;
      const failed = executions.filter((execution) => execution.status === 'failed').length;
      const running = executions.filter((execution) => execution.status === 'running').length;
      const pending = executions.filter((execution) => execution.status === 'pending').length;
      const cancelled = executions.filter((execution) => execution.status === 'cancelled').length;
      const durations = executions
        .map((execution) => execution.durationMs)
        .filter((duration): duration is number => typeof duration === 'number');

      const avgDurationMs = durations.length
        ? Math.round(durations.reduce((acc, value) => acc + value, 0) / durations.length)
        : 0;

      const total = executions.length;

      return {
        total,
        completed,
        failed,
        running,
        pending,
        cancelled,
        avgDurationMs,
        successRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      };
    }

    const workspaceObjectId = this.toObjectId(workspaceId);
    const stats = await Execution.aggregate([
      { $match: { workspaceId: workspaceObjectId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
          running: { $sum: { $cond: [{ $eq: ['$status', 'running'] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
          avgDurationMs: { $avg: '$durationMs' },
        },
      },
    ]);

    if (!stats.length) {
      return {
        total: 0,
        completed: 0,
        failed: 0,
        running: 0,
        pending: 0,
        cancelled: 0,
        avgDurationMs: 0,
        successRate: 0,
      };
    }

    const {
      total = 0,
      completed = 0,
      failed = 0,
      running = 0,
      pending = 0,
      cancelled = 0,
      avgDurationMs = 0,
    } = stats[0];

    return {
      total,
      completed,
      failed,
      running,
      pending,
      cancelled,
      avgDurationMs: Math.round(avgDurationMs ?? 0),
      successRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }

  async getTimeline(workspaceId: string, days: number = 14, workspaceRole?: RoleType) {
    if (workspaceRole && workspaceRole !== 'owner') {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);

      const listed = await this.list({
        workspaceId,
        workspaceRole,
        dateFrom: startDate.toISOString(),
        page: 1,
        limit: 100000,
      });

      const timeline: Array<{ date: string; total: number; completed: number; failed: number }> =
        [];
      const dataMap = new Map<string, { total: number; completed: number; failed: number }>();

      for (const execution of listed.data) {
        const key = new Date(execution.createdAt).toISOString().split('T')[0];
        const current = dataMap.get(key) || { total: 0, completed: 0, failed: 0 };
        current.total += 1;
        if (execution.status === 'completed') current.completed += 1;
        if (execution.status === 'failed') current.failed += 1;
        dataMap.set(key, current);
      }

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

  async getStatsByWorkflow(workspaceId: string, workspaceRole?: RoleType) {
    if (workspaceRole && workspaceRole !== 'owner') {
      const listed = await this.list({ workspaceId, workspaceRole, page: 1, limit: 100000 });
      const grouped = new Map<
        string,
        {
          workflowId: string;
          workflowName: string;
          total: number;
          completed: number;
          failed: number;
          durationTotal: number;
          durationCount: number;
        }
      >();

      for (const execution of listed.data) {
        const workflowMeta = this.getWorkflowMeta(execution.workflowId);
        const workflowId = workflowMeta.id || 'deleted-workflow';
        const workflowName = workflowMeta.name || 'Deleted Workflow';
        const current = grouped.get(workflowId) || {
          workflowId,
          workflowName,
          total: 0,
          completed: 0,
          failed: 0,
          durationTotal: 0,
          durationCount: 0,
        };

        current.total += 1;
        if (execution.status === 'completed') current.completed += 1;
        if (execution.status === 'failed') current.failed += 1;
        if (typeof execution.durationMs === 'number') {
          current.durationTotal += execution.durationMs;
          current.durationCount += 1;
        }

        grouped.set(workflowId, current);
      }

      return Array.from(grouped.values())
        .map((entry) => ({
          workflowId: entry.workflowId,
          workflowName: entry.workflowName,
          total: entry.total,
          completed: entry.completed,
          failed: entry.failed,
          avgDurationMs:
            entry.durationCount > 0 ? Math.round(entry.durationTotal / entry.durationCount) : 0,
          successRate: entry.total > 0 ? Math.round((entry.completed / entry.total) * 100) : 0,
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);
    }

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

  private getWorkflowMeta(workflowRef: unknown): {
    id: string | null;
    name: string;
    folderId: string | null;
  } {
    if (!workflowRef) {
      return { id: null, name: '', folderId: null };
    }

    if (typeof workflowRef === 'string' || workflowRef instanceof mongoose.Types.ObjectId) {
      return { id: String(workflowRef), name: '', folderId: null };
    }

    if (typeof workflowRef !== 'object') {
      return { id: null, name: '', folderId: null };
    }

    const raw = workflowRef as {
      _id?: unknown;
      name?: unknown;
      folderId?: unknown;
    };

    return {
      id: raw._id ? String(raw._id) : null,
      name: typeof raw.name === 'string' ? raw.name : '',
      folderId: raw.folderId ? String(raw.folderId) : null,
    };
  }

  private parseFilterDate(value: string | undefined, boundary: 'start' | 'end'): Date | null {
    if (!value) {
      return null;
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      if (boundary === 'start') {
        date.setUTCHours(0, 0, 0, 0);
      } else {
        date.setUTCHours(23, 59, 59, 999);
      }
    }

    return date;
  }

  private toObjectId(id: string): mongoose.Types.ObjectId {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError('Invalid workspace ID');
    }
    return new mongoose.Types.ObjectId(id);
  }
}
