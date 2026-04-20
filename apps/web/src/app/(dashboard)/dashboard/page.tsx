'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Circle,
  Diamond,
  Loader2,
  Plus,
  Workflow as WorkflowIcon,
} from 'lucide-react';
import { formatDistanceToNow, formatDistanceToNowStrict } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useAppDispatch, useAppSelector } from '@/stores/hooks';
import {
  selectCurrentWorkspaceId,
  selectDashboardSummary,
  selectExecutions,
  selectTemplates,
  selectWorkflowRecentActivity,
  selectWorkflows,
} from '@/stores/selectors';
import {
  fetchDashboardSummary,
  fetchExecutions,
  fetchWorkflowRecentActivity,
} from '@/stores/execution-slice';
import { fetchTemplates, fetchWorkflows } from '@/stores/workflow-slice';
import { HistogramBars, Sparkline } from '@/components/charts/sparkline';
import type { IExecution, IWorkflowRecentActivity } from '@flowforge/shared';

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(Math.round(value));
}

function formatDuration(ms: number): { value: string; unit: string } {
  if (!ms || ms <= 0) return { value: '0', unit: 'ms' };
  if (ms < 1000) return { value: `${Math.round(ms)}`, unit: 'ms' };
  const seconds = ms / 1000;
  if (seconds < 60) return { value: seconds.toFixed(2), unit: 's' };
  const minutes = seconds / 60;
  return { value: minutes.toFixed(1), unit: 'm' };
}

function formatRelative(date: string | Date | null | undefined): string {
  if (!date) return 'never run';
  try {
    return `${formatDistanceToNowStrict(new Date(date))} ago`;
  } catch {
    return 'never run';
  }
}

function shortRelative(date: string | Date | null | undefined): string {
  if (!date) return '';
  try {
    return formatDistanceToNowStrict(new Date(date), { addSuffix: false })
      .replace('seconds', 's')
      .replace('second', 's')
      .replace('minutes', 'm')
      .replace('minute', 'm')
      .replace('hours', 'h')
      .replace('hour', 'h')
      .replace('days', 'd')
      .replace('day', 'd')
      .replace(/\s+/g, '');
  } catch {
    return '';
  }
}

