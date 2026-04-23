import { RoleType } from '../constants/roles';

export interface IFolderAccessControl {
  minViewRole: RoleType;
  minEditRole: RoleType;
  minExecuteRole: RoleType;
}

export interface IFolder {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  description: string;
  color: string;
  accessControl: IFolderAccessControl;
  workflowCount?: number;
  createdAt: Date;
  updatedAt: Date;
}
