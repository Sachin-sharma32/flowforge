import {
  IStepHandler,
  StepContext,
  StepResult,
  ValidationResult,
} from '../../domain/interfaces/step-handler.interface';
import { logger } from '../../infrastructure/logger';

export class SendEmailHandler implements IStepHandler {
  async execute(context: StepContext): Promise<StepResult> {
    const { to, subject, body, from = 'noreply@flowforge.dev' } = context.config as {
      to: string;
      subject: string;
      body: string;
      from?: string;
    };

    try {
      // Interpolate variables
      let resolvedBody = body;
      let resolvedSubject = subject;
      for (const [key, value] of Object.entries(context.variables)) {
        resolvedBody = resolvedBody.replace(new RegExp(`{{${key}}}`, 'g'), value);
        resolvedSubject = resolvedSubject.replace(new RegExp(`{{${key}}}`, 'g'), value);
      }

      // In production, integrate with SendGrid/SES
      // For demo purposes, log the email
      logger.info({
        action: 'send_email',
        to,
        subject: resolvedSubject,
        from,
        executionId: context.executionId,
      }, 'Email sent (simulated)');

      return {
        success: true,
        output: {
          to,
          subject: resolvedSubject,
          from,
          sentAt: new Date().toISOString(),
          messageId: `sim-${Date.now()}`,
        },
      };
    } catch (error) {
      return {
        success: false,
        output: {},
        error: error instanceof Error ? error.message : 'Failed to send email',
      };
    }
  }

  validate(config: unknown): ValidationResult {
    const errors: string[] = [];
    const cfg = config as Record<string, unknown>;

    if (!cfg.to || typeof cfg.to !== 'string') errors.push('Recipient (to) is required');
    if (!cfg.subject || typeof cfg.subject !== 'string') errors.push('Subject is required');
    if (!cfg.body || typeof cfg.body !== 'string') errors.push('Body is required');

    return { valid: errors.length === 0, errors };
  }
}
