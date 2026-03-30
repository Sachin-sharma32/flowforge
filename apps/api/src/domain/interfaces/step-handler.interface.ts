export interface StepContext {
  stepId: string;
  executionId: string;
  workflowId: string;
  workspaceId: string;
  config: Record<string, unknown>;
  input: Record<string, unknown>;
  variables: Record<string, string>;
}

export interface StepResult {
  success: boolean;
  output: Record<string, unknown>;
  error?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface IStepHandler {
  execute(context: StepContext): Promise<StepResult>;
  validate(config: unknown): ValidationResult;
}
