'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { TypographyH1, TypographyMuted, TypographySmall } from '@/components/ui/typography';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ViewToggle,
  getStoredViewMode,
  storeViewMode,
  type ViewMode,
} from '@/components/ui/view-toggle';
import { ConfirmActionDialog } from '@/components/ui/confirm-action-dialog';
import { useAppDispatch, useAppSelector } from '@/stores/hooks';
import { fetchWorkspaces } from '@/stores/workspace-slice';
import { api } from '@/lib/api-client';
import { getApiErrorMessage } from '@/lib/api-error';
import { Copy, MoreVertical, Trash2, UserCog, UserPlus, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { ROLE_PERMISSIONS, Role, type RoleType, type PermissionType } from '@flowforge/shared';
import { cn } from '@/lib/utils';

interface MemberListItem {
  userId: string;
  role: RoleType;
  joinedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    lastActiveAt?: string | null;
  } | null;
}

interface InvitationListItem {
  _id: string;
  token: string;
  email: string;
  role: RoleType;
  createdAt: string;
  expiresAt: string;
  invitedBy?: { name?: string; email?: string } | null;
}

const ROLE_BADGE_STYLES: Record<RoleType, string> = {
  owner: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  admin: 'border-sky-500/50 bg-sky-500/10 text-sky-600 dark:text-sky-400',
  editor: 'border-border bg-muted text-foreground',
  viewer: 'border-border bg-muted text-muted-foreground',
};

const AVATAR_PALETTE = [
  'bg-rose-500/80',
  'bg-orange-500/80',
  'bg-amber-500/80',
  'bg-emerald-500/80',
  'bg-sky-500/80',
  'bg-indigo-500/80',
  'bg-purple-500/80',
];

function avatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function formatLastActive(raw?: string | null): { text: string; isLive: boolean } {
  if (!raw) return { text: 'Invite pending', isLive: false };
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return { text: 'Invite pending', isLive: false };
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 5 * 60 * 1000) return { text: 'Active now', isLive: true };
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 60) return { text: `${minutes}m ago`, isLive: false };
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return { text: `${hours}h ago`, isLive: false };
  const days = Math.floor(hours / 24);
  if (days < 14) return { text: `${days}d ago`, isLive: false };
  const weeks = Math.floor(days / 7);
  if (weeks < 8) return { text: `${weeks}w ago`, isLive: false };
  const months = Math.floor(days / 30);
  if (months < 12) return { text: `${months}mo ago`, isLive: false };
  return { text: `${Math.floor(days / 365)}y ago`, isLive: false };
}

function permissionLabel(permission: PermissionType): string {
  return permission
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/Workflow\b/, 'workflows')
    .replace(/Execution\b/, 'executions')
    .replace(/Member\b/, 'members');
}

