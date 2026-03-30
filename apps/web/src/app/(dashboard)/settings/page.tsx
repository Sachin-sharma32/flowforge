'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { Settings, Users, CreditCard } from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
  const { currentWorkspace } = useWorkspaceStore();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your workspace settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" /> General
          </CardTitle>
          <CardDescription>Basic workspace configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Workspace Name</label>
            <Input defaultValue={currentWorkspace?.name || ''} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Webhook Secret</label>
            <Input
              defaultValue={currentWorkspace?.settings?.webhookSecret || ''}
              readOnly
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">
              Use this secret to verify incoming webhook requests.
            </p>
          </div>
          <Button>Save Changes</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> Members
          </CardTitle>
          <CardDescription>Manage who has access to this workspace</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/settings/members">
            <Button variant="outline">Manage Members</Button>
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" /> Billing
          </CardTitle>
          <CardDescription>Manage your subscription and usage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-muted p-4">
            <p className="font-medium">Free Plan</p>
            <p className="text-sm text-muted-foreground">1,000 executions / month</p>
            <Button className="mt-3" variant="outline">
              Upgrade to Pro
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
