export declare const StepType: {
    readonly HTTP_REQUEST: "http_request";
    readonly CONDITION: "condition";
    readonly TRANSFORM: "transform";
    readonly DELAY: "delay";
    readonly SEND_EMAIL: "send_email";
    readonly SLACK_MESSAGE: "slack_message";
};
export type StepTypeValue = (typeof StepType)[keyof typeof StepType];
export declare const TriggerType: {
    readonly WEBHOOK: "webhook";
    readonly CRON: "cron";
    readonly MANUAL: "manual";
};
export type TriggerTypeValue = (typeof TriggerType)[keyof typeof TriggerType];
export declare const STEP_TYPE_LABELS: Record<StepTypeValue, string>;
export declare const TRIGGER_TYPE_LABELS: Record<TriggerTypeValue, string>;
