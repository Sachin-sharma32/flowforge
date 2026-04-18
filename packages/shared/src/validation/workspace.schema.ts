import { z } from 'zod';

export const createWorkspaceSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  })
  .strict();

export const updateWorkspaceSchema = z
  .object({
    name: z.string().min(2).max(100).optional(),
    settings: z
      .object({
        defaultTimezone: z.string().optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

// 'owner' is excluded — ownership is assigned at workspace creation only, not via invite/role-update
export const inviteMemberSchema = z
  .object({
    email: z.string().email('Invalid email address'),
    role: z.enum(['admin', 'editor', 'viewer']),
  })
  .strict();

export const updateMemberRoleSchema = z
  .object({
    role: z.enum(['admin', 'editor', 'viewer']),
  })
  .strict();

export const workspaceMembersListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).optional(),
  })
  .strict();

export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
