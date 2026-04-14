import { Workflow, IWorkflowDocument } from '../models/workflow.model';
import { NotFoundError, ValidationError } from '../domain/errors';
import { CreateWorkflowInput, UpdateWorkflowInput } from '@flowforge/shared';
import { StepFactory } from '../engine/step-factory';
import { registerStepHandlers } from '../engine/register-step-handlers';

export interface WorkflowQuery {
  workspaceId: string;
  status?: string;
  page?: number;
  limit?: number;
  search?: string;
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
    if (input.steps.length > 0) {
      this.validateSteps(input.steps);
    }

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
    if (input.steps) {
      this.validateSteps(input.steps);
    }

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
