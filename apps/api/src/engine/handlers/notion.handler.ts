import {
  IStepHandler,
  StepContext,
  StepResult,
  ValidationResult,
} from '../../domain/interfaces/step-handler.interface';

type NotionOperation = 'create_page' | 'append_block' | 'query_database';

export class NotionHandler implements IStepHandler {
  async execute(context: StepContext): Promise<StepResult> {
    const config = context.config as {
      accessToken: string;
      operation?: NotionOperation;
      parentType?: 'page_id' | 'database_id';
      parentId?: string;
      title?: string;
      content?: string;
      blockId?: string;
      databaseId?: string;
      query?: Record<string, unknown>;
    };

    const operation = config.operation ?? 'create_page';

    try {
      switch (operation) {
        case 'create_page':
          return await this.createPage(context, config);
        case 'append_block':
          return await this.appendBlock(context, config);
        case 'query_database':
          return await this.queryDatabase(context, config);
        default:
          return {
            success: false,
            output: {},
            error: `Unsupported Notion operation: ${operation}`,
          };
      }
    } catch (error) {
      return {
        success: false,
        output: {},
        error: error instanceof Error ? error.message : 'Notion step failed',
      };
    }
  }

  validate(config: unknown): ValidationResult {
    const errors: string[] = [];
    const cfg = (config || {}) as Record<string, unknown>;

    if (!cfg.accessToken || typeof cfg.accessToken !== 'string') {
      errors.push('Notion accessToken is required');
    }

    const operation = (cfg.operation as NotionOperation | undefined) ?? 'create_page';
    if (!['create_page', 'append_block', 'query_database'].includes(operation)) {
      errors.push('Notion operation must be create_page, append_block, or query_database');
    }

    if (operation === 'create_page') {
      if (!cfg.parentId || typeof cfg.parentId !== 'string') {
        errors.push('Notion parentId is required for create_page');
      }
      if (!cfg.title || typeof cfg.title !== 'string') {
        errors.push('Notion title is required for create_page');
      }
    }

    if (operation === 'append_block' && (!cfg.blockId || typeof cfg.blockId !== 'string')) {
      errors.push('Notion blockId is required for append_block');
    }

    if (operation === 'query_database' && (!cfg.databaseId || typeof cfg.databaseId !== 'string')) {
      errors.push('Notion databaseId is required for query_database');
    }

    return { valid: errors.length === 0, errors };
  }

  private async createPage(
    context: StepContext,
    config: {
      accessToken: string;
      parentType?: 'page_id' | 'database_id';
      parentId?: string;
      title?: string;
      content?: string;
    },
  ): Promise<StepResult> {
    const parentType = config.parentType === 'database_id' ? 'database_id' : 'page_id';
    const parentId = this.interpolate(config.parentId || '', context.variables);
    const title = this.interpolate(config.title || '', context.variables);
    const content = this.interpolate(config.content || '', context.variables);

    const response = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: this.buildHeaders(config.accessToken),
      body: JSON.stringify({
        parent: { [parentType]: parentId },
        properties: {
          title: {
            title: [
              {
                text: {
                  content: title,
                },
              },
            ],
          },
        },
        ...(content
          ? {
              children: [
                {
                  object: 'block',
                  type: 'paragraph',
                  paragraph: {
                    rich_text: [
                      {
                        type: 'text',
                        text: { content },
                      },
                    ],
                  },
                },
              ],
            }
          : {}),
      }),
    });

    const payload = await this.parsePayload(response);

    if (!response.ok) {
      return {
        success: false,
        output: { statusCode: response.status },
        error: `Notion create_page failed: ${this.stringifyPayload(payload)}`,
      };
    }

    return {
      success: true,
      output: {
        operation: 'create_page',
        page: payload,
      },
    };
  }

  private async appendBlock(
    context: StepContext,
    config: {
      accessToken: string;
      blockId?: string;
      content?: string;
    },
  ): Promise<StepResult> {
    const blockId = this.interpolate(config.blockId || '', context.variables);
    const content = this.interpolate(config.content || '', context.variables);

    const response = await fetch(`https://api.notion.com/v1/blocks/${blockId}/children`, {
      method: 'PATCH',
      headers: this.buildHeaders(config.accessToken),
      body: JSON.stringify({
        children: [
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [
                {
                  type: 'text',
                  text: { content },
                },
              ],
            },
          },
        ],
      }),
    });

    const payload = await this.parsePayload(response);

    if (!response.ok) {
      return {
        success: false,
        output: { statusCode: response.status },
        error: `Notion append_block failed: ${this.stringifyPayload(payload)}`,
      };
    }

    return {
      success: true,
      output: {
        operation: 'append_block',
        blockChildren: payload,
      },
    };
  }

  private async queryDatabase(
    context: StepContext,
    config: {
      accessToken: string;
      databaseId?: string;
      query?: Record<string, unknown>;
    },
  ): Promise<StepResult> {
    const databaseId = this.interpolate(config.databaseId || '', context.variables);

    const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: 'POST',
      headers: this.buildHeaders(config.accessToken),
      body: JSON.stringify(config.query || {}),
    });

    const payload = await this.parsePayload(response);

    if (!response.ok) {
      return {
        success: false,
        output: { statusCode: response.status },
        error: `Notion query_database failed: ${this.stringifyPayload(payload)}`,
      };
    }

    return {
      success: true,
      output: {
        operation: 'query_database',
        results: (payload as { results?: unknown[] }).results || [],
        nextCursor: (payload as { next_cursor?: string | null }).next_cursor || null,
      },
    };
  }

  private buildHeaders(accessToken: string): Record<string, string> {
    return {
      Authorization: `Bearer ${accessToken}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
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
