import { v4 as uuidv4 } from 'uuid';
import { Workspace, IWorkspaceDocument } from '../models/workspace.model';
import { Organization } from '../models/organization.model';
import { User } from '../models/user.model';
import { NotFoundError, ConflictError, ForbiddenError } from '../domain/errors';
import { CreateWorkspaceInput, InviteMemberInput, RoleType } from '@flowforge/shared';

export class WorkspaceService {
  async listByUser(userId: string): Promise<IWorkspaceDocument[]> {
    return Workspace.find({ 'members.userId': userId }).populate('organizationId', 'name slug');
  }

  async getById(workspaceId: string): Promise<IWorkspaceDocument> {
    const workspace = await Workspace.findById(workspaceId).populate(
      'members.userId',
      'name email avatar',
    );
    if (!workspace) throw new NotFoundError('Workspace not found');
    return workspace;
  }

  async create(input: CreateWorkspaceInput, userId: string, organizationId: string) {
    const org = await Organization.findById(organizationId);
    if (!org) throw new NotFoundError('Organization not found');

    const workspaceCount = await Workspace.countDocuments({ organizationId });
    if (workspaceCount >= org.limits.maxWorkspaces) {
      throw new ForbiddenError('Workspace limit reached for your plan');
    }

    const slug = input.name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-');
    return Workspace.create({
      organizationId,
      name: input.name,
      slug: `${slug}-${uuidv4().slice(0, 8)}`,
      members: [{ userId, role: 'owner', joinedAt: new Date() }],
    });
  }

  async update(workspaceId: string, updates: Partial<{ name: string }>) {
    const workspace = await Workspace.findByIdAndUpdate(workspaceId, updates, { new: true });
    if (!workspace) throw new NotFoundError('Workspace not found');
    return workspace;
  }

  async delete(workspaceId: string, userId: string) {
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) throw new NotFoundError('Workspace not found');

    const member = workspace.members.find((m) => m.userId.toString() === userId);
    if (!member || member.role !== 'owner') {
      throw new ForbiddenError('Only workspace owner can delete the workspace');
    }

    await Workspace.findByIdAndDelete(workspaceId);
  }

  async inviteMember(workspaceId: string, input: InviteMemberInput) {
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) throw new NotFoundError('Workspace not found');

    const user = await User.findOne({ email: input.email.toLowerCase().trim() });
    if (!user) throw new NotFoundError('User not found with that email');

    const existingMember = workspace.members.find(
      (m) => m.userId.toString() === user._id.toString(),
    );
    if (existingMember) {
      throw new ConflictError('User is already a member of this workspace');
    }

    workspace.members.push({
      userId: user._id,
      role: input.role,
      joinedAt: new Date(),
    });

    await workspace.save();
    return workspace;
  }

  async updateMemberRole(workspaceId: string, memberId: string, role: RoleType) {
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) throw new NotFoundError('Workspace not found');

    const member = workspace.members.find((m) => m.userId.toString() === memberId);
    if (!member) throw new NotFoundError('Member not found');

    if (member.role === 'owner') {
      throw new ForbiddenError('Cannot change the owner role');
    }

    member.role = role;
    await workspace.save();
    return workspace;
  }

  async removeMember(workspaceId: string, memberId: string) {
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) throw new NotFoundError('Workspace not found');

    const member = workspace.members.find((m) => m.userId.toString() === memberId);
    if (!member) throw new NotFoundError('Member not found');

    if (member.role === 'owner') {
      throw new ForbiddenError('Cannot remove the workspace owner');
    }

    workspace.members = workspace.members.filter((m) => m.userId.toString() !== memberId);
    await workspace.save();
    return workspace;
  }
}
