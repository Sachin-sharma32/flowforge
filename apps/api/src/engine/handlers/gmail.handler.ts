import {
  IStepHandler,
  StepContext,
  StepResult,
  ValidationResult,
} from '../../domain/interfaces/step-handler.interface';

type GmailOperation = 'send_email' | 'create_draft' | 'list_messages';

export class GmailHandler implements IStepHandler {
  async execute(context: StepContext): Promise<StepResult> {
    const config = context.config as {
      accessToken: string;
      operation?: GmailOperation;
      to?: string;
      subject?: string;
      body?: string;
      query?: string;
      maxResults?: number;
    };

    const operation = config.operation ?? 'send_email';

    try {
      switch (operation) {
        case 'send_email':
          return await this.sendMessage(context, config);
        case 'create_draft':
          return await this.createDraft(context, config);
        case 'list_messages':
          return await this.listMessages(context, config);
        default:
          return {
            success: false,
            output: {},
            error: `Unsupported Gmail operation: ${operation}`,
          };
      }
    } catch (error) {
      return {
        success: false,
        output: {},
        error: error instanceof Error ? error.message : 'Gmail step failed',
      };
    }
  }

  validate(config: unknown): ValidationResult {
    const errors: string[] = [];
    const cfg = (config || {}) as Record<string, unknown>;

    if (!cfg.accessToken || typeof cfg.accessToken !== 'string') {
      errors.push('Gmail accessToken is required');
    }

    const operation = (cfg.operation as GmailOperation | undefined) ?? 'send_email';
    if (!['send_email', 'create_draft', 'list_messages'].includes(operation)) {
      errors.push('Gmail operation must be send_email, create_draft, or list_messages');
    }

    if (operation === 'send_email' || operation === 'create_draft') {
      if (!cfg.to || typeof cfg.to !== 'string') {
        errors.push('Gmail recipient (to) is required for send_email/create_draft');
      }
      if (!cfg.subject || typeof cfg.subject !== 'string') {
        errors.push('Gmail subject is required for send_email/create_draft');
      }
      if (!cfg.body || typeof cfg.body !== 'string') {
        errors.push('Gmail body is required for send_email/create_draft');
      }
    }

    return { valid: errors.length === 0, errors };
  }

  private async sendMessage(
    context: StepContext,
    config: {
      accessToken: string;
      to?: string;
      subject?: string;
      body?: string;
    },
  ): Promise<StepResult> {
    const raw = this.buildRawMessage(context, config);

    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw }),
    });

    const payload = await this.parsePayload(response);

    if (!response.ok) {
      return {
        success: false,
        output: { statusCode: response.status },
        error: `Gmail send_email failed: ${this.stringifyPayload(payload)}`,
      };
    }

    return {
      success: true,
      output: {
        operation: 'send_email',
        message: payload,
      },
    };
  }

  private async createDraft(
    context: StepContext,
    config: {
      accessToken: string;
      to?: string;
      subject?: string;
      body?: string;
    },
  ): Promise<StepResult> {
    const raw = this.buildRawMessage(context, config);

    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message: { raw } }),
    });

    const payload = await this.parsePayload(response);

    if (!response.ok) {
      return {
        success: false,
        output: { statusCode: response.status },
        error: `Gmail create_draft failed: ${this.stringifyPayload(payload)}`,
      };
    }

    return {
      success: true,
      output: {
        operation: 'create_draft',
        draft: payload,
      },
    };
  }

  private async listMessages(
    context: StepContext,
    config: {
      accessToken: string;
      query?: string;
      maxResults?: number;
    },
  ): Promise<StepResult> {
    const maxResults =
      typeof config.maxResults === 'number'
        ? Math.min(Math.max(Math.floor(config.maxResults), 1), 50)
        : 10;

    const params = new URLSearchParams({ maxResults: String(maxResults) });
    const query = this.interpolate(config.query || '', context.variables).trim();
    if (query) {
      params.set('q', query);
    }

    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
        },
      },
    );

    const payload = await this.parsePayload(response);

    if (!response.ok) {
      return {
        success: false,
        output: { statusCode: response.status },
        error: `Gmail list_messages failed: ${this.stringifyPayload(payload)}`,
      };
    }

    return {
      success: true,
      output: {
        operation: 'list_messages',
        messages: (payload as { messages?: unknown[] }).messages || [],
        nextPageToken: (payload as { nextPageToken?: string }).nextPageToken,
      },
    };
  }

  private buildRawMessage(
    context: StepContext,
    config: {
      to?: string;
      subject?: string;
      body?: string;
    },
  ): string {
    const to = this.interpolate(config.to || '', context.variables);
    const subject = this.interpolate(config.subject || '', context.variables);
    const body = this.interpolate(config.body || '', context.variables);

    const message = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/plain; charset="UTF-8"',
      '',
      body,
    ].join('\r\n');

    return Buffer.from(message).toString('base64url');
  }

  private interpolate(value: string, variables: Record<string, string>): string {
    let resolved = value;
    for (const [key, val] of Object.entries(variables)) {
      resolved = resolved.replace(new RegExp(`{{\\s*${key}\\s*}}`, 'g'), val);
    }
    return resolved;
  }

  private async parsePayload(response: Response): Promise<unknown> {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return response.json();
    }
    return response.text();
  }

  private stringifyPayload(payload: unknown): string {
    if (typeof payload === 'string') {
      return payload;
    }
    return JSON.stringify(payload);
  }
}
