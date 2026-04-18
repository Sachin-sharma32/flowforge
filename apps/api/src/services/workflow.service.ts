import mongoose from 'mongoose';
import { Workflow, IWorkflowDocument } from '../models/workflow.model';
import { NotFoundError, ValidationError } from '../domain/errors';
import { CreateWorkflowInput, RoleType, UpdateWorkflowInput } from '@flowforge/shared';
import { StepFactory } from '../engine/step-factory';
import { registerStepHandlers } from '../engine/register-step-handlers';
import { assertFolderAccessById, getAccessibleFolderIds } from './folder-access.service';

export interface WorkflowQuery {
  workspaceId: string;
  status?: string;
  page?: number;
  limit?: number;
  search?: string;
  folderId?: string;
  sortBy?: 'updatedAt' | 'createdAt' | 'name' | 'lastExecutedAt';
  sortOrder?: 'asc' | 'desc';
  dateFrom?: string;
  dateTo?: string;
  workspaceRole?: RoleType;
}

interface WorkflowStepInput {
  id: string;
  type: string;
  name: string;
  config: Record<string, unknown>;
  connections: Array<{ targetStepId: string; label: string }>;
}

export class WorkflowService {
  private validateSteps(steps: WorkflowStepInput[]): void {
    registerStepHandlers();

    const registeredTypes = new Set(StepFactory.getRegisteredTypes());
    const stepIds = new Set<string>();
    const validationErrors: string[] = [];

    for (const step of steps) {
      if (stepIds.has(step.id)) {
        validationErrors.push(`Duplicate step id "${step.id}"`);
        continue;
      }
      stepIds.add(step.id);

      if (!registeredTypes.has(step.type)) {
        throw new ValidationError(`Unknown step type: ${step.type}`, {
          stepId: step.id,
          stepType: step.type,
        });
      }

      const handler = StepFactory.create(step.type);
      const validation = handler.validate(step.config);
      if (!validation.valid) {
        throw new ValidationError(`Invalid config for step "${step.name}"`, {
          stepId: step.id,
          stepType: step.type,
          errors: validation.errors,
        });
      }

      if (step.type === 'condition') {
        for (const connection of step.connections) {
          if (connection.label !== 'true' && connection.label !== 'false') {
            validationErrors.push(
              `Condition step "${step.name}" has invalid branch label "${connection.label}"`,
            );
          }
        }

        const conditionLabels = new Set(step.connections.map((connection) => connection.label));
        if (conditionLabels.size !== step.connections.length) {
          validationErrors.push(`Condition step "${step.name}" has duplicate branch labels`);
        }
      }
    }

    for (const step of steps) {
      for (const connection of step.connections) {
        if (!stepIds.has(connection.targetStepId)) {
          validationErrors.push(
            `Step "${step.name}" points to missing target "${connection.targetStepId}"`,
          );
        }
        if (connection.targetStepId === step.id) {
          validationErrors.push(`Step "${step.name}" cannot connect to itself`);
        }
      }
    }

    const targetedSteps = new Set<string>();
    for (const step of steps) {
      for (const connection of step.connections) {
        targetedSteps.add(connection.targetStepId);
      }
    }
    const entryStepCount = steps.filter((step) => !targetedSteps.has(step.id)).length;
    if (steps.length > 0 && entryStepCount === 0) {
      validationErrors.push('Workflow must include at least one entry step');
    }

    if (this.hasCycle(steps)) {
      validationErrors.push('Workflow contains circular step connections');
    }

    if (validationErrors.length > 0) {
      throw new ValidationError('Invalid workflow step graph', {
        errors: validationErrors,
      });
    }
  }

  private hasCycle(steps: WorkflowStepInput[]): boolean {
    const adjacency = new Map<string, string[]>();
    for (const step of steps) {
      adjacency.set(
        step.id,
        step.connections.map((connection) => connection.targetStepId),
      );
    }

    const visiting = new Set<string>();
    const visited = new Set<string>();

    const dfs = (stepId: string): boolean => {
      if (visiting.has(stepId)) {
        return true;
      }
      if (visited.has(stepId)) {
        return false;
      }

      visiting.add(stepId);
      const neighbors = adjacency.get(stepId) || [];
      for (const neighbor of neighbors) {
        if (!adjacency.has(neighbor)) {
          continue;
        }
        if (dfs(neighbor)) {
          return true;
        }
      }

      visiting.delete(stepId);
      visited.add(stepId);
      return false;
    };

    for (const step of steps) {
      if (dfs(step.id)) {
        return true;
      }
    }

    return false;
  }

