import { IStepHandler } from '../domain/interfaces/step-handler.interface';
import { UnknownStepTypeError } from '../domain/errors';

export class StepFactory {
  private static handlers = new Map<string, new () => IStepHandler>();

  static register(type: string, handler: new () => IStepHandler): void {
    this.handlers.set(type, handler);
  }

  static create(type: string): IStepHandler {
    const Handler = this.handlers.get(type);
    if (!Handler) {
      throw new UnknownStepTypeError(type);
    }
    return new Handler();
  }

  static getRegisteredTypes(): string[] {
    return Array.from(this.handlers.keys());
  }

  static has(type: string): boolean {
    return this.handlers.has(type);
  }
}
