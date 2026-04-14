'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppDispatch, useAppSelector } from '@/stores/hooks';
import { fetchWorkspaces } from '@/stores/workspace-slice';
import { api } from '@/lib/api-client';
import { getApiErrorMessage } from '@/lib/api-error';
import { ArrowLeft, UserPlus } from 'lucide-react';
import Link from 'next/link';

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
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const members = currentWorkspace?.members || [];

  const handleInvite = async () => {
    if (!currentWorkspace?.id || !email.trim()) return;
    setInviting(true);
    setMessage(null);
    try {
      await api.post(`/workspaces/${currentWorkspace.id}/members`, { email: email.trim(), role });
      setEmail('');
      await dispatch(fetchWorkspaces()).unwrap();
      setMessage({ type: 'success', text: 'Member invited successfully' });
    } catch (err: unknown) {
      setMessage({
        type: 'error',
        text: getApiErrorMessage(err, 'Failed to invite member'),
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
          <h1 className="bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-4xl font-bold tracking-tight text-transparent">
            Members
          </h1>
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
            <select
              className="rounded-xl border border-input bg-background/60 px-4 py-3 text-sm"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="admin">Admin</option>
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
            <Button onClick={handleInvite} disabled={inviting || !email.trim()}>
              {inviting ? 'Inviting...' : 'Invite'}
            </Button>
          </div>
          {message && (
            <p
              className={`text-sm ${message.type === 'error' ? 'text-destructive' : 'text-green-600'}`}
            >
              {message.text}
            </p>
          )}
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
                className="flex items-center justify-between rounded-2xl border border-border/60 p-4"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/70 text-sm font-bold text-primary-foreground">
                    {(member.userId?.name || 'U').charAt(0).toUpperCase()}
                  </div>
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
