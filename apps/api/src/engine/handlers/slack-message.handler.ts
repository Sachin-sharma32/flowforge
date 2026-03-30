import {
  IStepHandler,
  StepContext,
  StepResult,
  ValidationResult,
} from '../../domain/interfaces/step-handler.interface';
import { logger } from '../../infrastructure/logger';

export class SlackMessageHandler implements IStepHandler {
  async execute(context: StepContext): Promise<StepResult> {
    const { webhookUrl, message, channel } = context.config as {
      webhookUrl: string;
      message: string;
      channel?: string;
    };

    try {
      // Interpolate variables
      let resolvedMessage = message;
      for (const [key, value] of Object.entries(context.variables)) {
        resolvedMessage = resolvedMessage.replace(new RegExp(`{{${key}}}`, 'g'), value);
      }

      const payload: Record<string, unknown> = { text: resolvedMessage };
      if (channel) payload.channel = channel;

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const text = await response.text();
        return {
          success: false,
          output: { statusCode: response.status },
          error: `Slack webhook failed: ${text}`,
        };
      }

      logger.info({
        action: 'slack_message',
        channel,
        executionId: context.executionId,
      }, 'Slack message sent');

      return {
        success: true,
        output: {
          channel,
          sentAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        output: {},
        error: error instanceof Error ? error.message : 'Failed to send Slack message',
      };
    }
  }

  validate(config: unknown): ValidationResult {
    const errors: string[] = [];
    const cfg = config as Record<string, unknown>;

    if (!cfg.webhookUrl || typeof cfg.webhookUrl !== 'string') {
      errors.push('Webhook URL is required');
    }
    if (!cfg.message || typeof cfg.message !== 'string') {
      errors.push('Message is required');
    }

    return { valid: errors.length === 0, errors };
  }
}
