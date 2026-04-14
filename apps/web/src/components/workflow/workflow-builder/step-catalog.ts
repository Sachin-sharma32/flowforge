import type { LucideIcon } from 'lucide-react';
import {
  Globe,
  Mail,
  MessageSquare,
  Timer,
  Shuffle,
  GitBranch,
  FolderOpen,
  CalendarDays,
  Inbox,
  BookOpen,
} from 'lucide-react';
import type { StepTypeValue } from '@flowforge/shared';

export type BuilderStepType = StepTypeValue;

export interface StepTemplate {
  type: BuilderStepType;
  label: string;
  description: string;
  icon: LucideIcon;
  category: 'core' | 'communication' | 'integrations';
  defaultName: string;
  defaultConfig: Record<string, unknown>;
}

export const STEP_TEMPLATES: StepTemplate[] = [
  {
    type: 'http_request',
    label: 'HTTP Request',
    description: 'Call an API endpoint and pass response downstream.',
    icon: Globe,
    category: 'core',
    defaultName: 'HTTP Request',
    defaultConfig: { url: '', method: 'GET' },
  },
  {
    type: 'condition',
    label: 'Condition',
    description: 'Route execution based on a field comparison.',
    icon: GitBranch,
    category: 'core',
    defaultName: 'Condition',
    defaultConfig: { field: '', operator: 'equals', value: '' },
  },
  {
    type: 'transform',
    label: 'Transform',
    description: 'Map payload fields or apply template output.',
    icon: Shuffle,
    category: 'core',
    defaultName: 'Transform',
    defaultConfig: { mappings: [] },
  },
  {
    type: 'delay',
    label: 'Delay',
    description: 'Pause the workflow for a fixed duration.',
    icon: Timer,
    category: 'core',
    defaultName: 'Delay',
    defaultConfig: { durationMs: 1000 },
  },
  {
    type: 'send_email',
    label: 'Send Email',
    description: 'Send a transactional email from the workflow.',
    icon: Mail,
    category: 'communication',
    defaultName: 'Send Email',
    defaultConfig: { to: '', subject: '', body: '' },
  },
  {
    type: 'slack_message',
    label: 'Slack Message',
    description: 'Send a message to Slack via webhook.',
    icon: MessageSquare,
    category: 'communication',
    defaultName: 'Slack Message',
    defaultConfig: { webhookUrl: '', message: '' },
  },
  {
    type: 'google_drive',
    label: 'Google Drive',
    description: 'List files, create folders, and upload text files.',
    icon: FolderOpen,
    category: 'integrations',
    defaultName: 'Google Drive',
    defaultConfig: { operation: 'list_files', accessToken: '', pageSize: 10 },
  },
  {
    type: 'google_calendar',
    label: 'Google Calendar',
    description: 'Create or query calendar events.',
    icon: CalendarDays,
    category: 'integrations',
    defaultName: 'Google Calendar',
    defaultConfig: {
      operation: 'create_event',
      accessToken: '',
      calendarId: 'primary',
      summary: '',
      start: '',
      end: '',
      timeZone: 'UTC',
    },
  },
  {
    type: 'gmail',
    label: 'Gmail',
    description: 'Send email, save drafts, or list messages.',
    icon: Inbox,
    category: 'integrations',
    defaultName: 'Gmail',
    defaultConfig: { operation: 'send_email', accessToken: '', to: '', subject: '', body: '' },
  },
  {
    type: 'notion',
    label: 'Notion',
    description: 'Create pages, append blocks, or query databases.',
    icon: BookOpen,
    category: 'integrations',
    defaultName: 'Notion',
    defaultConfig: {
      operation: 'create_page',
      accessToken: '',
      parentType: 'page_id',
      parentId: '',
      title: '',
      content: '',
    },
  },
];

export const STEP_TEMPLATE_BY_TYPE = STEP_TEMPLATES.reduce(
  (acc, template) => {
    acc[template.type] = template;
    return acc;
  },
  {} as Record<BuilderStepType, StepTemplate>,
);

function requiredString(
  config: Record<string, unknown>,
  key: string,
  label: string,
  errors: string[],
): void {
  if (typeof config[key] !== 'string' || !(config[key] as string).trim()) {
    errors.push(`${label} is required`);
  }
}

export function validateStepConfig(
  type: BuilderStepType,
  config: Record<string, unknown>,
): string[] {
  const errors: string[] = [];

  switch (type) {
    case 'http_request': {
      requiredString(config, 'url', 'URL', errors);
      const method = String(config.method || 'GET');
      if (!['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        errors.push('HTTP method must be GET, POST, PUT, PATCH, or DELETE');
      }
      break;
    }
    case 'condition': {
      requiredString(config, 'field', 'Condition field', errors);
      requiredString(config, 'operator', 'Condition operator', errors);
      break;
    }
    case 'transform': {
      const mappings = config.mappings;
      const template = config.template;
      const hasMappings = Array.isArray(mappings) && mappings.length > 0;
      const hasTemplate = !!template && typeof template === 'object';
      if (!hasMappings && !hasTemplate) {
        errors.push('Add at least one mapping or template JSON');
      }
      break;
    }
    case 'delay': {
      const delay = Number(config.durationMs);
      if (!Number.isFinite(delay) || delay < 1) {
        errors.push('Delay duration must be greater than 0 milliseconds');
      }
      break;
    }
    case 'send_email': {
      requiredString(config, 'to', 'Recipient', errors);
      requiredString(config, 'subject', 'Subject', errors);
      requiredString(config, 'body', 'Body', errors);
      break;
    }
    case 'slack_message': {
      requiredString(config, 'webhookUrl', 'Slack webhook URL', errors);
      requiredString(config, 'message', 'Slack message', errors);
      break;
    }
    case 'google_drive': {
      requiredString(config, 'accessToken', 'Google Drive access token', errors);
      const operation = String(config.operation || 'list_files');
      if (operation === 'create_folder' || operation === 'upload_text_file') {
        requiredString(config, 'name', 'Google Drive name', errors);
      }
      break;
    }
    case 'google_calendar': {
      requiredString(config, 'accessToken', 'Google Calendar access token', errors);
      const operation = String(config.operation || 'create_event');
      if (operation === 'create_event') {
        requiredString(config, 'summary', 'Event summary', errors);
        requiredString(config, 'start', 'Event start date/time', errors);
        requiredString(config, 'end', 'Event end date/time', errors);
      }
      break;
    }
    case 'gmail': {
      requiredString(config, 'accessToken', 'Gmail access token', errors);
      const operation = String(config.operation || 'send_email');
      if (operation === 'send_email' || operation === 'create_draft') {
        requiredString(config, 'to', 'Gmail recipient', errors);
        requiredString(config, 'subject', 'Gmail subject', errors);
        requiredString(config, 'body', 'Gmail body', errors);
      }
      break;
    }
    case 'notion': {
      requiredString(config, 'accessToken', 'Notion access token', errors);
      const operation = String(config.operation || 'create_page');
      if (operation === 'create_page') {
        requiredString(config, 'parentId', 'Notion parent ID', errors);
        requiredString(config, 'title', 'Notion title', errors);
      }
      if (operation === 'append_block') {
        requiredString(config, 'blockId', 'Notion block ID', errors);
      }
      if (operation === 'query_database') {
        requiredString(config, 'databaseId', 'Notion database ID', errors);
      }
      break;
    }
    default: {
      errors.push(`Unsupported step type: ${type}`);
    }
  }

  return errors;
}
