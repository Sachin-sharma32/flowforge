import { StepTypeValue, TriggerTypeValue } from '../constants/step-types';
import { WorkflowStatusValue } from '../constants/execution-statuses';

export interface IStepConnection {
  targetStepId: string;
  label: string;
}

export interface IWorkflowStep {
  id: string;
  type: StepTypeValue;
  name: string;
  config: Record<string, unknown>;
  position: { x: number; y: number };
  connections: IStepConnection[];
}

export interface IWorkflowTrigger {
  type: TriggerTypeValue;
  config: Record<string, unknown>;
}

export interface IWorkflow {
  id: string;
  workspaceId?: string | null;
  folderId?: string | null;
  name: string;
  description: string;
  status: WorkflowStatusValue;
  isTemplate?: boolean;
  isGlobalTemplate?: boolean;
  category?: string;
  trigger: IWorkflowTrigger;
  steps: IWorkflowStep[];
  variables: Array<{ key: string; value: string; isSecret: boolean }>;
  version: number;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWorkflowListItem {
  id: string;
  folderId?: string | null;
  name: string;
  description: string;
  status: WorkflowStatusValue;
  isTemplate?: boolean;
  isGlobalTemplate?: boolean;
  category?: string;
  triggerType: TriggerTypeValue;
  stepCount: number;
  lastExecutedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
