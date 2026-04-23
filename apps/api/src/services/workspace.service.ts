import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { Workspace, IWorkspaceDocument } from '../models/workspace.model';
import { Organization } from '../models/organization.model';
import { User } from '../models/user.model';
import { Invitation } from '../models/invitation.model';
import { NotFoundError, ConflictError, ForbiddenError } from '../domain/errors';
import { CreateWorkspaceInput, InviteMemberInput, RoleType } from '@flowforge/shared';
import { EmailService } from './email.service';
import { config } from '../config';

interface WorkspaceMemberListItem {
  userId: string;
  role: RoleType;
  joinedAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  } | null;
}

interface WorkspaceMemberListResult {
  data: WorkspaceMemberListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

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

  async listMembers(workspaceId: string, page = 1, limit = 20): Promise<WorkspaceMemberListResult> {
    const workspace = await Workspace.findById(workspaceId)
      .populate('members.userId', 'name email avatar')
      .lean();
    if (!workspace) throw new NotFoundError('Workspace not found');

    const total = workspace.members.length;
    const pagedMembers = workspace.members.slice((page - 1) * limit, (page - 1) * limit + limit);

    const data = pagedMembers.map((member) => {
      const rawUser = member.userId as
        | {
            _id?: unknown;
            id?: unknown;
            name?: unknown;
            email?: unknown;
            avatar?: unknown;
          }
        | string;
      const resolvedId =
        typeof rawUser === 'string' ? rawUser : String(rawUser._id ?? rawUser.id ?? '');

      return {
        userId: resolvedId,
        role: member.role as RoleType,
        joinedAt: member.joinedAt,
        user:
          typeof rawUser === 'string'
            ? null
            : {
                id: resolvedId,
                name: typeof rawUser.name === 'string' ? rawUser.name : '',
                email: typeof rawUser.email === 'string' ? rawUser.email : '',
                avatar: typeof rawUser.avatar === 'string' ? rawUser.avatar : undefined,
              },
      };
    });

    return {
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
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
    if (!member) {
      throw new ForbiddenError('You are not a member of this workspace');
    }
    if (member.role !== 'owner') {
      throw new ForbiddenError('Only workspace owner can delete the workspace');
    }

    await Workspace.findByIdAndDelete(workspaceId);
  }

  async inviteMember(workspaceId: string, input: InviteMemberInput, invitedBy: string) {
    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) throw new NotFoundError('Workspace not found');

    const email = input.email.toLowerCase().trim();

    // Check if user is already a member
    const user = await User.findOne({ email });
    if (user) {
      const existingMember = workspace.members.find(
        (m) => m.userId.toString() === user._id.toString(),
      );
      if (existingMember) {
        throw new ConflictError('User is already a member of this workspace');
      }
    }

    // Check for existing pending invitation
    const existingInvitation = await Invitation.findOne({
      workspaceId,
      email,
      status: 'pending',
      expiresAt: { $gt: new Date() },
    });
    if (existingInvitation) {
      throw new ConflictError('An invitation has already been sent to this email');
    }

    // Create invitation
    const token = crypto.randomBytes(32).toString('hex');
    const invitation = await Invitation.create({
      workspaceId,
      email,
      role: input.role,
      invitedBy,
      token,
      status: 'pending',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    // Send invitation email
    const inviteUrl = `${config.WEB_APP_URL}/invitations?token=${token}`;
    const emailService = new EmailService();
    await emailService.sendEmail({
      to: email,
      subject: `You've been invited to join ${workspace.name} on FlowForge`,
      html: `
        <h2>Workspace Invitation</h2>
        <p>You've been invited to join <strong>${workspace.name}</strong> as a <strong>${input.role}</strong>.</p>
        <p><a href="${inviteUrl}" style="display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;text-decoration:none;border-radius:6px;">Accept Invitation</a></p>
        <p>Or copy this link: ${inviteUrl}</p>
        <p>This invitation expires in 7 days.</p>
      `,
      text: `You've been invited to join ${workspace.name} as a ${input.role}. Accept here: ${inviteUrl}`,
    });

    return invitation;
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

  async acceptInvitation(token: string, userId: string) {
    const invitation = await Invitation.findOne({ token, status: 'pending' });
    if (!invitation) throw new NotFoundError('Invitation not found or already used');
    if (invitation.expiresAt < new Date()) throw new ForbiddenError('Invitation has expired');

    const user = await User.findById(userId);
    if (!user) throw new NotFoundError('User not found');
    if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      throw new ForbiddenError('This invitation was sent to a different email address');
    }

    const workspace = await Workspace.findById(invitation.workspaceId);
    if (!workspace) throw new NotFoundError('Workspace no longer exists');

    const existingMember = workspace.members.find((m) => m.userId.toString() === userId);
    if (existingMember) {
      invitation.status = 'accepted';
      await invitation.save();
      return workspace;
    }

    workspace.members.push({
      userId: user._id,
      role: invitation.role as any,
      joinedAt: new Date(),
    });
    await workspace.save();

    invitation.status = 'accepted';
    await invitation.save();

    return workspace;
  }

  async declineInvitation(token: string, userId: string) {
    const invitation = await Invitation.findOne({ token, status: 'pending' });
    if (!invitation) throw new NotFoundError('Invitation not found or already used');

    const user = await User.findById(userId);
    if (!user) throw new NotFoundError('User not found');
    if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
      throw new ForbiddenError('This invitation was sent to a different email address');
    }

    invitation.status = 'declined';
    await invitation.save();
    return invitation;
  }

  async getInvitationsForUser(email: string) {
    return Invitation.find({
      email: email.toLowerCase(),
      status: 'pending',
      expiresAt: { $gt: new Date() },
    })
      .populate('workspaceId', 'name')
      .populate('invitedBy', 'name email');
  }

  async getInvitationsForWorkspace(workspaceId: string) {
    return Invitation.find({
      workspaceId,
      status: 'pending',
      expiresAt: { $gt: new Date() },
    }).populate('invitedBy', 'name email');
  }
}