export default function MembersPage() {
  const dispatch = useAppDispatch();
  const { currentWorkspace } = useAppSelector((state) => state.workspace);
  const { user } = useAppSelector((state) => state.auth);

  const [members, setMembers] = useState<MemberListItem[]>([]);
  const [invitations, setInvitations] = useState<InvitationListItem[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(false);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<RoleType>(Role.EDITOR);
  const [inviting, setInviting] = useState(false);

  const [viewMode, setViewMode] = useState<ViewMode>(() => getStoredViewMode('members'));
  const [removeTarget, setRemoveTarget] = useState<{ userId: string; name: string } | null>(null);

  const currentMembership = useMemo(() => {
    if (!user || !currentWorkspace) return null;
    return members.find((m) => m.userId === user.id) ?? null;
  }, [members, user, currentWorkspace]);

  const canManageMembers =
    currentMembership?.role === Role.OWNER || currentMembership?.role === Role.ADMIN;

  const loadMembers = async (workspaceId: string) => {
    setIsLoadingMembers(true);
    try {
      const { data } = await api.get(`/workspaces/${workspaceId}/members`, {
        params: { limit: '200' },
      });
      setMembers((data.data as MemberListItem[]) ?? []);
    } catch (err) {
      toast.error('Failed to load members', { description: getApiErrorMessage(err) });
    } finally {
      setIsLoadingMembers(false);
    }
  };

  const loadInvitations = async (workspaceId: string) => {
    setIsLoadingInvitations(true);
    try {
      const { data } = await api.get(`/workspaces/${workspaceId}/invitations`);
      setInvitations((data.data as InvitationListItem[]) ?? []);
    } catch (err) {
      // Non-blocking: members page still usable even if we can't read invites
      console.error('Failed to load invitations', err);
    } finally {
      setIsLoadingInvitations(false);
    }
  };

  useEffect(() => {
    if (!currentWorkspace?.id) return;
    void loadMembers(currentWorkspace.id);
    void loadInvitations(currentWorkspace.id);
  }, [currentWorkspace?.id]);

  const activeInLastHour = useMemo(() => {
    const threshold = Date.now() - 60 * 60 * 1000;
    return members.filter((member) => {
      const last = member.user?.lastActiveAt;
      if (!last) return false;
      const t = new Date(last).getTime();
      return !Number.isNaN(t) && t >= threshold;
    }).length;
  }, [members]);

  const handleCopyInviteLink = async () => {
    if (!currentWorkspace?.id) return;
    const url = `${window.location.origin}/invitations?workspace=${currentWorkspace.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Invite link copied to clipboard');
    } catch {
      toast.error('Could not copy link');
    }
  };

  const handleInvite = async () => {
    if (!currentWorkspace?.id || !inviteEmail.trim()) return;
    setInviting(true);
    try {
      await api.post(`/workspaces/${currentWorkspace.id}/members`, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      toast.success('Invitation sent', {
        description: `An invitation email has been sent to ${inviteEmail.trim()}.`,
      });
      setInviteEmail('');
      setInviteOpen(false);
      await loadInvitations(currentWorkspace.id);
    } catch (err) {
      toast.error('Failed to send invitation', { description: getApiErrorMessage(err) });
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: RoleType) => {
    if (!currentWorkspace?.id) return;
    try {
      await api.patch(`/workspaces/${currentWorkspace.id}/members/${userId}`, { role: newRole });
      await loadMembers(currentWorkspace.id);
      await dispatch(fetchWorkspaces()).unwrap();
      toast.success('Role updated');
    } catch (err) {
      toast.error('Failed to update role', { description: getApiErrorMessage(err) });
    }
  };

  const confirmRemove = async () => {
    if (!currentWorkspace?.id || !removeTarget) return;
    try {
      await api.delete(`/workspaces/${currentWorkspace.id}/members/${removeTarget.userId}`);
      await loadMembers(currentWorkspace.id);
      await dispatch(fetchWorkspaces()).unwrap();
      toast.success('Member removed');
    } catch (err) {
      toast.error('Failed to remove member', { description: getApiErrorMessage(err) });
    } finally {
      setRemoveTarget(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <TypographyH1>Members</TypographyH1>
          <TypographyMuted className="mt-1.5">
            {members.length} {members.length === 1 ? 'person' : 'people'} in{' '}
            <span className="font-medium text-foreground">
              {currentWorkspace?.name ?? 'this workspace'}
            </span>
            {activeInLastHour > 0 ? <> · {activeInLastHour} active in the last hour.</> : '.'}
          </TypographyMuted>
        </div>
        <div className="flex items-center gap-2">
          <ViewToggle
            value={viewMode}
            onChange={(mode) => {
              setViewMode(mode);
              storeViewMode('members', mode);
            }}
          />
          <Button variant="outline" onClick={handleCopyInviteLink}>
            <Copy className="mr-2 h-4 w-4" />
            Copy invite link
          </Button>
          <Button onClick={() => setInviteOpen(true)} disabled={!canManageMembers}>
            <UserPlus className="mr-2 h-4 w-4" />
            Invite people
          </Button>
        </div>
      </div>

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">Members · {members.length}</TabsTrigger>
          <TabsTrigger value="invites">Pending invites · {invitations.length}</TabsTrigger>
          <TabsTrigger value="roles">Roles &amp; permissions</TabsTrigger>
        </TabsList>

        {/* ── Members ── */}
        <TabsContent value="members" className="mt-4">
          {isLoadingMembers ? (
            <Card>
              <CardContent className="py-16 text-center text-sm text-muted-foreground">
                Loading members...
              </CardContent>
            </Card>
          ) : members.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-sm text-muted-foreground">
                No members in this workspace yet.
              </CardContent>
            </Card>
          ) : viewMode === 'grid' ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {members.map((member) => {
                const name = member.user?.name ?? 'Unknown user';
                const email = member.user?.email ?? '';
                const { text: lastActiveText, isLive } = formatLastActive(
                  member.user?.lastActiveAt,
                );
                const initials = getInitials(name);
                const isOwnerRow = member.role === Role.OWNER;
                return (
                  <Card key={member.userId} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <Avatar>
                          {member.user?.avatar ? (
                            <AvatarImage src={member.user.avatar} alt={name} />
                          ) : null}
                          <AvatarFallback
                            className={cn(
                              'text-xs font-semibold text-white',
                              avatarColor(member.userId || email),
                            )}
                          >
                            {initials || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">{name}</div>
                          <div className="truncate text-xs text-muted-foreground">{email}</div>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn('capitalize', ROLE_BADGE_STYLES[member.role])}
                      >
                        {member.role}
                      </Badge>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5',
                          isLive
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-muted-foreground',
                        )}
                      >
                        {isLive ? (
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        ) : null}
                        {lastActiveText}
                      </span>
                      {!isOwnerRow ? (
                        <MemberRowMenu
                          canManage={canManageMembers}
                          onChangeRole={(role) => handleRoleChange(member.userId, role)}
                          onRemove={() => setRemoveTarget({ userId: member.userId, name })}
                        />
                      ) : null}
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Last active</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => {
                    const name = member.user?.name ?? 'Unknown user';
                    const email = member.user?.email ?? '';
                    const { text: lastActiveText, isLive } = formatLastActive(
                      member.user?.lastActiveAt,
                    );
                    const initials = getInitials(name);
                    const isOwnerRow = member.role === Role.OWNER;
                    return (
                      <TableRow key={member.userId}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              {member.user?.avatar ? (
                                <AvatarImage src={member.user.avatar} alt={name} />
                              ) : null}
                              <AvatarFallback
                                className={cn(
                                  'text-xs font-semibold text-white',
                                  avatarColor(member.userId || email),
                                )}
                              >
                                {initials || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold">{name}</div>
                              <div className="truncate text-xs text-muted-foreground">{email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn('capitalize', ROLE_BADGE_STYLES[member.role])}
                          >
                            {member.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              'inline-flex items-center gap-1.5 text-sm',
                              isLive
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-muted-foreground',
                            )}
                          >
                            {isLive ? (
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            ) : null}
                            {lastActiveText}
                          </span>
                        </TableCell>
                        <TableCell>
                          {!isOwnerRow ? (
                            <MemberRowMenu
                              canManage={canManageMembers}
                              onChangeRole={(role) => handleRoleChange(member.userId, role)}
                              onRemove={() => setRemoveTarget({ userId: member.userId, name })}
                            />
                          ) : null}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* ── Pending invitations ── */}
        <TabsContent value="invites" className="mt-4">
          {isLoadingInvitations ? (
            <Card>
              <CardContent className="py-16 text-center text-sm text-muted-foreground">
                Loading pending invites...
              </CardContent>
            </Card>
          ) : invitations.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-sm text-muted-foreground">
                No pending invitations.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Invited</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Invited by</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((invite) => (
                    <TableRow key={invite.token ?? invite._id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span>{invite.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn('capitalize', ROLE_BADGE_STYLES[invite.role])}
                        >
                          {invite.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatLastActive(invite.createdAt).text}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(invite.expiresAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {invite.invitedBy?.name ?? invite.invitedBy?.email ?? '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* ── Roles & permissions ── */}
        <TabsContent value="roles" className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {(Object.values(Role) as RoleType[]).map((role) => {
              const permissions = ROLE_PERMISSIONS[role] ?? [];
              return (
                <Card key={role} className="p-4">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className={cn('capitalize', ROLE_BADGE_STYLES[role])}>
                      {role}
                    </Badge>
                    <TypographySmall>{permissions.length} permissions</TypographySmall>
                  </div>
                  <ul className="mt-3 space-y-1">
                    {permissions.map((permission) => (
                      <li
                        key={permission}
                        className="flex items-start gap-2 text-xs text-muted-foreground"
                      >
                        <span className="mt-[5px] h-1 w-1 rounded-full bg-muted-foreground/60" />
                        <span>{permissionLabel(permission)}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Invite dialog ── */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite people</DialogTitle>
            <DialogDescription>
              Send an email invitation. Invitees join once they accept.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              type="email"
              placeholder="teammate@acme.co"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
            <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as RoleType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={Role.ADMIN}>Admin</SelectItem>
                <SelectItem value={Role.EDITOR}>Editor</SelectItem>
                <SelectItem value={Role.VIEWER}>Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}>
              {inviting ? 'Inviting...' : 'Send invite'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmActionDialog
        open={!!removeTarget}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
        title="Remove member?"
        description={
          removeTarget
            ? `Remove ${removeTarget.name} from this workspace. They will lose access immediately.`
            : ''
        }
        confirmLabel="Remove member"
        destructive
        onConfirm={confirmRemove}
      />
    </div>
  );
}

function MemberRowMenu({
  canManage,
  onChangeRole,
  onRemove,
}: {
  canManage: boolean;
  onChangeRole: (role: RoleType) => void;
  onRemove: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Member actions">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem disabled={!canManage} onClick={() => onChangeRole(Role.ADMIN)}>
          <UserCog className="h-4 w-4" /> Make admin
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!canManage} onClick={() => onChangeRole(Role.EDITOR)}>
          <UserCog className="h-4 w-4" /> Make editor
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!canManage} onClick={() => onChangeRole(Role.VIEWER)}>
          <UserCog className="h-4 w-4" /> Make viewer
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" disabled={!canManage} onClick={onRemove}>
          <Trash2 className="h-4 w-4" /> Remove from workspace
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
