import { z } from 'zod';

export const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ID format');

export const workspaceIdParamsSchema = z
  .object({
    workspaceId: objectIdSchema,
  })
  .strict();

export const workspaceParamsSchema = z
  .object({
    id: objectIdSchema,
  })
  .strict();

export const workspaceMemberParamsSchema = z
  .object({
    id: objectIdSchema,
    userId: objectIdSchema,
  })
  .strict();

export const workflowParamsSchema = z
  .object({
    workspaceId: objectIdSchema,
    id: objectIdSchema,
  })
  .strict();

export const executionParamsSchema = z
  .object({
    workspaceId: objectIdSchema,
    id: objectIdSchema,
  })
  .strict();

export const webhookIngressParamsSchema = z
  .object({
    workspaceId: objectIdSchema,
    path: z.string().min(1, 'Webhook path is required'),
  })
  .strict();

const queryStatusSchema = z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']);
const workflowStatusSchema = z.enum(['draft', 'active', 'paused', 'archived']);
const pageSchema = z.coerce.number().int().min(1);
const limitSchema = z.coerce.number().int().min(1);

export const workflowListQuerySchema = z
  .object({
    status: workflowStatusSchema.optional(),
    page: pageSchema.optional(),
    limit: limitSchema.optional(),
    search: z.string().trim().max(200).optional(),
  })
  .strict();

export const executionListQuerySchema = z
  .object({
    workflowId: objectIdSchema.optional(),
    status: queryStatusSchema.optional(),
    page: pageSchema.optional(),
    limit: limitSchema.optional(),
  })
  .strict();

export const executionTimelineQuerySchema = z
  .object({
    days: z.coerce.number().int().min(1).max(90).optional(),
  })
  .strict();

export const workflowExecuteSchema = z
  .object({
    payload: z.record(z.unknown()).optional(),
  })
  .strict();

export type WorkflowListQueryInput = z.infer<typeof workflowListQuerySchema>;
export type ExecutionListQueryInput = z.infer<typeof executionListQuerySchema>;
