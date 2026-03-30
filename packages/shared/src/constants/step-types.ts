export const StepType = {
  HTTP_REQUEST: 'http_request',
  CONDITION: 'condition',
  TRANSFORM: 'transform',
  DELAY: 'delay',
  SEND_EMAIL: 'send_email',
  SLACK_MESSAGE: 'slack_message',
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
};

export const TRIGGER_TYPE_LABELS: Record<TriggerTypeValue, string> = {
  [TriggerType.WEBHOOK]: 'Webhook',
  [TriggerType.CRON]: 'Schedule (Cron)',
  [TriggerType.MANUAL]: 'Manual Trigger',
};