  private async ensureWorkflowFolderAccess(
    workflow: IWorkflowDocument,
    workspaceRole: RoleType | undefined,
    action: 'view' | 'edit' | 'execute',
  ): Promise<void> {
    if (!workspaceRole || !workflow.folderId) {
      return;
    }

    await assertFolderAccessById(
      workflow.folderId.toString(),
      workflow.workspaceId.toString(),
      workspaceRole,
      action,
    );
  }

  async list(query: WorkflowQuery) {
    const {
      workspaceId,
      status,
      page = 1,
      limit = 20,
      search,
      folderId,
      sortBy = 'updatedAt',
      sortOrder = 'desc',
      dateFrom,
      dateTo,
      workspaceRole,
    } = query;

    const filter: Record<string, unknown> = {
      workspaceId,
      status: { $ne: 'archived' },
      isTemplate: { $ne: true },
    };

    if (status) filter.status = status;
    if (search) filter.name = { $regex: search, $options: 'i' };

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
        filter.updatedAt = range;
      }
    }

    if (folderId) {
      filter.folderId = folderId;
    }

    if (workspaceRole && workspaceRole !== 'owner') {
      const visibleFolderIds = await getAccessibleFolderIds(workspaceId, workspaceRole, 'view');
      const visibilityFilter: Record<string, unknown> = {
        $or: [
          { folderId: { $exists: false } },
          { folderId: null },
          { folderId: { $in: visibleFolderIds } },
        ],
      };

      if (filter.$and && Array.isArray(filter.$and)) {
        (filter.$and as Array<Record<string, unknown>>).push(visibilityFilter);
      } else {
        filter.$and = [visibilityFilter];
      }
    }

    const sortFieldMap: Record<string, string> = {
      updatedAt: 'updatedAt',
      createdAt: 'createdAt',
      name: 'name',
      lastExecutedAt: 'lastExecutedAt',
    };

    const sortField = sortFieldMap[sortBy] || 'updatedAt';
    const sortDirection = sortOrder === 'asc' ? 1 : -1;

    const [rawWorkflows, total] = await Promise.all([
      Workflow.find(filter)
        .sort({ [sortField]: sortDirection })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Workflow.countDocuments(filter),
    ]);

    const workflows = rawWorkflows.map(({ _id, __v, ...rest }) => ({
      ...rest,
      id: _id.toString(),
    }));

    return {
      data: workflows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(
    workflowId: string,
    workspaceId: string,
    workspaceRole?: RoleType,
  ): Promise<IWorkflowDocument> {
    const workflow = await Workflow.findOne({ _id: workflowId, workspaceId });
    if (!workflow) throw new NotFoundError('Workflow not found');

    await this.ensureWorkflowFolderAccess(workflow, workspaceRole, 'view');

    return workflow;
  }

  async create(
    input: CreateWorkflowInput,
    workspaceId: string,
    userId: string,
    workspaceRole?: RoleType,
  ) {
    if (input.steps.length > 0) {
      this.validateSteps(input.steps);
    }

    if (input.folderId && workspaceRole) {
      await assertFolderAccessById(input.folderId, workspaceId, workspaceRole, 'edit');
    }

    return Workflow.create({
      ...input,
      folderId: input.folderId || null,
      workspaceId,
      createdBy: userId,
      updatedBy: userId,
    });
  }

  async update(
    workflowId: string,
    workspaceId: string,
    input: UpdateWorkflowInput,
    userId: string,
    workspaceRole?: RoleType,
  ) {
    const current = await Workflow.findOne({ _id: workflowId, workspaceId });
    if (!current) {
      throw new NotFoundError('Workflow not found');
    }

    await this.ensureWorkflowFolderAccess(current, workspaceRole, 'edit');

    if (input.steps) {
      this.validateSteps(input.steps);
    }

    const hasFolderUpdate = Object.prototype.hasOwnProperty.call(input, 'folderId');
    const nextFolderId = hasFolderUpdate
      ? input.folderId
        ? String(input.folderId)
        : null
      : current.folderId
        ? current.folderId.toString()
        : null;

    if (nextFolderId && workspaceRole) {
      if (!mongoose.Types.ObjectId.isValid(nextFolderId)) {
        throw new ValidationError('Invalid folder ID');
      }
      await assertFolderAccessById(nextFolderId, workspaceId, workspaceRole, 'edit');
    }

    const workflow = await Workflow.findOneAndUpdate(
      { _id: workflowId, workspaceId },
      {
        ...input,
        ...(hasFolderUpdate ? { folderId: nextFolderId } : {}),
        updatedBy: userId,
        $inc: { version: 1 },
      },
      { new: true },
    );
    if (!workflow) throw new NotFoundError('Workflow not found');
    return workflow;
  }

  async delete(workflowId: string, workspaceId: string, workspaceRole?: RoleType) {
    const existing = await this.getById(workflowId, workspaceId, workspaceRole);
    await this.ensureWorkflowFolderAccess(existing, workspaceRole, 'edit');

    const workflow = await Workflow.findOneAndUpdate(
      { _id: workflowId, workspaceId },
      { status: 'archived' },
      { new: true },
    );
    if (!workflow) throw new NotFoundError('Workflow not found');
    return workflow;
  }

  async duplicate(
    workflowId: string,
    workspaceId: string,
    userId: string,
    workspaceRole?: RoleType,
  ) {
    const source = await this.getById(workflowId, workspaceId, workspaceRole);
    await this.ensureWorkflowFolderAccess(source, workspaceRole, 'edit');

    return Workflow.create({
      workspaceId,
      folderId: source.folderId || null,
      name: `${source.name} (Copy)`,
      description: source.description,
      trigger: source.trigger,
      steps: source.steps,
      variables: source.variables,
      createdBy: userId,
      updatedBy: userId,
    });
  }

  async activate(workflowId: string, workspaceId: string, workspaceRole?: RoleType) {
    const existing = await this.getById(workflowId, workspaceId, workspaceRole);
    await this.ensureWorkflowFolderAccess(existing, workspaceRole, 'edit');

    const workflow = await Workflow.findOneAndUpdate(
      { _id: workflowId, workspaceId, status: { $in: ['draft', 'paused'] } },
      { status: 'active' },
      { new: true },
    );
    if (!workflow) throw new NotFoundError('Workflow not found or cannot be activated');
    return workflow;
  }

  async pause(workflowId: string, workspaceId: string, workspaceRole?: RoleType) {
    const existing = await this.getById(workflowId, workspaceId, workspaceRole);
    await this.ensureWorkflowFolderAccess(existing, workspaceRole, 'edit');

    const workflow = await Workflow.findOneAndUpdate(
      { _id: workflowId, workspaceId, status: 'active' },
      { status: 'paused' },
      { new: true },
    );
    if (!workflow) throw new NotFoundError('Workflow not found or not active');
    return workflow;
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

  async listTemplates(workspaceId: string) {
    const rawTemplates = await Workflow.find({
      workspaceId,
      isTemplate: true,
      status: { $ne: 'archived' },
    })
      .sort({ updatedAt: -1 })
      .lean();
    return rawTemplates.map(({ _id, __v, ...rest }) => ({ ...rest, id: _id.toString() }));
  }

  async createFromTemplate(templateId: string, workspaceId: string, userId: string) {
    const template = await Workflow.findOne({ _id: templateId, workspaceId, isTemplate: true });
    if (!template) throw new NotFoundError('Template not found');

    return Workflow.create({
      workspaceId,
      folderId: null,
      name: `${template.name}`,
      description: template.description,
      trigger: template.trigger,
      steps: template.steps,
      variables: template.variables,
      isTemplate: false,
      status: 'draft',
      createdBy: userId,
      updatedBy: userId,
    });
  }
}
