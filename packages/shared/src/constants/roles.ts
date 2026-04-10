export const Role = {
  OWNER: 'owner',
  ADMIN: 'admin',
  EDITOR: 'editor',
  VIEWER: 'viewer',
} as const;

export type RoleType = (typeof Role)[keyof typeof Role];

export const ROLE_HIERARCHY: Record<RoleType, number> = {
  [Role.OWNER]: 4,
  [Role.ADMIN]: 3,
  [Role.EDITOR]: 2,
  [Role.VIEWER]: 1,
};

export const Permissions = {
  MANAGE_BILLING: 'manage_billing',
  INVITE_MEMBERS: 'invite_members',
  MANAGE_MEMBERS: 'manage_members',
  VIEW_WORKFLOWS: 'view_workflows',
  CREATE_WORKFLOW: 'create_workflow',
  EDIT_WORKFLOW: 'edit_workflow',
  DELETE_WORKFLOW: 'delete_workflow',
  EXECUTE_WORKFLOW: 'execute_workflow',
  CANCEL_EXECUTION: 'cancel_execution',
  VIEW_EXECUTIONS: 'view_executions',
  MANAGE_SETTINGS: 'manage_settings',
  DELETE_WORKSPACE: 'delete_workspace',
} as const;

export type PermissionType = (typeof Permissions)[keyof typeof Permissions];

export const ROLE_PERMISSIONS: Record<RoleType, PermissionType[]> = {
  [Role.OWNER]: Object.values(Permissions),
  [Role.ADMIN]: [
    Permissions.INVITE_MEMBERS,
    Permissions.MANAGE_MEMBERS,
    Permissions.VIEW_WORKFLOWS,
    Permissions.CREATE_WORKFLOW,
    Permissions.EDIT_WORKFLOW,
    Permissions.DELETE_WORKFLOW,
    Permissions.EXECUTE_WORKFLOW,
    Permissions.CANCEL_EXECUTION,
    Permissions.VIEW_EXECUTIONS,
    Permissions.MANAGE_SETTINGS,
    Permissions.DELETE_WORKSPACE,
  ],
  [Role.EDITOR]: [
    Permissions.VIEW_WORKFLOWS,
    Permissions.CREATE_WORKFLOW,
    Permissions.EDIT_WORKFLOW,
    Permissions.EXECUTE_WORKFLOW,
    Permissions.CANCEL_EXECUTION,
    Permissions.VIEW_EXECUTIONS,
  ],
  [Role.VIEWER]: [Permissions.VIEW_WORKFLOWS, Permissions.VIEW_EXECUTIONS],
};

export function hasPermission(role: RoleType, permission: PermissionType): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
