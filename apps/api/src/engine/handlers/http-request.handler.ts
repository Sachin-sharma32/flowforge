import {
  IStepHandler,
  StepContext,
  StepResult,
  ValidationResult,
} from '../../domain/interfaces/step-handler.interface';

export class HttpRequestHandler implements IStepHandler {
  async execute(context: StepContext): Promise<StepResult> {
    const {
      url,
      method = 'GET',
      headers = {},
      body,
      timeout = 30000,
    } = context.config as {
      url: string;
      method?: string;
      headers?: Record<string, string>;
      body?: unknown;
      timeout?: number;
    };

    try {
      // Interpolate variables in URL
      let resolvedUrl = url;
      for (const [key, value] of Object.entries(context.variables)) {
        resolvedUrl = resolvedUrl.replace(`{{${key}}}`, value);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(resolvedUrl, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        ...(body && method !== 'GET' ? { body: JSON.stringify(body) } : {}),
        signal: controller.signal,
      });

      // Keep timeout active through response body parsing
      let responseBody: unknown;
      try {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          responseBody = await response.json();
        } else {
          responseBody = await response.text();
        }
      } finally {
        clearTimeout(timeoutId);
      }

      return {
        success: response.ok,
        output: {
          statusCode: response.status,
          headers: Object.fromEntries(response.headers.entries()),
          body: responseBody,
        },
        ...(!response.ok && { error: `HTTP ${response.status}: ${response.statusText}` }),
      };
    } catch (error) {
      return {
        success: false,
        output: {},
        error: error instanceof Error ? error.message : 'HTTP request failed',
      };
    }
  }

  validate(config: unknown): ValidationResult {
    const errors: string[] = [];
    const cfg = config as Record<string, unknown>;

    if (!cfg.url || typeof cfg.url !== 'string') {
      errors.push('URL is required and must be a string');
    }
    if (cfg.method && !['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(cfg.method as string)) {
      errors.push('Method must be GET, POST, PUT, PATCH, or DELETE');
    }

    return { valid: errors.length === 0, errors };
  }
}