function greetingForNow(): string {
  const hour = new Date().getHours();
  if (hour < 5) return 'Good evening';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getFirstName(name?: string | null): string {
  if (!name) return 'there';
  const trimmed = name.trim();
  if (!trimmed) return 'there';
  return trimmed.split(/\s+/)[0];
}

function computeDelta(current: number, previous: number): number {
  if (!previous && !current) return 0;
  if (!previous) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

function workflowStatusBadge(status: IWorkflowRecentActivity['status']) {
  switch (status) {
    case 'active':
      return (
        <Badge
          variant="outline"
          className="gap-1.5 border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Active
        </Badge>
      );
    case 'paused':
      return (
        <Badge
          variant="outline"
          className="gap-1.5 border-amber-500/30 bg-amber-500/10 text-amber-400"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          Paused
        </Badge>
      );
    case 'archived':
      return (
        <Badge
          variant="outline"
          className="gap-1.5 border-muted-foreground/30 bg-muted text-muted-foreground"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
          Archived
        </Badge>
      );
    default:
      return (
        <Badge
          variant="outline"
          className="gap-1.5 border-muted-foreground/30 bg-muted text-muted-foreground"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
          Draft
        </Badge>
      );
  }
}

function deriveRunningStepLabel(execution: IExecution): string | null {
  if (!execution.steps || execution.steps.length === 0) return null;
  const runningIndex = execution.steps.findIndex((step) => step.status === 'running');
  if (runningIndex === -1) return null;
  return `Running step ${runningIndex + 1} of ${execution.steps.length}`;
}

function deriveFailedStepLabel(execution: IExecution): string | null {
  if (!execution.steps || execution.steps.length === 0) return null;
  const failed = execution.steps.find((step) => step.status === 'failed');
  if (!failed) return 'Failed at step';
  const index = execution.steps.indexOf(failed);
  return `Failed at step ${index + 1}${failed.error ? ` — ${failed.error.slice(0, 60)}` : ''}`;
}

export default function DashboardPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const workspaceId = useAppSelector(selectCurrentWorkspaceId);
  const user = useAppSelector((state) => state.auth.user);

  const summary = useAppSelector(selectDashboardSummary);
  const workflowActivity = useAppSelector(selectWorkflowRecentActivity);
  const workflows = useAppSelector(selectWorkflows);
  const templates = useAppSelector(selectTemplates);
  const executions = useAppSelector(selectExecutions);

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!workspaceId) return;

    dispatch(fetchDashboardSummary({ workspaceId }));
    dispatch(fetchWorkflowRecentActivity({ workspaceId }));
    dispatch(fetchWorkflows({ workspaceId, params: { limit: '100', sortBy: 'updatedAt' } }));
    dispatch(fetchTemplates({ workspaceId }));
    dispatch(
      fetchExecutions({
        workspaceId,
        params: {
          limit: '20',
          sortBy: 'createdAt',
          sortOrder: 'desc',
        },
      }),
    );

    const interval = setInterval(() => {
      dispatch(fetchDashboardSummary({ workspaceId }));
      dispatch(fetchWorkflowRecentActivity({ workspaceId }));
      dispatch(
        fetchExecutions({
          workspaceId,
          params: {
            limit: '20',
            sortBy: 'createdAt',
            sortOrder: 'desc',
          },
        }),
      );
      setNow(Date.now());
    }, 30_000);

    return () => clearInterval(interval);
  }, [workspaceId, dispatch]);

  useEffect(() => {
    const clockInterval = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(clockInterval);
  }, []);

  const last24h = summary?.last24h;
  const previous24h = summary?.previous24h;
  const weekAgo = summary?.weekAgo;
  const sparklines = summary?.sparklines;

  const executionsDelta = computeDelta(last24h?.total ?? 0, previous24h?.total ?? 0);
  const successRateDeltaPp =
    Math.round(((last24h?.successRate ?? 0) - (weekAgo?.successRate ?? 0)) * 10) / 10;
  const p95Delta = Math.round((last24h?.p95DurationMs ?? 0) - (previous24h?.p95DurationMs ?? 0));
  const failedDelta = (last24h?.failed ?? 0) - (previous24h?.failed ?? 0);

  const activeWorkflowCount = summary?.activeWorkflows ?? 0;
  const pausedOrFailingCount = useMemo(
    () =>
      workflowActivity.filter(
        (workflow) => workflow.status === 'paused' || (workflow.failed > 0 && workflow.total > 0),
      ).length,
    [workflowActivity],
  );

  const visibleWorkflows = useMemo(() => workflowActivity.slice(0, 6), [workflowActivity]);

  const liveExecutions = useMemo(() => executions.slice(0, 8), [executions]);

  const firstName = getFirstName(user?.name);
  const greeting = greetingForNow();

  const totalExecutions24h = last24h?.total ?? 0;
  const successRate24h = last24h?.successRate ?? 0;

  const executionsValue = formatNumber(totalExecutions24h);
  const successRateValue = (successRate24h ?? 0).toFixed(1);
  const p95 = formatDuration(last24h?.p95DurationMs ?? 0);
  const failedCount24h = last24h?.failed ?? 0;

  const templateSuggestions = useMemo(() => templates.slice(0, 3), [templates]);

  const tagline = useMemo(() => {
    if (!summary) return 'Loading your workspace snapshot…';
    if (failedCount24h > 0) {
      return `${activeWorkflowCount} active workflow${activeWorkflowCount === 1 ? '' : 's'} · ${formatNumber(totalExecutions24h)} executions in the last 24h · ${successRate24h.toFixed(1)}% success rate. ${pausedOrFailingCount > 0 ? (pausedOrFailingCount === 1 ? 'One workflow needs your attention.' : `${pausedOrFailingCount} workflows need your attention.`) : 'Everything is healthy.'}`;
    }
    return `${activeWorkflowCount} active workflow${activeWorkflowCount === 1 ? '' : 's'} · ${formatNumber(totalExecutions24h)} executions in the last 24h · ${successRate24h.toFixed(1)}% success rate. ${pausedOrFailingCount > 0 ? `${pausedOrFailingCount === 1 ? 'One workflow needs your attention.' : `${pausedOrFailingCount} workflows need your attention.`}` : 'Everything is running smoothly.'}`;
  }, [
    summary,
    activeWorkflowCount,
    totalExecutions24h,
    successRate24h,
    failedCount24h,
    pausedOrFailingCount,
  ]);

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <h1 className="flex flex-wrap items-baseline gap-x-3 text-3xl font-bold tracking-tight">
            <span>
              {greeting}, {firstName}
            </span>
            <span className="text-muted-foreground">—</span>
            <span className="italic text-[color:var(--color-chart-5,#f97066)] font-serif font-medium">
              things are flowing.
            </span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{tagline}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => router.push('/templates')}>
            <Diamond className="h-4 w-4" />
            Browse templates
          </Button>
          <Button
            size="sm"
            className="bg-[color:var(--color-chart-5,#f97066)] text-background hover:bg-[color:var(--color-chart-5,#f97066)]/90"
            onClick={() => router.push('/workflows/new')}
          >
            <Plus className="h-4 w-4" />
            New workflow
          </Button>
        </div>
      </div>

      <Separator />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Executions · 24h"
          dotColor="bg-emerald-500"
          value={executionsValue}
          unit=""
          sparkData={sparklines?.executions ?? []}
          sparkColor="#10b981"
          delta={
            summary ? (
              <DeltaLine
                positive={executionsDelta >= 0}
                text={`${executionsDelta >= 0 ? '▲' : '▼'} ${Math.abs(executionsDelta).toFixed(1)}% vs yesterday`}
                tone={executionsDelta >= 0 ? 'positive' : 'negative'}
              />
            ) : null
          }
        />

        <KpiCard
          label="Success rate"
          dotColor="bg-sky-500"
          value={successRateValue}
          unit="%"
          sparkData={sparklines?.successRate ?? []}
          sparkColor="#38bdf8"
          delta={
            summary ? (
              <DeltaLine
                positive={successRateDeltaPp >= 0}
                text={`${successRateDeltaPp >= 0 ? '▲' : '▼'} ${Math.abs(successRateDeltaPp).toFixed(1)}pp this week`}
                tone={successRateDeltaPp >= 0 ? 'positive' : 'negative'}
              />
            ) : null
          }
        />

        <KpiCard
          label="P95 duration"
          dotColor="bg-amber-500"
          value={p95.value}
          unit={p95.unit}
          sparkData={sparklines?.p95Duration ?? []}
          sparkColor="#f59e0b"
          delta={
            summary ? (
              <DeltaLine
                positive={p95Delta <= 0}
                text={`${p95Delta <= 0 ? '▼' : '▲'} ${formatNumber(Math.abs(p95Delta))}ms ${p95Delta <= 0 ? 'faster' : 'slower'}`}
                tone={p95Delta <= 0 ? 'positive' : 'negative'}
              />
            ) : null
          }
        />

        <KpiCard
          label="Failed runs · 24h"
          dotColor="bg-rose-500"
          value={formatNumber(failedCount24h)}
          unit=""
          sparkData={sparklines?.failed ?? []}
          sparkColor="#ef4444"
          delta={
            summary ? (
              <DeltaLine
                positive={failedDelta <= 0}
                text={`${failedDelta <= 0 ? '▼' : '▲'} ${failedDelta >= 0 ? '+' : ''}${failedDelta} vs yesterday`}
                tone={failedDelta <= 0 ? 'positive' : 'negative'}
              />
            ) : null
          }
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-2">
              <div className="flex items-center justify-between pb-3">
                <div className="flex items-baseline gap-2">
                  <h2 className="text-base font-semibold">Workflows</h2>
                  <span className="text-xs text-muted-foreground">recently active</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => router.push('/workflows')}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Filter
                  </button>
                  <Button variant="outline" size="xs" onClick={() => router.push('/workflows')}>
                    Open builder
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <Separator />
              <div className="divide-y divide-border/60">
                {visibleWorkflows.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    No workflows yet. Create one to start routing events.
                  </div>
                ) : (
                  visibleWorkflows.map((workflow) => (
                    <button
                      key={workflow.workflowId}
                      type="button"
                      onClick={() => router.push(`/workflows/${workflow.workflowId}`)}
                      className="grid w-full cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto_auto_auto] items-center gap-4 py-3 text-left transition-colors hover:bg-muted/30"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <WorkflowIcon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{workflow.workflowName}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          Last run {formatRelative(workflow.lastExecutedAt)}
                          {workflow.total > 0 ? (
                            <> · {workflow.successRate.toFixed(1)}% success</>
                          ) : (
                            <> · never run</>
                          )}
                        </div>
                      </div>
                      <HistogramBars data={workflow.hourlyBuckets} />
                      {workflow.total === 0 ? (
                        <span className="text-xs text-muted-foreground">No runs yet</span>
                      ) : (
                        <span className="w-4" />
                      )}
                      <div className="flex items-center gap-3">
                        {workflowStatusBadge(workflow.status)}
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </button>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-2">
              <div className="flex items-center justify-between pb-3">
                <h2 className="text-base font-semibold">Start from a template</h2>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => router.push('/templates')}
                  className="text-muted-foreground hover:text-foreground"
                >
                  See all {templates.length > 0 ? templates.length : ''}
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
              <Separator />
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {templateSuggestions.length === 0 ? (
                  <div className="col-span-full py-6 text-center text-sm text-muted-foreground">
                    No templates available yet.
                  </div>
                ) : (
                  templateSuggestions.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => router.push(`/templates/${template.id}`)}
                      className="flex cursor-pointer flex-col gap-2 rounded-lg bg-muted/30 p-3 text-left ring-1 ring-border/50 transition-colors hover:bg-muted"
                    >
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <WorkflowIcon className="h-3.5 w-3.5" />
                        <WorkflowIcon className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <div className="text-sm font-medium">{template.name}</div>
                        <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                          {template.description ||
                            'Drop-in workflow you can activate in one click.'}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="overflow-hidden">
          <CardContent className="pt-2">
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-baseline gap-2">
                <h2 className="text-base font-semibold">Live activity</h2>
                <span className="text-xs text-muted-foreground">real-time</span>
              </div>
              <Badge
                variant="outline"
                className="gap-1.5 border-sky-500/30 bg-sky-500/10 text-sky-400"
              >
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sky-400" />
                Live
              </Badge>
            </div>
            <Separator />
            <div className="mt-2 max-h-[520px] space-y-4 overflow-y-auto pr-1">
              {liveExecutions.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No activity yet. Run a workflow to see it here.
                </div>
              ) : (
                liveExecutions.map((execution) => (
                  <LiveActivityItem key={execution.id} execution={execution} now={now} />
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface KpiCardProps {
  label: string;
  dotColor: string;
  value: string;
  unit: string;
  sparkData: number[];
  sparkColor: string;
  delta: React.ReactNode;
}

function KpiCard({ label, dotColor, value, unit, sparkData, sparkColor, delta }: KpiCardProps) {
  return (
    <Card>
      <CardContent className="pt-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className={`h-2 w-2 rounded-full ${dotColor}`} />
            {label}
          </div>
          <Sparkline data={sparkData} color={sparkColor} showDots width={92} height={26} />
        </div>
        <div className="mt-3 flex items-baseline gap-1">
          <span className="text-3xl font-bold tabular-nums">{value}</span>
          {unit ? <span className="text-sm font-medium text-muted-foreground">{unit}</span> : null}
        </div>
        <div className="mt-2 text-xs">{delta}</div>
      </CardContent>
    </Card>
  );
}

function DeltaLine({
  text,
  tone,
}: {
  text: string;
  positive: boolean;
  tone: 'positive' | 'negative';
}) {
  return <span className={tone === 'positive' ? 'text-emerald-500' : 'text-rose-500'}>{text}</span>;
}

function statusIcon(status: IExecution['status']) {
  if (status === 'running' || status === 'pending') {
    return (
      <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-sky-500">
        <Loader2 className="h-3 w-3 animate-spin text-sky-500" />
      </span>
    );
  }
  if (status === 'completed') {
    return (
      <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500">
        <CheckCircle2 className="h-4 w-4" />
      </span>
    );
  }
  if (status === 'failed') {
    return (
      <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500/20 text-rose-500">
        <AlertCircle className="h-4 w-4" />
      </span>
    );
  }
  return (
    <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-muted text-muted-foreground">
      <Circle className="h-3 w-3" />
    </span>
  );
}

function LiveActivityItem({ execution, now }: { execution: IExecution; now: number }) {
  const workflowName =
    typeof execution.workflowId === 'object' && execution.workflowId !== null
      ? ((execution.workflowId as { name?: string }).name ?? 'Workflow')
      : 'Workflow';

  const runningLabel = deriveRunningStepLabel(execution);
  const failedLabel = deriveFailedStepLabel(execution);

  const headline =
    execution.status === 'completed'
      ? 'Completed in'
      : execution.status === 'failed'
        ? (failedLabel ?? 'Failed')
        : execution.status === 'running'
          ? (runningLabel ?? 'Running')
          : execution.status === 'cancelled'
            ? 'Cancelled'
            : 'Queued';

  const durationText = (() => {
    if (execution.status === 'completed' && typeof execution.durationMs === 'number') {
      const { value, unit } = formatDuration(execution.durationMs);
      return `${value}${unit}`;
    }
    return null;
  })();

  const triggerMeta = (() => {
    if (execution.status === 'running') {
      return renderTriggerMeta(execution);
    }
    if (execution.status === 'completed') {
      return renderTriggerMeta(execution);
    }
    if (execution.status === 'failed') {
      return renderTriggerMeta(execution);
    }
    return renderTriggerMeta(execution);
  })();

  const timeAgo = (() => {
    try {
      return formatDistanceToNow(new Date(execution.createdAt), { addSuffix: false });
    } catch {
      return '';
    }
  })();

  // Using now to silence unused-var lint; re-render when clock ticks.
  void now;

  return (
    <div className="flex items-start gap-3">
      {statusIcon(execution.status)}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">
          {workflowName} <span className="text-muted-foreground">— {headline}</span>
          {durationText ? <span className="ml-1 font-mono text-sm">{durationText}</span> : null}
        </div>
        {triggerMeta ? (
          <div className="mt-0.5 text-xs text-muted-foreground">{triggerMeta}</div>
        ) : null}
        <div className="mt-0.5 text-xs text-muted-foreground">{timeAgo} ago</div>
      </div>
    </div>
  );
}

function renderTriggerMeta(execution: IExecution): string | null {
  const trigger = execution.trigger;
  if (!trigger) return null;
  const payload = trigger.payload ?? {};
  const type = trigger.type;

  if (type === 'manual') {
    return 'trigger: manual';
  }

  const payloadEntries = Object.entries(payload).filter(
    ([, value]) => typeof value === 'string' || typeof value === 'number',
  );

  if (type === 'cron') {
    const schedule = (payload as { schedule?: string }).schedule;
    return schedule ? `scheduled: ${schedule} UTC` : 'trigger: scheduled';
  }

  if (type === 'webhook') {
    const event = (payload as { event?: string }).event;
    if (event) return `event: ${event}`;
  }

  if (payloadEntries.length > 0) {
    const [firstKey, firstValue] = payloadEntries[0];
    return `trigger: ${firstKey}=${String(firstValue).slice(0, 40)}`;
  }

  return `trigger: ${type}`;
}
