export interface DomainEvent {
  type: string;
  timestamp: Date;
  payload: Record<string, unknown>;
}

export const EventTypes = {
  EXECUTION_STARTED: 'execution.started',
  EXECUTION_COMPLETED: 'execution.completed',
  EXECUTION_FAILED: 'execution.failed',
  EXECUTION_CANCELLED: 'execution.cancelled',
  STEP_STARTED: 'step.started',
  STEP_COMPLETED: 'step.completed',
  STEP_FAILED: 'step.failed',
  WORKFLOW_CREATED: 'workflow.created',
  WORKFLOW_UPDATED: 'workflow.updated',
  WORKFLOW_DELETED: 'workflow.deleted',
  WORKFLOW_ACTIVATED: 'workflow.activated',
  WORKFLOW_PAUSED: 'workflow.paused',
} as const;

export type EventType = (typeof EventTypes)[keyof typeof EventTypes];
