'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import {
  TypographyH1,
  TypographyH3,
  TypographyMuted,
  TypographySmall,
} from '@/components/ui/typography';
import { Separator } from '@/components/ui/separator';
import { Item, ItemContent, ItemTitle, ItemDescription } from '@/components/ui/item';
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
import { formatDuration } from 'date-fns';
import {
  ConnectorConfigDialog,
  CONNECTOR_DEFINITIONS,
  getConnectorStatus,
  type ConnectorDefinition,
} from '@/components/connectors/connector-config-dialog';

function formatAvgRuntime(ms: number): string {
  if (ms <= 0) return '0s';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const totalSeconds = ms / 1000;
  if (totalSeconds < 60) return `${totalSeconds.toFixed(1)}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
}

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
  const router = useRouter();
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

  const activeConnectors = CONNECTOR_DEFINITIONS;

  const [selectedConnector, setSelectedConnector] = useState<ConnectorDefinition | null>(null);
  const [isConnectorDialogOpen, setIsConnectorDialogOpen] = useState(false);

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <TypographyH1>Dashboard</TypographyH1>
          <TypographyMuted className="mt-1.5">
            Real-time workflow performance, reliability, and usage intelligence.
          </TypographyMuted>
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
            <TypographyH3 className="text-3xl font-bold tabular-nums">
              {stats?.total ?? 0}
            </TypographyH3>
            <TypographySmall className="mt-1">Across all workflows</TypographySmall>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <TypographyH3 className="text-3xl font-bold tabular-nums">
              {stats?.successRate ?? 0}%
            </TypographyH3>
            <TypographySmall className="mt-1">Stable workflow reliability</TypographySmall>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Avg Runtime</CardTitle>
          </CardHeader>
          <CardContent>
            <TypographyH3 className="text-3xl font-bold tabular-nums">
              {formatAvgRuntime(stats?.avgDurationMs ?? 0)}
            </TypographyH3>
            <TypographySmall className="mt-1">Mean completion time</TypographySmall>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Estimated Time Saved</CardTitle>
          </CardHeader>
          <CardContent>
            <TypographyH3 className="text-3xl font-bold tabular-nums">
              {timeSavedHours}h
            </TypographyH3>
            <TypographySmall className="mt-1">Manual effort avoided this month</TypographySmall>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <ExecutionTimelineChart data={timeline} />

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Execution Status Mix</CardTitle>
            <TypographySmall>Current distribution snapshot</TypographySmall>
          </CardHeader>
          <CardContent>{stats ? <ExecutionStatusChart stats={stats} /> : null}</CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Workflow Performance</CardTitle>
            <TypographySmall>Top workflows by execution volume</TypographySmall>
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
                  <button
                    key={execution.id}
                    type="button"
                    onClick={() => router.push(`/executions/${execution.id}`)}
                    className="w-full cursor-pointer rounded-md bg-surface-container-high p-3 text-left transition-colors hover:bg-accent"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <AlertTriangle className="h-4 w-4" />
                        Execution failed
                      </div>
                      <Badge variant="destructive">Failed</Badge>
                    </div>
                    <TypographySmall className="mt-1">Run ID: {execution.id}</TypographySmall>
                  </button>
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
                {activeConnectors.map((connector) => {
                  const status = getConnectorStatus(connector.type);
                  return (
                    <button
                      key={connector.name}
                      onClick={() => {
                        setSelectedConnector(connector);
                        setIsConnectorDialogOpen(true);
                      }}
                      className="rounded-md bg-surface-container-high p-3 text-left hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${status === 'connected' ? 'bg-green-500' : connector.color}`}
                        />
                        {connector.name}
                      </div>
                      <TypographySmall className="mt-1">
                        {status === 'connected' ? 'Connected' : 'Not configured'}
                      </TypographySmall>
                    </button>
                  );
                })}
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
              <TypographyMuted>No folders or workflows yet.</TypographyMuted>
            ) : (
              folderUsage.map((folder) => (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() =>
                    folder.id === 'uncategorized'
                      ? router.push('/workflows')
                      : router.push(`/workflows?folderId=${folder.id}`)
                  }
                  className="flex w-full cursor-pointer items-center justify-between rounded-md bg-surface-container-high px-3 py-2 transition-colors hover:bg-accent"
                >
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: folder.color }}
                    />
                    {folder.name}
                  </div>
                  <TypographySmall>{folder.count} workflows</TypographySmall>
                </button>
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

      <ConnectorConfigDialog
        connector={selectedConnector}
        open={isConnectorDialogOpen}
        onOpenChange={setIsConnectorDialogOpen}
      />
    </div>
  );
}
