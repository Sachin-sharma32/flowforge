"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLE_PERMISSIONS = exports.Permissions = exports.ROLE_HIERARCHY = exports.Role = void 0;
exports.hasPermission = hasPermission;
exports.Role = {
    OWNER: 'owner',
    ADMIN: 'admin',
    EDITOR: 'editor',
    VIEWER: 'viewer',
};
exports.ROLE_HIERARCHY = {
    [exports.Role.OWNER]: 4,
    [exports.Role.ADMIN]: 3,
    [exports.Role.EDITOR]: 2,
    [exports.Role.VIEWER]: 1,
};
exports.Permissions = {
    MANAGE_BILLING: 'manage_billing',
    INVITE_MEMBERS: 'invite_members',
    MANAGE_MEMBERS: 'manage_members',
    CREATE_WORKFLOW: 'create_workflow',
    EDIT_WORKFLOW: 'edit_workflow',
    DELETE_WORKFLOW: 'delete_workflow',
    EXECUTE_WORKFLOW: 'execute_workflow',
    VIEW_EXECUTIONS: 'view_executions',
    MANAGE_SETTINGS: 'manage_settings',
    DELETE_WORKSPACE: 'delete_workspace',
};
exports.ROLE_PERMISSIONS = {
    [exports.Role.OWNER]: Object.values(exports.Permissions),
    [exports.Role.ADMIN]: [
        exports.Permissions.INVITE_MEMBERS,
        exports.Permissions.MANAGE_MEMBERS,
        exports.Permissions.CREATE_WORKFLOW,
        exports.Permissions.EDIT_WORKFLOW,
        exports.Permissions.DELETE_WORKFLOW,
        exports.Permissions.EXECUTE_WORKFLOW,
        exports.Permissions.VIEW_EXECUTIONS,
        exports.Permissions.MANAGE_SETTINGS,
    ],
    [exports.Role.EDITOR]: [
        exports.Permissions.CREATE_WORKFLOW,
        exports.Permissions.EDIT_WORKFLOW,
        exports.Permissions.EXECUTE_WORKFLOW,
        exports.Permissions.VIEW_EXECUTIONS,
    ],
    [exports.Role.VIEWER]: [exports.Permissions.VIEW_EXECUTIONS],
};
function hasPermission(role, permission) {
    return exports.ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
//# sourceMappingURL=roles.js.map