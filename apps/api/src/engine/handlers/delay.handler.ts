import {
  IStepHandler,
  StepContext,
  StepResult,
  ValidationResult,
} from '../../domain/interfaces/step-handler.interface';

export class DelayHandler implements IStepHandler {
  async execute(context: StepContext): Promise<StepResult> {
    const { durationMs = 1000 } = context.config as { durationMs?: number };

    const capped = Math.min(durationMs, 300000); // Max 5 minutes
    await new Promise((resolve) => setTimeout(resolve, capped));

    return {
      success: true,
      output: {
        delayedMs: capped,
        resumedAt: new Date().toISOString(),
      },
    };
  }

  validate(config: unknown): ValidationResult {
    const errors: string[] = [];
    const cfg = config as Record<string, unknown>;

    if (cfg.durationMs !== undefined && (typeof cfg.durationMs !== 'number' || cfg.durationMs < 0)) {
      errors.push('durationMs must be a positive number');
    }

    return { valid: errors.length === 0, errors };
  }
}
