import { z } from 'zod';
export declare const createWorkflowSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodDefault<z.ZodString>;
    trigger: z.ZodObject<{
        type: z.ZodEnum<["webhook", "cron", "manual"]>;
        config: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        type: "webhook" | "cron" | "manual";
        config: Record<string, unknown>;
    }, {
        type: "webhook" | "cron" | "manual";
        config?: Record<string, unknown> | undefined;
    }>;
    steps: z.ZodDefault<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodEnum<["http_request", "condition", "transform", "delay", "send_email", "slack_message"]>;
        name: z.ZodString;
        config: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        position: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            x: number;
            y: number;
        }, {
            x: number;
            y: number;
        }>;
        connections: z.ZodArray<z.ZodObject<{
            targetStepId: z.ZodString;
            label: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            targetStepId: string;
            label: string;
        }, {
            targetStepId: string;
            label: string;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        type: "transform" | "http_request" | "condition" | "delay" | "send_email" | "slack_message";
        name: string;
        id: string;
        config: Record<string, unknown>;
        position: {
            x: number;
            y: number;
        };
        connections: {
            targetStepId: string;
            label: string;
        }[];
    }, {
        type: "transform" | "http_request" | "condition" | "delay" | "send_email" | "slack_message";
        name: string;
        id: string;
        config: Record<string, unknown>;
        position: {
            x: number;
            y: number;
        };
        connections: {
            targetStepId: string;
            label: string;
        }[];
    }>, "many">>;
    variables: z.ZodDefault<z.ZodArray<z.ZodObject<{
        key: z.ZodString;
        value: z.ZodString;
        isSecret: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        value: string;
        key: string;
        isSecret: boolean;
    }, {
        value: string;
        key: string;
        isSecret?: boolean | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    name: string;
    description: string;
    trigger: {
        type: "webhook" | "cron" | "manual";
        config: Record<string, unknown>;
    };
    steps: {
        type: "transform" | "http_request" | "condition" | "delay" | "send_email" | "slack_message";
        name: string;
        id: string;
        config: Record<string, unknown>;
        position: {
            x: number;
            y: number;
        };
        connections: {
            targetStepId: string;
            label: string;
        }[];
    }[];
    variables: {
        value: string;
        key: string;
        isSecret: boolean;
    }[];
}, {
    name: string;
    trigger: {
        type: "webhook" | "cron" | "manual";
        config?: Record<string, unknown> | undefined;
    };
    description?: string | undefined;
    steps?: {
        type: "transform" | "http_request" | "condition" | "delay" | "send_email" | "slack_message";
        name: string;
        id: string;
        config: Record<string, unknown>;
        position: {
            x: number;
            y: number;
        };
        connections: {
            targetStepId: string;
            label: string;
        }[];
    }[] | undefined;
    variables?: {
        value: string;
        key: string;
        isSecret?: boolean | undefined;
    }[] | undefined;
}>;
export declare const updateWorkflowSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    trigger: z.ZodOptional<z.ZodObject<{
        type: z.ZodEnum<["webhook", "cron", "manual"]>;
        config: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        type: "webhook" | "cron" | "manual";
        config: Record<string, unknown>;
    }, {
        type: "webhook" | "cron" | "manual";
        config?: Record<string, unknown> | undefined;
    }>>;
    steps: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodEnum<["http_request", "condition", "transform", "delay", "send_email", "slack_message"]>;
        name: z.ZodString;
        config: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        position: z.ZodObject<{
            x: z.ZodNumber;
            y: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            x: number;
            y: number;
        }, {
            x: number;
            y: number;
        }>;
        connections: z.ZodArray<z.ZodObject<{
            targetStepId: z.ZodString;
            label: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            targetStepId: string;
            label: string;
        }, {
            targetStepId: string;
            label: string;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        type: "transform" | "http_request" | "condition" | "delay" | "send_email" | "slack_message";
        name: string;
        id: string;
        config: Record<string, unknown>;
        position: {
            x: number;
            y: number;
        };
        connections: {
            targetStepId: string;
            label: string;
        }[];
    }, {
        type: "transform" | "http_request" | "condition" | "delay" | "send_email" | "slack_message";
        name: string;
        id: string;
        config: Record<string, unknown>;
        position: {
            x: number;
            y: number;
        };
        connections: {
            targetStepId: string;
            label: string;
        }[];
    }>, "many">>;
    variables: z.ZodOptional<z.ZodArray<z.ZodObject<{
        key: z.ZodString;
        value: z.ZodString;
        isSecret: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        value: string;
        key: string;
        isSecret: boolean;
    }, {
        value: string;
        key: string;
        isSecret?: boolean | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    description?: string | undefined;
    trigger?: {
        type: "webhook" | "cron" | "manual";
        config: Record<string, unknown>;
    } | undefined;
    steps?: {
        type: "transform" | "http_request" | "condition" | "delay" | "send_email" | "slack_message";
        name: string;
        id: string;
        config: Record<string, unknown>;
        position: {
            x: number;
            y: number;
        };
        connections: {
            targetStepId: string;
            label: string;
        }[];
    }[] | undefined;
    variables?: {
        value: string;
        key: string;
        isSecret: boolean;
    }[] | undefined;
}, {
    name?: string | undefined;
    description?: string | undefined;
    trigger?: {
        type: "webhook" | "cron" | "manual";
        config?: Record<string, unknown> | undefined;
    } | undefined;
    steps?: {
        type: "transform" | "http_request" | "condition" | "delay" | "send_email" | "slack_message";
        name: string;
        id: string;
        config: Record<string, unknown>;
        position: {
            x: number;
            y: number;
        };
        connections: {
            targetStepId: string;
            label: string;
        }[];
    }[] | undefined;
    variables?: {
        value: string;
        key: string;
        isSecret?: boolean | undefined;
    }[] | undefined;
}>;
export type CreateWorkflowInput = z.infer<typeof createWorkflowSchema>;
export type UpdateWorkflowInput = z.infer<typeof updateWorkflowSchema>;
