import {
  IStepHandler,
  StepContext,
  StepResult,
  ValidationResult,
} from '../../domain/interfaces/step-handler.interface';

type Operator = 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'exists' | 'not_exists';

export class ConditionHandler implements IStepHandler {
  async execute(context: StepContext): Promise<StepResult> {
    const { field, operator, value } = context.config as {
      field: string;
      operator: Operator;
      value?: unknown;
    };

    try {
      const fieldValue = this.resolveField(field, context.input);
      const result = this.evaluate(fieldValue, operator, value);

      return {
        success: true,
        output: {
          condition: result,
          branch: result ? 'true' : 'false',
          evaluatedField: field,
          evaluatedValue: fieldValue,
        },
      };
    } catch (error) {
      return {
        success: false,
        output: { condition: false, branch: 'false' },
        error: error instanceof Error ? error.message : 'Condition evaluation failed',
      };
    }
  }

  private resolveField(path: string, data: Record<string, unknown>): unknown {
    return path.split('.').reduce<unknown>((obj, key) => {
      if (obj && typeof obj === 'object') {
        return (obj as Record<string, unknown>)[key];
      }
      return undefined;
    }, data);
  }

  private evaluate(fieldValue: unknown, operator: Operator, compareValue?: unknown): boolean {
    switch (operator) {
      case 'equals':
        return fieldValue === compareValue;
      case 'not_equals':
        return fieldValue !== compareValue;
      case 'contains':
        return typeof fieldValue === 'string' && fieldValue.includes(String(compareValue));
      case 'greater_than':
        return Number(fieldValue) > Number(compareValue);
      case 'less_than':
        return Number(fieldValue) < Number(compareValue);
      case 'exists':
        return fieldValue !== undefined && fieldValue !== null;
      case 'not_exists':
        return fieldValue === undefined || fieldValue === null;
      default:
        throw new Error(`Unknown operator: ${operator}`);
    }
  }

  validate(config: unknown): ValidationResult {
    const errors: string[] = [];
    const cfg = config as Record<string, unknown>;

    if (!cfg.field || typeof cfg.field !== 'string') {
      errors.push('Field path is required');
    }
    if (!cfg.operator) {
      errors.push('Operator is required');
    }

    return { valid: errors.length === 0, errors };
  }
}
