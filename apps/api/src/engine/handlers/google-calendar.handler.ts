import {
  IStepHandler,
  StepContext,
  StepResult,
  ValidationResult,
} from '../../domain/interfaces/step-handler.interface';

type GoogleCalendarOperation = 'create_event' | 'list_events';

export class GoogleCalendarHandler implements IStepHandler {
  async execute(context: StepContext): Promise<StepResult> {
    const config = context.config as {
      accessToken: string;
      operation?: GoogleCalendarOperation;
      calendarId?: string;
      summary?: string;
      description?: string;
      location?: string;
      start?: string;
      end?: string;
      timeZone?: string;
      maxResults?: number;
      timeMin?: string;
      timeMax?: string;
    };

    const operation = config.operation ?? 'create_event';

    try {
      switch (operation) {
        case 'create_event':
          return await this.createEvent(context, config);
        case 'list_events':
          return await this.listEvents(context, config);
        default:
          return {
            success: false,
            output: {},
            error: `Unsupported Google Calendar operation: ${operation}`,
          };
      }
    } catch (error) {
      return {
        success: false,
        output: {},
        error: error instanceof Error ? error.message : 'Google Calendar step failed',
      };
    }
  }

  validate(config: unknown): ValidationResult {
    const errors: string[] = [];
    const cfg = (config || {}) as Record<string, unknown>;

    if (!cfg.accessToken || typeof cfg.accessToken !== 'string') {
      errors.push('Google Calendar accessToken is required');
    }

    const operation = (cfg.operation as GoogleCalendarOperation | undefined) ?? 'create_event';
    if (!['create_event', 'list_events'].includes(operation)) {
      errors.push('Google Calendar operation must be create_event or list_events');
    }

    if (operation === 'create_event') {
      if (!cfg.summary || typeof cfg.summary !== 'string') {
        errors.push('Google Calendar summary is required for create_event');
      }
      if (!cfg.start || typeof cfg.start !== 'string') {
        errors.push('Google Calendar start is required for create_event');
      }
      if (!cfg.end || typeof cfg.end !== 'string') {
        errors.push('Google Calendar end is required for create_event');
      }
    }

    return { valid: errors.length === 0, errors };
  }

  private async createEvent(
    context: StepContext,
    config: {
      accessToken: string;
      calendarId?: string;
      summary?: string;
      description?: string;
      location?: string;
      start?: string;
      end?: string;
      timeZone?: string;
    },
  ): Promise<StepResult> {
    const calendarId = this.interpolate(config.calendarId || 'primary', context.variables);
    const timeZone = this.interpolate(config.timeZone || 'UTC', context.variables);

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: this.interpolate(config.summary || '', context.variables),
          description: this.interpolate(config.description || '', context.variables),
          location: this.interpolate(config.location || '', context.variables),
          start: {
            dateTime: this.interpolate(config.start || '', context.variables),
            timeZone,
          },
          end: {
            dateTime: this.interpolate(config.end || '', context.variables),
            timeZone,
          },
        }),
      },
    );

    const payload = await this.parsePayload(response);

    if (!response.ok) {
      return {
        success: false,
        output: { statusCode: response.status },
        error: `Google Calendar create_event failed: ${this.stringifyPayload(payload)}`,
      };
    }

    return {
      success: true,
      output: {
        operation: 'create_event',
        event: payload,
      },
    };
  }

  private async listEvents(
    context: StepContext,
    config: {
      accessToken: string;
      calendarId?: string;
      maxResults?: number;
      timeMin?: string;
      timeMax?: string;
    },
  ): Promise<StepResult> {
    const calendarId = this.interpolate(config.calendarId || 'primary', context.variables);
    const maxResults =
      typeof config.maxResults === 'number'
        ? Math.min(Math.max(Math.floor(config.maxResults), 1), 50)
        : 10;

    const params = new URLSearchParams({
      maxResults: String(maxResults),
      singleEvents: 'true',
      orderBy: 'startTime',
    });

    const resolvedTimeMin = this.interpolate(config.timeMin || '', context.variables).trim();
    const resolvedTimeMax = this.interpolate(config.timeMax || '', context.variables).trim();

    if (resolvedTimeMin) {
      params.set('timeMin', resolvedTimeMin);
    }
    if (resolvedTimeMax) {
      params.set('timeMax', resolvedTimeMax);
    }

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
        calendarId,
      )}/events?${params.toString()}`,
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
        error: `Google Calendar list_events failed: ${this.stringifyPayload(payload)}`,
      };
    }

    return {
      success: true,
      output: {
        operation: 'list_events',
        events: (payload as { items?: unknown[] }).items || [],
        nextPageToken: (payload as { nextPageToken?: string }).nextPageToken,
      },
    };
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
