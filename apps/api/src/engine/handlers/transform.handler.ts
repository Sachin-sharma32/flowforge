import {
  IStepHandler,
  StepContext,
  StepResult,
  ValidationResult,
} from '../../domain/interfaces/step-handler.interface';

interface TransformMapping {
  source: string;
  target: string;
  transform?: 'uppercase' | 'lowercase' | 'trim' | 'number' | 'boolean' | 'json_parse' | 'stringify';
}

export class TransformHandler implements IStepHandler {
  async execute(context: StepContext): Promise<StepResult> {
    const { mappings = [], template } = context.config as {
      mappings?: TransformMapping[];
      template?: Record<string, unknown>;
    };

    try {
      const output: Record<string, unknown> = {};

      // Apply field mappings
      for (const mapping of mappings) {
        const value = this.resolveField(mapping.source, context.input);
        const transformed = mapping.transform ? this.applyTransform(value, mapping.transform) : value;
        this.setField(output, mapping.target, transformed);
      }

      // Apply template if provided (merges on top of mappings)
      if (template) {
        const resolved = this.resolveTemplate(template, context.input);
        Object.assign(output, resolved);
      }

      return { success: true, output };
    } catch (error) {
      return {
        success: false,
        output: {},
        error: error instanceof Error ? error.message : 'Transform failed',
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

  private setField(obj: Record<string, unknown>, path: string, value: unknown): void {
    const keys = path.split('.');
    const last = keys.pop()!;
    let current = obj;
    for (const key of keys) {
      if (!(key in current)) current[key] = {};
      current = current[key] as Record<string, unknown>;
    }
    current[last] = value;
  }

  private applyTransform(value: unknown, transform: string): unknown {
    const str = String(value ?? '');
    switch (transform) {
      case 'uppercase': return str.toUpperCase();
      case 'lowercase': return str.toLowerCase();
      case 'trim': return str.trim();
      case 'number': return Number(value);
      case 'boolean': return Boolean(value);
      case 'json_parse': return JSON.parse(str);
      case 'stringify': return JSON.stringify(value);
      default: return value;
    }
  }

  private resolveTemplate(
    template: Record<string, unknown>,
    input: Record<string, unknown>,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(template)) {
      if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
        const path = value.slice(2, -2).trim();
        result[key] = this.resolveField(path, input);
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.resolveTemplate(value as Record<string, unknown>, input);
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  validate(config: unknown): ValidationResult {
    const errors: string[] = [];
    const cfg = config as Record<string, unknown>;

    if (!cfg.mappings && !cfg.template) {
      errors.push('Either mappings or template is required');
    }

    return { valid: errors.length === 0, errors };
  }
}
