export declare const Role: {
    readonly OWNER: "owner";
    readonly ADMIN: "admin";
    readonly EDITOR: "editor";
    readonly VIEWER: "viewer";
};
export type RoleType = (typeof Role)[keyof typeof Role];
export declare const ROLE_HIERARCHY: Record<RoleType, number>;
export declare const Permissions: {
    readonly MANAGE_BILLING: "manage_billing";
    readonly INVITE_MEMBERS: "invite_members";
    readonly MANAGE_MEMBERS: "manage_members";
    readonly CREATE_WORKFLOW: "create_workflow";
    readonly EDIT_WORKFLOW: "edit_workflow";
    readonly DELETE_WORKFLOW: "delete_workflow";
    readonly EXECUTE_WORKFLOW: "execute_workflow";
    readonly VIEW_EXECUTIONS: "view_executions";
    readonly MANAGE_SETTINGS: "manage_settings";
    readonly DELETE_WORKSPACE: "delete_workspace";
};
export type PermissionType = (typeof Permissions)[keyof typeof Permissions];
export declare const ROLE_PERMISSIONS: Record<RoleType, PermissionType[]>;
export declare function hasPermission(role: RoleType, permission: PermissionType): boolean;
