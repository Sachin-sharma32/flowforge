export const ExecutionStatus = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

export type ExecutionStatusValue = (typeof ExecutionStatus)[keyof typeof ExecutionStatus];

export const StepStatus = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  SKIPPED: 'skipped',
} as const;

export type StepStatusValue = (typeof StepStatus)[keyof typeof StepStatus];

export const WorkflowStatus = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  PAUSED: 'paused',
  ARCHIVED: 'archived',
} as const;

export type WorkflowStatusValue = (typeof WorkflowStatus)[keyof typeof WorkflowStatus];
