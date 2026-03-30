"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateWorkflowSchema = exports.createWorkflowSchema = void 0;
const zod_1 = require("zod");
const stepConnectionSchema = zod_1.z.object({
    targetStepId: zod_1.z.string(),
    label: zod_1.z.string(),
});
const workflowStepSchema = zod_1.z.object({
    id: zod_1.z.string(),
    type: zod_1.z.enum([
        'http_request',
        'condition',
        'transform',
        'delay',
        'send_email',
        'slack_message',
    ]),
    name: zod_1.z.string().min(1).max(100),
    config: zod_1.z.record(zod_1.z.unknown()),
    position: zod_1.z.object({
        x: zod_1.z.number(),
        y: zod_1.z.number(),
    }),
    connections: zod_1.z.array(stepConnectionSchema),
});
const triggerSchema = zod_1.z.object({
    type: zod_1.z.enum(['webhook', 'cron', 'manual']),
    config: zod_1.z.record(zod_1.z.unknown()).default({}),
});
const workflowVariableSchema = zod_1.z.object({
    key: zod_1.z.string().min(1),
    value: zod_1.z.string(),
    isSecret: zod_1.z.boolean().default(false),
});
exports.createWorkflowSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Name is required').max(200),
    description: zod_1.z.string().max(1000).default(''),
    trigger: triggerSchema,
    steps: zod_1.z.array(workflowStepSchema).default([]),
    variables: zod_1.z.array(workflowVariableSchema).default([]),
});
exports.updateWorkflowSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(200).optional(),
    description: zod_1.z.string().max(1000).optional(),
    trigger: triggerSchema.optional(),
    steps: zod_1.z.array(workflowStepSchema).optional(),
    variables: zod_1.z.array(workflowVariableSchema).optional(),
});
//# sourceMappingURL=workflow.schema.js.map