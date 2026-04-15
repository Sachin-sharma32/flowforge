import mongoose from 'mongoose';
import { ROLE_HIERARCHY, RoleType } from '@flowforge/shared';
import { Folder } from '../models/folder.model';
import { ForbiddenError, NotFoundError } from '../domain/errors';

export type FolderAccessAction = 'view' | 'edit' | 'execute';

function getMinRoleField(
  action: FolderAccessAction,
): 'minViewRole' | 'minEditRole' | 'minExecuteRole' {
  if (action === 'view') {
    return 'minViewRole';
  }

  if (action === 'edit') {
    return 'minEditRole';
  }

  return 'minExecuteRole';
}

export function canRoleAccess(requiredRole: RoleType, userRole: RoleType): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

function allowedRequiredRoles(userRole: RoleType): RoleType[] {
  const userLevel = ROLE_HIERARCHY[userRole];
  return (Object.keys(ROLE_HIERARCHY) as RoleType[]).filter(
    (role) => ROLE_HIERARCHY[role] <= userLevel,
  );
}

export async function getAccessibleFolderIds(
  workspaceId: string,
  userRole: RoleType,
  action: FolderAccessAction,
): Promise<mongoose.Types.ObjectId[]> {
  const field = getMinRoleField(action);
  const roles = allowedRequiredRoles(userRole);

  const folders = await Folder.find({
    workspaceId,
    [`accessControl.${field}`]: { $in: roles },
  })
    .select('_id')
    .lean();

  return folders
    .map((folder) => new mongoose.Types.ObjectId(folder._id))
    .filter((id) => mongoose.Types.ObjectId.isValid(id));
}

export async function assertFolderAccessById(
  folderId: string,
  workspaceId: string,
  userRole: RoleType,
  action: FolderAccessAction,
): Promise<void> {
  if (!mongoose.Types.ObjectId.isValid(folderId)) {
    throw new NotFoundError('Invalid folder ID');
  }

  const folder = await Folder.findOne({ _id: folderId, workspaceId }).lean();
  if (!folder) {
    throw new NotFoundError('Folder not found');
  }

  const field = getMinRoleField(action);
  const requiredRole = folder.accessControl[field];

  if (!canRoleAccess(requiredRole, userRole)) {
    throw new ForbiddenError(`Folder access denied for ${action} action`);
  }
}
