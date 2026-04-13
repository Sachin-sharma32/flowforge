import { Execution } from '../models/execution.model';
import { Workflow } from '../models/workflow.model';
import { StepFactory } from './step-factory';
import { ExecutionService } from '../services/execution.service';
import { EventBus } from '../infrastructure/event-bus';
import { EventTypes } from '../domain/events';
import { StepContext } from '../domain/interfaces/step-handler.interface';
import { logger } from '../infrastructure/logger';
import { createRedisClient } from '../config/redis';
import { registerStepHandlers } from './register-step-handlers';

export class WorkflowProcessor {
  private executionService = new ExecutionService();
  private eventBus = EventBus.getInstance();

  private async acquireLock(key: string, ttlMs: number): Promise<(() => Promise<void>) | null> {
    const redis = createRedisClient();
    const lockKey = `lock:execution:${key}`;
    const result = await redis.set(lockKey, '1', 'PX', ttlMs, 'NX');
    if (result !== 'OK') {
      await redis.quit();
      return null;
    }
    return async () => {
      await redis.del(lockKey);
      await redis.quit();
    };
  }

  async process(executionId: string): Promise<void> {
    const releaseLock = await this.acquireLock(executionId, 5 * 60 * 1000);
    if (!releaseLock) {
      logger.warn({ executionId }, 'Execution already being processed, skipping');
      return;
    }

    try {
      await this._process(executionId);
    } finally {
      await releaseLock();
    }
  }

  private async _process(executionId: string): Promise<void> {
    registerStepHandlers();

    const execution = await Execution.findById(executionId);
    if (!execution) {
      logger.error({ executionId }, 'Execution not found');
      return;
    }

    const workflow = await Workflow.findById(execution.workflowId);
    if (!workflow) {
      logger.error({ workflowId: execution.workflowId }, 'Workflow not found');
      return;
    }

    if (workflow.steps.length === 0) {
      logger.warn({ executionId, workflowId: workflow._id }, 'Workflow has no steps');
      execution.status = 'completed';
      execution.startedAt = new Date();
      execution.completedAt = new Date();
      execution.durationMs = 0;
      await execution.save();
      return;
    }

    // Mark execution as running
    execution.status = 'running';
    execution.startedAt = new Date();
    await execution.save();

    this.eventBus.publish(EventTypes.EXECUTION_STARTED, {
      executionId: execution._id.toString(),
      workspaceId: execution.workspaceId.toString(),
      workflowId: execution.workflowId.toString(),
    });

    // Build step graph for traversal
    const stepMap = new Map(workflow.steps.map((s) => [s.id, s]));
    const variables: Record<string, string> = {};
    workflow.variables.forEach((v) => {
      variables[v.key] = v.value;
    });

    // Find entry points (steps not targeted by any connection)
    const targetedSteps = new Set<string>();
    for (const step of workflow.steps) {
      for (const conn of step.connections) {
        targetedSteps.add(conn.targetStepId);
      }
    }
    const entrySteps = workflow.steps.filter((s) => !targetedSteps.has(s.id));

    if (entrySteps.length === 0 && workflow.steps.length > 0) {
      // Fallback: use first step
      entrySteps.push(workflow.steps[0]);
    }

    try {
      // Process from each entry point
      let lastOutput: Record<string, unknown> = execution.trigger.payload || {};

      for (const entryStep of entrySteps) {
        lastOutput = await this.executeStep(
          entryStep.id,
          stepMap,
          execution._id.toString(),
          workflow._id.toString(),
          execution.workspaceId.toString(),
          variables,
          lastOutput,
        );
      }

      // Mark execution as completed
      const completedAt = new Date();
      execution.status = 'completed';
      execution.completedAt = completedAt;
      execution.durationMs = completedAt.getTime() - execution.startedAt!.getTime();
      await execution.save();

      this.eventBus.publish(EventTypes.EXECUTION_COMPLETED, {
        executionId: execution._id.toString(),
        workspaceId: execution.workspaceId.toString(),
        status: 'completed',
        durationMs: execution.durationMs,
      });
    } catch (error) {
      const completedAt = new Date();
      execution.status = 'failed';
      execution.completedAt = completedAt;
      execution.durationMs =
        completedAt.getTime() - (execution.startedAt?.getTime() || completedAt.getTime());
      await execution.save();

      this.eventBus.publish(EventTypes.EXECUTION_FAILED, {
        executionId: execution._id.toString(),
        workspaceId: execution.workspaceId.toString(),
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      logger.error({ executionId, error }, 'Workflow execution failed');
    }
  }

  private async executeStep(
    stepId: string,
    stepMap: Map<string, (typeof Workflow.prototype.steps)[0]>,
    executionId: string,
    workflowId: string,
    workspaceId: string,
    variables: Record<string, string>,
    input: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const stepDef = stepMap.get(stepId);
    if (!stepDef) {
      logger.warn({ stepId }, 'Step definition not found, skipping');
      return input;
    }

    const startedAt = new Date();

    // Update step status to running
    await this.executionService.updateStepStatus(executionId, stepId, {
      status: 'running',
      input,
      startedAt,
    });

    this.eventBus.publish(EventTypes.STEP_STARTED, {
      executionId,
      workspaceId,
      stepId,
      stepType: stepDef.type,
    });

    // Execute the step using the factory
    const handler = StepFactory.create(stepDef.type);
    const context: StepContext = {
      stepId,
      executionId,
      workflowId,
      workspaceId,
      config: stepDef.config,
      input,
      variables,
    };

    const result = await handler.execute(context);
    const completedAt = new Date();
    const durationMs = completedAt.getTime() - startedAt.getTime();

    if (result.success) {
      await this.executionService.updateStepStatus(executionId, stepId, {
        status: 'completed',
        output: result.output,
        completedAt,
        durationMs,
      });

      this.eventBus.publish(EventTypes.STEP_COMPLETED, {
        executionId,
        workspaceId,
        stepId,
        output: result.output,
        durationMs,
      });

      // Determine next steps based on connections
      let nextOutput = { ...input, ...result.output };

      for (const connection of stepDef.connections) {
        // For condition nodes, follow the matching branch
        if (stepDef.type === 'condition') {
          const branch = (result.output as { branch?: string }).branch;
          if (connection.label !== branch) continue;
        }

        // Execute the connected step
        nextOutput = await this.executeStep(
          connection.targetStepId,
          stepMap,
          executionId,
          workflowId,
          workspaceId,
          variables,
          nextOutput,
        );
      }

      return nextOutput;
    } else {
      await this.executionService.updateStepStatus(executionId, stepId, {
        status: 'failed',
        error: result.error,
        completedAt,
        durationMs,
      });

      this.eventBus.publish(EventTypes.STEP_FAILED, {
        executionId,
        workspaceId,
        stepId,
        error: result.error,
        durationMs,
      });

      throw new Error(`Step "${stepDef.name}" failed: ${result.error}`);
    }
  }
}
