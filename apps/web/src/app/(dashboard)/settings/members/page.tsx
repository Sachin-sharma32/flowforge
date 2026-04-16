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
import { useAppDispatch, useAppSelector } from '@/stores/hooks';
import { fetchWorkspaces } from '@/stores/workspace-slice';
import { api } from '@/lib/api-client';
import { getApiErrorMessage } from '@/lib/api-error';
import { ArrowLeft, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

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

  const handleInvite = async () => {
    if (!currentWorkspace?.id || !email.trim()) return;
    setInviting(true);
    try {
      await api.post(`/workspaces/${currentWorkspace.id}/members`, { email: email.trim(), role });
      setEmail('');
      await dispatch(fetchWorkspaces()).unwrap();
      toast.success('Member invited', {
        description: `${email.trim()} was invited to the workspace.`,
      });
    } catch (err: unknown) {
      toast.error('Failed to invite member', {
        description: getApiErrorMessage(err, 'Failed to invite member'),
      });
    } finally {
      setInviting(false);
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
          <h1 className="text-4xl font-bold tracking-tight">Members</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Manage workspace members and roles</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserPlus className="h-5 w-5" /> Invite Member
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Input
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1"
            />
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="w-[140px]">
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
            {members.map((member: any) => (
              <div
                key={member.userId?._id || member.userId}
                className="flex items-center justify-between rounded-lg border border-border p-4"
              >
                <div className="flex items-center gap-4">
                  <AvatarWithStatus name={member.userId?.name || 'User'} status="online" />
                  <div>
                    <p className="text-sm font-medium">{member.userId?.name || 'User'}</p>
                    <p className="text-xs text-muted-foreground">{member.userId?.email || ''}</p>
                  </div>
                </div>
                <Badge variant={roleColors[member.role] || 'default'}>{member.role}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
