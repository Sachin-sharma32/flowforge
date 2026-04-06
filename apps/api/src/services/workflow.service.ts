import { Workflow, IWorkflowDocument } from '../models/workflow.model';
import { NotFoundError } from '../domain/errors';
import { CreateWorkflowInput, UpdateWorkflowInput } from '@flowforge/shared';

export interface WorkflowQuery {
  workspaceId: string;
  status?: string;
  page?: number;
  limit?: number;
  search?: string;
}

export class WorkflowService {
  async list(query: WorkflowQuery) {
    const { workspaceId, status, page = 1, limit = 20, search } = query;
    const filter: Record<string, unknown> = { workspaceId, status: { $ne: 'archived' } };

    if (status) filter.status = status;
    if (search) filter.name = { $regex: search, $options: 'i' };

    const [workflows, total] = await Promise.all([
      Workflow.find(filter)
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Workflow.countDocuments(filter),
    ]);

    return {
      data: workflows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(workflowId: string, workspaceId: string): Promise<IWorkflowDocument> {
    const workflow = await Workflow.findOne({ _id: workflowId, workspaceId });
    if (!workflow) throw new NotFoundError('Workflow not found');
    return workflow;
  }

  async create(input: CreateWorkflowInput, workspaceId: string, userId: string) {
    return Workflow.create({
      ...input,
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
  ) {
    const workflow = await Workflow.findOneAndUpdate(
      { _id: workflowId, workspaceId },
      { ...input, updatedBy: userId, $inc: { version: 1 } },
      { new: true },
    );
    if (!workflow) throw new NotFoundError('Workflow not found');
    return workflow;
  }

  async delete(workflowId: string, workspaceId: string) {
    const workflow = await Workflow.findOneAndUpdate(
      { _id: workflowId, workspaceId },
      { status: 'archived' },
      { new: true },
    );
    if (!workflow) throw new NotFoundError('Workflow not found');
    return workflow;
  }

  async duplicate(workflowId: string, workspaceId: string, userId: string) {
    const source = await this.getById(workflowId, workspaceId);

    return Workflow.create({
      workspaceId,
      name: `${source.name} (Copy)`,
      description: source.description,
      trigger: source.trigger,
      steps: source.steps,
      variables: source.variables,
      createdBy: userId,
      updatedBy: userId,
    });
  }

  async activate(workflowId: string, workspaceId: string) {
    const workflow = await Workflow.findOneAndUpdate(
      { _id: workflowId, workspaceId, status: { $in: ['draft', 'paused'] } },
      { status: 'active' },
      { new: true },
    );
    if (!workflow) throw new NotFoundError('Workflow not found or cannot be activated');
    return workflow;
  }

  async pause(workflowId: string, workspaceId: string) {
    const workflow = await Workflow.findOneAndUpdate(
      { _id: workflowId, workspaceId, status: 'active' },
      { status: 'paused' },
      { new: true },
    );
    if (!workflow) throw new NotFoundError('Workflow not found or not active');
    return workflow;
  }
}
