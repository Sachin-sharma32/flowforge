import { z } from 'zod';
export declare const createWorkspaceSchema: z.ZodObject<{
    name: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
}, {
    name: string;
}>;
export declare const updateWorkspaceSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    settings: z.ZodOptional<z.ZodObject<{
        defaultTimezone: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        defaultTimezone?: string | undefined;
    }, {
        defaultTimezone?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    settings?: {
        defaultTimezone?: string | undefined;
    } | undefined;
}, {
    name?: string | undefined;
    settings?: {
        defaultTimezone?: string | undefined;
    } | undefined;
}>;
export declare const inviteMemberSchema: z.ZodObject<{
    email: z.ZodString;
    role: z.ZodEnum<["admin", "editor", "viewer"]>;
}, "strip", z.ZodTypeAny, {
    email: string;
    role: "admin" | "editor" | "viewer";
}, {
    email: string;
    role: "admin" | "editor" | "viewer";
}>;
export declare const updateMemberRoleSchema: z.ZodObject<{
    role: z.ZodEnum<["admin", "editor", "viewer"]>;
}, "strip", z.ZodTypeAny, {
    role: "admin" | "editor" | "viewer";
}, {
    role: "admin" | "editor" | "viewer";
}>;
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;
