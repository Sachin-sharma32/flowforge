'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarRange,
  CheckCircle2,
  FolderKanban,
  Link2,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAppDispatch, useAppSelector } from '@/stores/hooks';
import {
  selectCurrentWorkspaceId,
  selectExecutionStats,
  selectExecutionTimeline,
  selectExecutionWorkflowStats,
  selectExecutions,
  selectFolders,
  selectWorkflows,
} from '@/stores/selectors';
import {
  fetchExecutionStats,
  fetchExecutionTimeline,
  fetchExecutions,
  fetchWorkflowExecutionStats,
} from '@/stores/execution-slice';
import { fetchWorkflows } from '@/stores/workflow-slice';
import { fetchFolders } from '@/stores/folder-slice';
import { ExecutionTimelineChart } from '@/components/charts/execution-timeline-chart';
import { WorkflowPerformanceChart } from '@/components/charts/workflow-performance-chart';
import { ExecutionStatusChart } from '@/components/charts/execution-status-chart';
import {
  DateTimeRangePicker,
  type DateTimeRangeValue,
} from '@/components/ui/date-time-range-picker';
import { formatDuration, intervalToDuration } from 'date-fns';

function diffDays(from: string, to: string): number {
  const fromDate = new Date(from);
  const toDate = new Date(to);
  const diff = toDate.getTime() - fromDate.getTime();
  if (!Number.isFinite(diff) || diff < 0) {
    return 14;
  }
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export default function DashboardPage() {
  const dispatch = useAppDispatch();
  const workspaceId = useAppSelector(selectCurrentWorkspaceId);

  const stats = useAppSelector(selectExecutionStats);
  const timeline = useAppSelector(selectExecutionTimeline);
  const workflowStats = useAppSelector(selectExecutionWorkflowStats);
  const workflows = useAppSelector(selectWorkflows);
  const executions = useAppSelector(selectExecutions);
  const folders = useAppSelector(selectFolders);

  const [timeRange, setTimeRange] = useState<DateTimeRangeValue>(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 29);
    from.setHours(0, 0, 0, 0);
    return { from, to };
  });

  const timelineDays = useMemo(() => {
    if (!timeRange.from || !timeRange.to) return 30;
    return diffDays(timeRange.from.toISOString(), timeRange.to.toISOString());
  }, [timeRange.from, timeRange.to]);

  useEffect(() => {
    if (!workspaceId) return;

    dispatch(fetchExecutionStats({ workspaceId }));
    dispatch(fetchWorkflowExecutionStats({ workspaceId }));
    dispatch(fetchWorkflows({ workspaceId, params: { limit: '100', sortBy: 'updatedAt' } }));
    dispatch(
      fetchExecutions({
        workspaceId,
        params: {
          limit: '100',
          sortBy: 'createdAt',
          sortOrder: 'desc',
        },
      }),
    );
    dispatch(fetchFolders({ workspaceId }));
  }, [workspaceId, dispatch]);

  useEffect(() => {
    if (!workspaceId) return;
    dispatch(fetchExecutionTimeline({ workspaceId, days: timelineDays }));
  }, [workspaceId, timelineDays, dispatch]);

  const timeSavedHours = useMemo(() => {
    const totalExecutions = stats?.total || 0;
    const avgDuration = stats?.avgDurationMs || 0;

    const baselineManualMinutes = 4;
    const automatedMinutes = avgDuration / (1000 * 60);
    const savedMinutesPerRun = Math.max(0, baselineManualMinutes - automatedMinutes);

    return Math.round((savedMinutesPerRun * totalExecutions) / 60);
  }, [stats]);

  const folderUsage = useMemo(() => {
    const counts = new Map<string, number>();
    for (const workflow of workflows) {
      const folderId = workflow.folderId || 'uncategorized';
      counts.set(folderId, (counts.get(folderId) || 0) + 1);
    }

    const rows = folders.map((folder) => ({
      id: folder.id,
      name: folder.name,
      count: counts.get(folder.id) || 0,
      color: folder.color,
    }));

    const uncategorizedCount = counts.get('uncategorized') || 0;
    if (uncategorizedCount > 0) {
      rows.push({
        id: 'uncategorized',
        name: 'Uncategorized',
        count: uncategorizedCount,
        color: '#6b7280',
      });
    }

    return rows.sort((a, b) => b.count - a.count).slice(0, 6);
  }, [workflows, folders]);

  const failedAlerts = useMemo(
    () => executions.filter((execution) => execution.status === 'failed').slice(0, 5),
    [executions],
  );

  const activeConnectors = [
    { name: 'Google Calendar', status: 'Connected', color: 'bg-primary' },
    { name: 'Slack', status: 'Connected', color: 'bg-primary-container' },
    { name: 'Notion', status: 'Connected', color: 'bg-on-surface-variant' },
    { name: 'Gmail', status: 'Connected', color: 'bg-secondary' },
    { name: 'Google Drive', status: 'Connected', color: 'bg-tertiary' },
    { name: 'Webhook', status: 'Connected', color: 'bg-muted-foreground' },
  ];

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Real-time workflow performance, reliability, and usage intelligence.
          </p>
        </div>

        <div className="rounded-xl bg-surface-container-low p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            <CalendarRange className="h-3.5 w-3.5" />
            Time Window
          </div>
          <DateTimeRangePicker value={timeRange} onChange={setTimeRange} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total Executions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">{stats?.total ?? 0}</p>
            <p className="mt-1 text-xs text-muted-foreground">Across all workflows</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">{stats?.successRate ?? 0}%</p>
            <p className="mt-1 text-xs text-muted-foreground">Stable workflow reliability</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Avg Runtime</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {formatDuration(intervalToDuration({ start: 0, end: stats?.avgDurationMs ?? 0 }))}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Mean completion time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Estimated Time Saved</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">{timeSavedHours}h</p>
            <p className="mt-1 text-xs text-muted-foreground">Manual effort avoided this month</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Execution Volume</CardTitle>
            <p className="text-xs text-muted-foreground">Completed vs failed over time</p>
          </CardHeader>
          <CardContent>
            <ExecutionTimelineChart data={timeline} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Execution Status Mix</CardTitle>
            <p className="text-xs text-muted-foreground">Current distribution snapshot</p>
          </CardHeader>
          <CardContent>{stats ? <ExecutionStatusChart stats={stats} /> : null}</CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Workflow Performance</CardTitle>
            <p className="text-xs text-muted-foreground">Top workflows by execution volume</p>
          </CardHeader>
          <CardContent>
            <WorkflowPerformanceChart data={workflowStats} />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Critical Alerts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {failedAlerts.length === 0 ? (
                <div className="rounded-md bg-surface-container-high p-3 text-sm text-muted-foreground">
                  No failed executions in the latest runs.
                </div>
              ) : (
                failedAlerts.map((execution) => (
                  <div key={execution.id} className="rounded-md bg-surface-container-high p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <AlertTriangle className="h-4 w-4" />
                        Execution failed
                      </div>
                      <Badge variant="destructive">Failed</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">Run ID: {execution.id}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Active Connectors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {activeConnectors.map((connector) => (
                  <div key={connector.name} className="rounded-md bg-surface-container-high p-3">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <span className={`h-2.5 w-2.5 rounded-full ${connector.color}`} />
                      {connector.name}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{connector.status}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Usage By Folder</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {folderUsage.length === 0 ? (
              <p className="text-sm text-muted-foreground">No folders or workflows yet.</p>
            ) : (
              folderUsage.map((folder) => (
                <div
                  key={folder.id}
                  className="flex items-center justify-between rounded-md bg-surface-container-high px-3 py-2"
                >
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: folder.color }}
                    />
                    {folder.name}
                  </div>
                  <p className="text-xs text-muted-foreground">{folder.count} workflows</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Operational Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-md bg-surface-container-high px-3 py-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary-container" />
                Folder coverage
              </div>
              <span className="text-muted-foreground">
                {workflows.filter((workflow) => !!workflow.folderId).length}/{workflows.length}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-md bg-surface-container-high px-3 py-2">
              <div className="flex items-center gap-2">
                <FolderKanban className="h-4 w-4 text-primary" />
                Total folders
              </div>
              <span className="text-muted-foreground">{folders.length}</span>
            </div>
            <div className="flex items-center justify-between rounded-md bg-surface-container-high px-3 py-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-on-surface-variant" />
                Running executions
              </div>
              <span className="text-muted-foreground">{stats?.running ?? 0}</span>
            </div>
            <div className="flex items-center justify-between rounded-md bg-surface-container-high px-3 py-2">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-on-surface-variant" />
                Connected integrations
              </div>
              <span className="text-muted-foreground">{activeConnectors.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
