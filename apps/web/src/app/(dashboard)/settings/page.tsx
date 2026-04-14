'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppDispatch, useAppSelector } from '@/stores/hooks';
import { fetchWorkspaces } from '@/stores/workspace-slice';
import { api } from '@/lib/api-client';
import { getApiErrorMessage } from '@/lib/api-error';
import type { IWorkspaceBillingSummary } from '@flowforge/shared';
import { Settings, Users, CreditCard } from 'lucide-react';
import Link from 'next/link';

export default function SettingsPage() {
  const dispatch = useAppDispatch();
  const { currentWorkspace } = useAppSelector((state) => state.workspace);
  const [name, setName] = useState(currentWorkspace?.name || '');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

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

  const handleSave = async () => {
    if (!currentWorkspace?.id || !name.trim()) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      await api.patch(`/workspaces/${currentWorkspace.id}`, { name: name.trim() });
      await dispatch(fetchWorkspaces()).unwrap();
      setSaveMessage({ type: 'success', text: 'Settings saved successfully' });
    } catch (err: unknown) {
      setSaveMessage({
        type: 'error',
        text: getApiErrorMessage(err, 'Failed to save settings'),
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
    } catch (err: unknown) {
      setBillingMessage({
        type: 'error',
        text: getApiErrorMessage(err, 'Failed to start checkout'),
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
    } catch (err: unknown) {
      setBillingMessage({
        type: 'error',
        text: getApiErrorMessage(err, 'Failed to open billing portal'),
      });
      setBillingAction(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-4xl font-bold tracking-tight text-transparent">
          Settings
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Manage your workspace settings</p>
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
            <Input value={name} onChange={(e) => setName(e.target.value)} className="max-w-md" />
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
          {saveMessage && (
            <p
              className={`text-sm ${saveMessage.type === 'error' ? 'text-destructive' : 'text-green-600'}`}
            >
              {saveMessage.text}
            </p>
          )}
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
            <div className="rounded-lg border border-border/70 bg-muted/40 p-4 text-sm text-muted-foreground">
              Loading billing summary...
            </div>
          ) : billingSummary ? (
            <div className="space-y-5 rounded-2xl border border-border/70 bg-muted/30 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Current Plan</p>
                  <p className="text-lg font-semibold capitalize">{billingSummary.plan}</p>
                </div>
                <span className="rounded-full border border-border/70 bg-background px-3 py-1 text-xs uppercase tracking-wide text-muted-foreground">
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
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-info"
                    style={{ width: `${billingSummary.usage.percentUsed}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {billingSummary.usage.remaining.toLocaleString()} remaining in{' '}
                  {billingSummary.usage.periodKey}
                </p>
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
                  <p className="text-sm text-muted-foreground">
                    Billing portal is unavailable for this plan setup.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-destructive/25 bg-destructive/10 p-4 text-sm text-destructive">
              Billing summary unavailable. You may need owner billing permissions.
            </div>
          )}

          {billingMessage && (
            <p
              className={`text-sm ${billingMessage.type === 'error' ? 'text-destructive' : 'text-green-600'}`}
            >
              {billingMessage.text}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
