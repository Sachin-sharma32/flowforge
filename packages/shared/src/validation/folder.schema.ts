import { z } from 'zod';

const roleSchema = z.enum(['owner', 'admin', 'editor', 'viewer']);

export const folderAccessControlSchema = z
  .object({
    minViewRole: roleSchema.default('viewer'),
    minEditRole: roleSchema.default('editor'),
    minExecuteRole: roleSchema.default('editor'),
  })
  .strict();

export const createFolderSchema = z
  .object({
    name: z.string().min(1, 'Folder name is required').max(120),
    description: z.string().max(500).default(''),
    color: z
      .string()
      .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Color must be a valid hex code')
      .default('#3b82f6'),
    accessControl: folderAccessControlSchema.default({
      minViewRole: 'viewer',
      minEditRole: 'editor',
      minExecuteRole: 'editor',
    }),
  })
  .strict();

export const updateFolderSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    description: z.string().max(500).optional(),
    color: z
      .string()
      .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Color must be a valid hex code')
      .optional(),
    accessControl: folderAccessControlSchema.partial().optional(),
  })
  .strict();

export type CreateFolderInput = z.infer<typeof createFolderSchema>;
export type UpdateFolderInput = z.infer<typeof updateFolderSchema>;
