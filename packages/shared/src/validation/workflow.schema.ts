import { z } from 'zod';

const stepConnectionSchema = z.object({
  targetStepId: z.string(),
  label: z.string(),
});

const workflowStepSchema = z.object({
  id: z.string(),
  type: z.enum([
    'http_request',
    'condition',
    'transform',
    'delay',
    'send_email',
    'slack_message',
  ]),
  name: z.string().min(1).max(100),
  config: z.record(z.unknown()),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  connections: z.array(stepConnectionSchema),
});

const triggerSchema = z.object({
  type: z.enum(['webhook', 'cron', 'manual']),
  config: z.record(z.unknown()).default({}),
});

const workflowVariableSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
  isSecret: z.boolean().default(false),
});

export const createWorkflowSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(1000).default(''),
  trigger: triggerSchema,
  steps: z.array(workflowStepSchema).default([]),
  variables: z.array(workflowVariableSchema).default([]),
});

export const updateWorkflowSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  trigger: triggerSchema.optional(),
  steps: z.array(workflowStepSchema).optional(),
  variables: z.array(workflowVariableSchema).optional(),
});

export type CreateWorkflowInput = z.infer<typeof createWorkflowSchema>;
export type UpdateWorkflowInput = z.infer<typeof updateWorkflowSchema>;
