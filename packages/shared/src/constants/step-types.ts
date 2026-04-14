export const StepType = {
  HTTP_REQUEST: 'http_request',
  CONDITION: 'condition',
  TRANSFORM: 'transform',
  DELAY: 'delay',
  SEND_EMAIL: 'send_email',
  SLACK_MESSAGE: 'slack_message',
  GOOGLE_DRIVE: 'google_drive',
  GOOGLE_CALENDAR: 'google_calendar',
  GMAIL: 'gmail',
  NOTION: 'notion',
} as const;

export type StepTypeValue = (typeof StepType)[keyof typeof StepType];

export const TriggerType = {
  WEBHOOK: 'webhook',
  CRON: 'cron',
  MANUAL: 'manual',
} as const;

export type TriggerTypeValue = (typeof TriggerType)[keyof typeof TriggerType];

export const STEP_TYPE_LABELS: Record<StepTypeValue, string> = {
  [StepType.HTTP_REQUEST]: 'HTTP Request',
  [StepType.CONDITION]: 'Condition',
  [StepType.TRANSFORM]: 'Transform Data',
  [StepType.DELAY]: 'Delay',
  [StepType.SEND_EMAIL]: 'Send Email',
  [StepType.SLACK_MESSAGE]: 'Slack Message',
  [StepType.GOOGLE_DRIVE]: 'Google Drive',
  [StepType.GOOGLE_CALENDAR]: 'Google Calendar',
  [StepType.GMAIL]: 'Gmail',
  [StepType.NOTION]: 'Notion',
};

export const TRIGGER_TYPE_LABELS: Record<TriggerTypeValue, string> = {
  [TriggerType.WEBHOOK]: 'Webhook',
  [TriggerType.CRON]: 'Schedule (Cron)',
  [TriggerType.MANUAL]: 'Manual Trigger',
};
