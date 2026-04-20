import { z } from 'zod';

const CONNECTOR_TYPES = [
  'google_calendar',
  'slack_message',
  'notion',
  'gmail',
  'google_drive',
  'send_email',
  'http_request',
] as const;

export const createConnectorSchema = z
  .object({
    type: z.enum(CONNECTOR_TYPES),
    name: z.string().min(1, 'Name is required').max(100),
    accountLabel: z.string().max(200).optional(),
    credentials: z.record(z.string()).default({}),
  })
  .strict();

export const updateConnectorSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    accountLabel: z.string().max(200).optional(),
    credentials: z.record(z.string()).optional(),
    status: z.enum(['connected', 'error', 'disconnected']).optional(),
  })
  .strict();

export const connectorParamsSchema = z.object({
  workspaceId: z.string().min(1),
  connectorId: z.string().min(1),
});

export type CreateConnectorInput = z.infer<typeof createConnectorSchema>;
export type UpdateConnectorInput = z.infer<typeof updateConnectorSchema>;
