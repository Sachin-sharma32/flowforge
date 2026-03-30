import { ExecutionStatusValue, StepStatusValue } from '../constants/execution-statuses';
import { TriggerTypeValue } from '../constants/step-types';
export interface IExecutionStep {
    stepId: string;
    status: StepStatusValue;
    input?: Record<string, unknown>;
    output?: Record<string, unknown>;
    error?: string;
    startedAt?: Date;
    completedAt?: Date;
    durationMs?: number;
}
export interface IExecution {
    id: string;
    workflowId: string;
    workspaceId: string;
    status: ExecutionStatusValue;
    trigger: {
        type: TriggerTypeValue;
        payload?: Record<string, unknown>;
    };
    steps: IExecutionStep[];
    startedAt?: Date;
    completedAt?: Date;
    durationMs?: number;
    createdAt: Date;
}
export interface IExecutionStats {
    total: number;
    completed: number;
    failed: number;
    avgDurationMs: number;
    successRate: number;
}
