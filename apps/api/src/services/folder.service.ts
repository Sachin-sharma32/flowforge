import mongoose from 'mongoose';
import { CreateFolderInput, UpdateFolderInput, RoleType, IFolder } from '@flowforge/shared';
import { Folder, IFolderDocument } from '../models/folder.model';
import { Workflow } from '../models/workflow.model';
import { NotFoundError } from '../domain/errors';
import { assertFolderAccessById, getAccessibleFolderIds } from './folder-access.service';

export interface FolderListQuery {
  workspaceId: string;
  workspaceRole?: RoleType;
}

type FolderListItem = IFolder & { workflowCount: number };

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export class FolderService {
  private async resolveUniqueSlug(
    workspaceId: string,
    rawName: string,
    excludeFolderId?: string,
  ): Promise<string> {
    const base = slugify(rawName) || 'folder';
    let slug = base;
    let attempt = 1;
    let exists = true;

    while (exists) {
      const existing = await Folder.findOne({
        workspaceId,
        slug,
        ...(excludeFolderId ? { _id: { $ne: excludeFolderId } } : {}),
      })
        .select('_id')
        .lean();

      if (!existing) {
        return slug;
      }
      exists = Boolean(existing);

      attempt += 1;
      slug = `${base}-${attempt}`;
    }

    return slug;
  }

  async list(query: FolderListQuery): Promise<FolderListItem[]> {
    const { workspaceId, workspaceRole } = query;

    const filter: Record<string, unknown> = { workspaceId };

    if (workspaceRole && workspaceRole !== 'owner') {
      const visibleFolderIds = await getAccessibleFolderIds(workspaceId, workspaceRole, 'view');
      filter._id = { $in: visibleFolderIds };
    }

    const folders = await Folder.find(filter).sort({ name: 1 }).lean();

    const folderIds = folders.map((folder) => folder._id);
    const counts = folderIds.length
      ? await Workflow.aggregate([
          {
            $match: {
              workspaceId: new mongoose.Types.ObjectId(workspaceId),
              status: { $ne: 'archived' },
              folderId: { $in: folderIds },
            },
          },
          {
            $group: {
              _id: '$folderId',
              count: { $sum: 1 },
            },
          },
        ])
      : [];

    const countMap = new Map(counts.map((entry) => [String(entry._id), Number(entry.count) || 0]));

    return folders.map((folder) => ({
      id: String(folder._id),
      workspaceId: String(folder.workspaceId),
      name: folder.name,
      slug: folder.slug,
      description: folder.description,
      color: folder.color,
      accessControl: {
        minViewRole: folder.accessControl.minViewRole,
        minEditRole: folder.accessControl.minEditRole,
        minExecuteRole: folder.accessControl.minExecuteRole,
      },
      workflowCount: countMap.get(String(folder._id)) || 0,
      createdAt: folder.createdAt,
      updatedAt: folder.updatedAt,
    }));
  }

  async getById(
    folderId: string,
    workspaceId: string,
    workspaceRole?: RoleType,
  ): Promise<IFolderDocument> {
    const folder = await Folder.findOne({ _id: folderId, workspaceId });
    if (!folder) {
      throw new NotFoundError('Folder not found');
    }
    if (workspaceRole) {
      await assertFolderAccessById(folderId, workspaceId, workspaceRole, 'view');
    }
    return folder;
  }

  async create(input: CreateFolderInput, workspaceId: string): Promise<IFolderDocument> {
    const slug = await this.resolveUniqueSlug(workspaceId, input.name);

    return Folder.create({
      workspaceId,
      name: input.name.trim(),
      slug,
      description: input.description?.trim() || '',
      color: input.color || '#3b82f6',
      accessControl: {
        minViewRole: input.accessControl?.minViewRole || 'viewer',
        minEditRole: input.accessControl?.minEditRole || 'editor',
        minExecuteRole: input.accessControl?.minExecuteRole || 'editor',
      },
    });
  }

  async update(
    folderId: string,
    workspaceId: string,
    input: UpdateFolderInput,
  ): Promise<IFolderDocument> {
    const existing = await this.getById(folderId, workspaceId);

    const nextName = input.name?.trim();
    const slug =
      nextName && nextName !== existing.name
        ? await this.resolveUniqueSlug(workspaceId, nextName, folderId)
        : existing.slug;

    const folder = await Folder.findOneAndUpdate(
      { _id: folderId, workspaceId },
      {
        ...(nextName ? { name: nextName, slug } : {}),
        ...(input.description !== undefined ? { description: input.description.trim() } : {}),
        ...(input.color ? { color: input.color } : {}),
        ...(input.accessControl
          ? {
              accessControl: {
                ...existing.accessControl,
                ...input.accessControl,
              },
            }
          : {}),
      },
      { new: true },
    );

    if (!folder) {
      throw new NotFoundError('Folder not found');
    }

    return folder;
  }

  async delete(folderId: string, workspaceId: string): Promise<void> {
    const deleted = await Folder.findOneAndDelete({ _id: folderId, workspaceId });
    if (!deleted) {
      throw new NotFoundError('Folder not found');
    }

    await Workflow.updateMany({ workspaceId, folderId }, { $unset: { folderId: '' } });
  }
}
