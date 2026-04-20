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
  running: number;
  pending: number;
  cancelled: number;
  avgDurationMs: number;
  successRate: number;
}

export interface IExecutionTimelinePoint {
  date: string;
  total: number;
  completed: number;
  failed: number;
}

export interface IWorkflowExecutionStats {
  workflowId: string;
  workflowName: string;
  total: number;
  completed: number;
  failed: number;
  avgDurationMs: number;
  successRate: number;
}

export interface IDashboardWindowStats {
  total: number;
  completed: number;
  failed: number;
  avgDurationMs: number;
  p95DurationMs: number;
  successRate: number;
}

export interface IDashboardSparklines {
  executions: number[];
  successRate: number[];
  p95Duration: number[];
  failed: number[];
}

export interface IDashboardSummary {
  activeWorkflows: number;
  totalWorkflows: number;
  last24h: IDashboardWindowStats;
  previous24h: IDashboardWindowStats;
  weekAgo: { successRate: number; p95DurationMs: number };
  sparklines: IDashboardSparklines;
}

export interface IWorkflowRecentActivity {
  workflowId: string;
  workflowName: string;
  status: 'active' | 'paused' | 'draft' | 'archived';
  lastExecutedAt: string | null;
  total: number;
  completed: number;
  failed: number;
  successRate: number;
  hourlyBuckets: Array<{ completed: number; failed: number; total: number }>;
}
