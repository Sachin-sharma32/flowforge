'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppDispatch, useAppSelector } from '@/stores/hooks';
import { fetchWorkspaces } from '@/stores/workspace-slice';
import { api } from '@/lib/api-client';
import { getApiErrorMessage } from '@/lib/api-error';
import type { IWorkspaceBillingSummary } from '@flowforge/shared';
import { Settings, Users, CreditCard } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useCommandMenuSetting } from '@/hooks/use-command-menu-setting';
import { formatShortcutLabel } from '@/lib/preferences';
import { TypographyH1, TypographyMuted, TypographySmall } from '@/components/ui/typography';
import { Field, FieldLabel } from '@/components/ui/field';
import { Progress } from '@/components/ui/progress';

const SHORTCUT_KEY_OPTIONS = ['Space', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];

function friendlyBillingError(action: 'checkout' | 'portal') {
  return action === 'checkout'
    ? 'We could not open checkout right now. Please try again in a moment or contact support if this keeps happening.'
    : 'We could not open the billing portal right now. Please try again in a moment.';
}

export default function SettingsPage() {
  const dispatch = useAppDispatch();
  const { currentWorkspace } = useAppSelector((state) => state.workspace);
  const [name, setName] = useState(currentWorkspace?.name || '');
  const [saving, setSaving] = useState(false);
  const {
    enabled: commandMenuEnabled,
    shortcut: commandMenuShortcut,
    setEnabled: setCommandMenuEnabled,
    setShortcut: setCommandMenuShortcut,
  } = useCommandMenuSetting();

  const [billingSummary, setBillingSummary] = useState<IWorkspaceBillingSummary | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingAction, setBillingAction] = useState<'checkout' | 'portal' | null>(null);
  const [billingMessage, setBillingMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    setName(currentWorkspace?.name || '');
  }, [currentWorkspace?.name]);

  useEffect(() => {
    let cancelled = false;

    const loadBilling = async () => {
      if (!currentWorkspace?.id) return;

      setBillingLoading(true);
      setBillingMessage(null);

      try {
        const { data } = await api.get(`/workspaces/${currentWorkspace.id}/billing/summary`);
        if (!cancelled) {
          setBillingSummary(data.data as IWorkspaceBillingSummary);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setBillingSummary(null);
          setBillingMessage({
            type: 'error',
            text: getApiErrorMessage(err, 'Failed to load billing summary'),
          });
        }
      } finally {
        if (!cancelled) {
          setBillingLoading(false);
        }
      }
    };

    loadBilling();

    return () => {
      cancelled = true;
    };
  }, [currentWorkspace?.id]);

  useEffect(() => {
    if (!billingMessage) return;
    toast.info(billingMessage.type === 'error' ? 'Billing issue' : 'Billing update', {
      description: billingMessage.text,
    });
  }, [billingMessage, toast]);

  const handleSave = async () => {
    if (!currentWorkspace?.id || !name.trim()) return;
    setSaving(true);
    try {
      await api.patch(`/workspaces/${currentWorkspace.id}`, { name: name.trim() });
      await dispatch(fetchWorkspaces()).unwrap();
      toast.success('Settings saved', {
        description: 'Workspace settings were updated successfully.',
      });
    } catch (err: unknown) {
      toast.error('Failed to save settings', {
        description: getApiErrorMessage(err, 'Failed to save settings'),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCheckout = async () => {
    if (!currentWorkspace?.id) return;
    setBillingAction('checkout');
    setBillingMessage(null);

    try {
      const { data } = await api.post(`/workspaces/${currentWorkspace.id}/billing/checkout`);
      const url = data?.data?.url as string | undefined;
      if (!url) {
        throw new Error('Missing checkout URL');
      }
      window.location.href = url;
    } catch (_err: unknown) {
      toast.error('Checkout failed', {
        description: friendlyBillingError('checkout'),
      });
      setBillingAction(null);
    }
  };

  const handlePortal = async () => {
    if (!currentWorkspace?.id) return;
    setBillingAction('portal');
    setBillingMessage(null);

    try {
      const { data } = await api.post(`/workspaces/${currentWorkspace.id}/billing/portal`);
      const url = data?.data?.url as string | undefined;
      if (!url) {
        throw new Error('Missing portal URL');
      }
      window.location.href = url;
    } catch (_err: unknown) {
      toast.error('Portal unavailable', {
        description: friendlyBillingError('portal'),
      });
      setBillingAction(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <TypographyH1>Settings</TypographyH1>
        <TypographyMuted className="mt-1.5">Manage your workspace settings</TypographyMuted>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" /> General
          </CardTitle>
          <CardDescription>Basic workspace configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Field>
            <FieldLabel>Workspace Name</FieldLabel>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="max-w-md" />
          </Field>
          <Field>
            <FieldLabel>Webhook Secret</FieldLabel>
            <Input
              defaultValue={currentWorkspace?.settings?.webhookSecret || ''}
              readOnly
              className="font-mono text-xs"
            />
            <TypographySmall>Use this secret to verify incoming webhook requests.</TypographySmall>
          </Field>
          <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2">
            <div>
              <TypographyMuted className="text-sm font-medium text-foreground">
                Command Menu Shortcut
              </TypographyMuted>
              <TypographySmall>
                Enable quick navigation and customize the keyboard shortcut.
              </TypographySmall>
            </div>
            <Switch checked={commandMenuEnabled} onCheckedChange={setCommandMenuEnabled} />
          </div>
          <div className="grid gap-3 rounded-md border border-border bg-background p-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <TypographySmall className="font-medium">Modifier</TypographySmall>
              <Select
                value={commandMenuShortcut.modifier}
                onValueChange={(value: 'meta' | 'ctrl' | 'alt') =>
                  setCommandMenuShortcut(value, commandMenuShortcut.key)
                }
                disabled={!commandMenuEnabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="meta">Command (Mac)</SelectItem>
                  <SelectItem value="ctrl">Control</SelectItem>
                  <SelectItem value="alt">Alt (Windows)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <TypographySmall className="font-medium">Key</TypographySmall>
              <Select
                value={commandMenuShortcut.key}
                onValueChange={(value) =>
                  setCommandMenuShortcut(commandMenuShortcut.modifier, value)
                }
                disabled={!commandMenuEnabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SHORTCUT_KEY_OPTIONS.map((keyOption) => (
                    <SelectItem key={keyOption} value={keyOption}>
                      {keyOption}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <TypographySmall className="sm:col-span-2">
              Current shortcut: {formatShortcutLabel(commandMenuShortcut)}
            </TypographySmall>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
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
        <CardContent className="space-y-4">
          {billingLoading && !billingSummary ? (
            <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
              Loading billing summary...
            </div>
          ) : billingSummary ? (
            <div className="space-y-5 rounded-lg border border-border bg-muted/30 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <TypographyMuted>Current Plan</TypographyMuted>
                  <TypographyMuted className="text-lg font-semibold capitalize text-foreground">
                    {billingSummary.plan}
                  </TypographyMuted>
                </div>
                <span className="rounded-full border border-border bg-background px-3 py-1 text-xs uppercase tracking-wide text-muted-foreground">
                  {billingSummary.subscriptionStatus.replace('_', ' ')}
                </span>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span>
                    {billingSummary.usage.used.toLocaleString()} /{' '}
                    {billingSummary.usage.limit.toLocaleString()} executions
                  </span>
                  <span className="text-muted-foreground">{billingSummary.usage.percentUsed}%</span>
                </div>
                <Progress value={billingSummary.usage.percentUsed} className="h-2" />
                <TypographySmall className="mt-2">
                  {billingSummary.usage.remaining.toLocaleString()} remaining in{' '}
                  {billingSummary.usage.periodKey}
                </TypographySmall>
              </div>

              <div className="flex flex-wrap gap-2">
                {billingSummary.canUpgrade ? (
                  <Button onClick={handleCheckout} disabled={billingAction === 'checkout'}>
                    {billingAction === 'checkout' ? 'Opening Checkout...' : 'Upgrade to Pro'}
                  </Button>
                ) : billingSummary.canManagePortal ? (
                  <Button
                    variant="outline"
                    onClick={handlePortal}
                    disabled={billingAction === 'portal'}
                  >
                    {billingAction === 'portal' ? 'Opening Portal...' : 'Manage Billing'}
                  </Button>
                ) : (
                  <TypographyMuted>
                    Billing portal is unavailable for this plan setup.
                  </TypographyMuted>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-destructive/25 bg-destructive/10 p-4 text-sm text-destructive">
              Billing summary unavailable. You may need owner billing permissions.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
