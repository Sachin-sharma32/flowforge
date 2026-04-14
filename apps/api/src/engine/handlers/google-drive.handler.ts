import {
  IStepHandler,
  StepContext,
  StepResult,
  ValidationResult,
} from '../../domain/interfaces/step-handler.interface';

type GoogleDriveOperation = 'list_files' | 'create_folder' | 'upload_text_file';

export class GoogleDriveHandler implements IStepHandler {
  async execute(context: StepContext): Promise<StepResult> {
    const config = context.config as {
      accessToken: string;
      operation?: GoogleDriveOperation;
      folderId?: string;
      query?: string;
      pageSize?: number;
      name?: string;
      content?: string;
      mimeType?: string;
    };

    const operation = config.operation ?? 'list_files';

    try {
      switch (operation) {
        case 'list_files':
          return await this.listFiles(context, config);
        case 'create_folder':
          return await this.createFolder(context, config);
        case 'upload_text_file':
          return await this.uploadTextFile(context, config);
        default:
          return {
            success: false,
            output: {},
            error: `Unsupported Google Drive operation: ${operation}`,
          };
      }
    } catch (error) {
      return {
        success: false,
        output: {},
        error: error instanceof Error ? error.message : 'Google Drive step failed',
      };
    }
  }

  validate(config: unknown): ValidationResult {
    const errors: string[] = [];
    const cfg = (config || {}) as Record<string, unknown>;

    if (!cfg.accessToken || typeof cfg.accessToken !== 'string') {
      errors.push('Google Drive accessToken is required');
    }

    const operation = (cfg.operation as GoogleDriveOperation | undefined) ?? 'list_files';
    if (!['list_files', 'create_folder', 'upload_text_file'].includes(operation)) {
      errors.push('Google Drive operation must be list_files, create_folder, or upload_text_file');
    }

    if (operation === 'create_folder' && (!cfg.name || typeof cfg.name !== 'string')) {
      errors.push('Google Drive folder name is required for create_folder');
    }

    if (operation === 'upload_text_file' && (!cfg.name || typeof cfg.name !== 'string')) {
      errors.push('Google Drive file name is required for upload_text_file');
    }

    return { valid: errors.length === 0, errors };
  }

  private async listFiles(
    context: StepContext,
    config: {
      accessToken: string;
      folderId?: string;
      query?: string;
      pageSize?: number;
    },
  ): Promise<StepResult> {
    const query = this.interpolate(config.query || '', context.variables).trim();
    const folderId = this.interpolate(config.folderId || '', context.variables).trim();
    const pageSize =
      typeof config.pageSize === 'number'
        ? Math.min(Math.max(Math.floor(config.pageSize), 1), 100)
        : 25;

    const filters: string[] = [];
    if (folderId) {
      filters.push(`'${folderId}' in parents`);
    }
    if (query) {
      filters.push(`(${query})`);
    }

    const params = new URLSearchParams({
      pageSize: String(pageSize),
      fields: 'files(id,name,mimeType,webViewLink,modifiedTime,createdTime),nextPageToken',
    });

    if (filters.length > 0) {
      params.set('q', filters.join(' and '));
    }

    const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
      },
    });

    const payload = await this.parsePayload(response);

    if (!response.ok) {
      return {
        success: false,
        output: { statusCode: response.status },
        error: `Google Drive list_files failed: ${this.stringifyPayload(payload)}`,
      };
    }

    return {
      success: true,
      output: {
        operation: 'list_files',
        files: (payload as { files?: unknown[] }).files || [],
        nextPageToken: (payload as { nextPageToken?: string }).nextPageToken,
      },
    };
  }

  private async createFolder(
    context: StepContext,
    config: {
      accessToken: string;
      folderId?: string;
      name?: string;
    },
  ): Promise<StepResult> {
    const folderName = this.interpolate(config.name || '', context.variables).trim();
    const parentId = this.interpolate(config.folderId || '', context.variables).trim();

    const response = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        ...(parentId ? { parents: [parentId] } : {}),
      }),
    });

    const payload = await this.parsePayload(response);

    if (!response.ok) {
      return {
        success: false,
        output: { statusCode: response.status },
        error: `Google Drive create_folder failed: ${this.stringifyPayload(payload)}`,
      };
    }

    return {
      success: true,
      output: {
        operation: 'create_folder',
        folder: payload,
      },
    };
  }

  private async uploadTextFile(
    context: StepContext,
    config: {
      accessToken: string;
      folderId?: string;
      name?: string;
      content?: string;
      mimeType?: string;
    },
  ): Promise<StepResult> {
    const fileName = this.interpolate(config.name || '', context.variables).trim();
    const parentId = this.interpolate(config.folderId || '', context.variables).trim();
    const fileContent = this.interpolate(config.content || '', context.variables);
    const mimeType = (config.mimeType || 'text/plain').trim();

    const boundary = `flowforge-boundary-${Date.now()}`;
    const metadata = JSON.stringify({
      name: fileName,
      ...(parentId ? { parents: [parentId] } : {}),
    });

    const body =
      `--${boundary}\r\n` +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      `${metadata}\r\n` +
      `--${boundary}\r\n` +
      `Content-Type: ${mimeType}\r\n\r\n` +
      `${fileContent}\r\n` +
      `--${boundary}--`;

    const response = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body,
      },
    );

    const payload = await this.parsePayload(response);

    if (!response.ok) {
      return {
        success: false,
        output: { statusCode: response.status },
        error: `Google Drive upload_text_file failed: ${this.stringifyPayload(payload)}`,
      };
    }

    return {
      success: true,
      output: {
        operation: 'upload_text_file',
        file: payload,
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
