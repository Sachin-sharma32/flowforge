'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AvatarWithStatus } from '@/components/ui/avatar-with-status';
import { TypographyH1, TypographyMuted, TypographySmall } from '@/components/ui/typography';
import { useAppDispatch, useAppSelector } from '@/stores/hooks';
import { fetchWorkspaces } from '@/stores/workspace-slice';
import { api } from '@/lib/api-client';
import { getApiErrorMessage } from '@/lib/api-error';
import { ArrowLeft, UserPlus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ConfirmActionDialog } from '@/components/ui/confirm-action-dialog';

const roleColors: Record<string, 'default' | 'success' | 'warning' | 'secondary'> = {
  owner: 'default',
  admin: 'success',
  editor: 'warning',
  viewer: 'secondary',
};

export default function MembersPage() {
  const dispatch = useAppDispatch();
  const { currentWorkspace } = useAppSelector((state) => state.workspace);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('editor');
  const [inviting, setInviting] = useState(false);

  const members = currentWorkspace?.members || [];

  const [removeTarget, setRemoveTarget] = useState<{ userId: string; name: string } | null>(null);

  const handleInvite = async () => {
    if (!currentWorkspace?.id || !email.trim()) return;
    setInviting(true);
    try {
      await api.post(`/workspaces/${currentWorkspace.id}/members`, { email: email.trim(), role });
      setEmail('');
      toast.success('Invitation sent', {
        description: `An invitation email has been sent to ${email.trim()}.`,
      });
    } catch (err: unknown) {
      toast.error('Failed to invite member', {
        description: getApiErrorMessage(err, 'Failed to invite member'),
      });
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!currentWorkspace?.id) return;
    try {
      await api.patch(`/workspaces/${currentWorkspace.id}/members/${userId}`, { role: newRole });
      await dispatch(fetchWorkspaces()).unwrap();
      toast.success('Role updated');
    } catch (err: unknown) {
      toast.error('Failed to update role', {
        description: getApiErrorMessage(err, 'Failed to update role'),
      });
    }
  };

  const handleRemove = async (userId: string, name: string) => {
    if (!currentWorkspace?.id) return;
    setRemoveTarget({ userId, name });
  };

  const confirmRemove = async () => {
    if (!currentWorkspace?.id || !removeTarget) return;
    try {
      await api.delete(`/workspaces/${currentWorkspace.id}/members/${removeTarget.userId}`);
      await dispatch(fetchWorkspaces()).unwrap();
      toast.success('Member removed');
    } catch (err: unknown) {
      toast.error('Failed to remove member', {
        description: getApiErrorMessage(err, 'Failed to remove member'),
      });
    } finally {
      setRemoveTarget(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex items-center gap-4">
        <Link href="/settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <TypographyH1>Members</TypographyH1>
          <TypographyMuted className="mt-1.5">Manage workspace members and roles</TypographyMuted>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserPlus className="h-5 w-5" /> Invite Member
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
            <Input
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1"
            />
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="w-full sm:w-35">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleInvite} disabled={inviting || !email.trim()}>
              {inviting ? 'Inviting...' : 'Invite'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Current Members ({members.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {members.map((member: any) => {
              const userId = member.userId?._id || member.userId;
              const isOwner = member.role === 'owner';
              return (
                <div
                  key={userId}
                  className="flex items-center justify-between rounded-lg border border-border p-4"
                >
                  <div className="flex items-center gap-4">
                    <AvatarWithStatus name={member.userId?.name || 'User'} status="online" />
                    <div>
                      <TypographySmall className="text-sm font-medium">
                        {member.userId?.name || 'User'}
                      </TypographySmall>
                      <TypographyMuted className="text-xs">
                        {member.userId?.email || ''}
                      </TypographyMuted>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isOwner ? (
                      <Badge variant={roleColors[member.role] || 'default'}>{member.role}</Badge>
                    ) : (
                      <>
                        <Select
                          value={member.role}
                          onValueChange={(value) => handleRoleChange(userId, value)}
                        >
                          <SelectTrigger className="w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="editor">Editor</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleRemove(userId, member.userId?.name || 'User')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <ConfirmActionDialog
        open={!!removeTarget}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
        title="Remove Member"
        description={`Are you sure you want to remove ${removeTarget?.name || 'this member'} from the workspace? They will lose access immediately.`}
        confirmLabel="Remove"
        destructive
        onConfirm={confirmRemove}
      />
    </div>
  );
}
