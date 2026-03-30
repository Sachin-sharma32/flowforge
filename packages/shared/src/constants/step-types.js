"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TRIGGER_TYPE_LABELS = exports.STEP_TYPE_LABELS = exports.TriggerType = exports.StepType = void 0;
exports.StepType = {
    HTTP_REQUEST: 'http_request',
    CONDITION: 'condition',
    TRANSFORM: 'transform',
    DELAY: 'delay',
    SEND_EMAIL: 'send_email',
    SLACK_MESSAGE: 'slack_message',
};
exports.TriggerType = {
    WEBHOOK: 'webhook',
    CRON: 'cron',
    MANUAL: 'manual',
};
exports.STEP_TYPE_LABELS = {
    [exports.StepType.HTTP_REQUEST]: 'HTTP Request',
    [exports.StepType.CONDITION]: 'Condition',
    [exports.StepType.TRANSFORM]: 'Transform Data',
    [exports.StepType.DELAY]: 'Delay',
    [exports.StepType.SEND_EMAIL]: 'Send Email',
    [exports.StepType.SLACK_MESSAGE]: 'Slack Message',
};
exports.TRIGGER_TYPE_LABELS = {
    [exports.TriggerType.WEBHOOK]: 'Webhook',
    [exports.TriggerType.CRON]: 'Schedule (Cron)',
    [exports.TriggerType.MANUAL]: 'Manual Trigger',
};
//# sourceMappingURL=step-types.js.map