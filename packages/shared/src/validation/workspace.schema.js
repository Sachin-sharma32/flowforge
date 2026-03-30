"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateMemberRoleSchema = exports.inviteMemberSchema = exports.updateWorkspaceSchema = exports.createWorkspaceSchema = void 0;
const zod_1 = require("zod");
exports.createWorkspaceSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Name must be at least 2 characters').max(100),
});
exports.updateWorkspaceSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(100).optional(),
    settings: zod_1.z
        .object({
        defaultTimezone: zod_1.z.string().optional(),
    })
        .optional(),
});
exports.inviteMemberSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    role: zod_1.z.enum(['admin', 'editor', 'viewer']),
});
exports.updateMemberRoleSchema = zod_1.z.object({
    role: zod_1.z.enum(['admin', 'editor', 'viewer']),
});
//# sourceMappingURL=workspace.schema.js.map