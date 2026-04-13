'use client';

import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { useAppDispatch, useAppSelector } from '@/stores/hooks';
import {
  selectCurrentWorkspaceId,
  selectDashboardStatValues,
  selectExecutions,
  selectExecutionLoading,
  selectExecutionStats,
  selectExecutionTimeline,
  selectExecutionWorkflowStats,
  selectWorkflowLoading,
} from '@/stores/selectors';
import { fetchWorkflows } from '@/stores/workflow-slice';
import {
  fetchExecutions,
  fetchExecutionStats,
  fetchExecutionTimeline,
  fetchWorkflowExecutionStats,
} from '@/stores/execution-slice';
import { useExecutionSocket } from '@/hooks/use-execution-socket';
import { formatDate, formatDuration } from '@/lib/utils';
import {
  Activity,
  CheckCircle2,
  Clock,
  GitBranch,
  Zap,
  TrendingUp,
  PieChart as PieChartIcon,
} from 'lucide-react';
import { ExecutionStatusChart } from '@/components/charts/execution-status-chart';
import { ExecutionTimelineChart } from '@/components/charts/execution-timeline-chart';
import { WorkflowPerformanceChart } from '@/components/charts/workflow-performance-chart';

const statusBadge = (status: string) => {
  const variants: Record<string, 'success' | 'destructive' | 'warning' | 'default' | 'secondary'> =
    {
      completed: 'success',
      failed: 'destructive',
      running: 'warning',
      pending: 'secondary',
      cancelled: 'default',
    };
  return (
    <Badge
      variant={variants[status] || 'default'}
      className={status === 'running' ? 'pulse-soft' : ''}
    >
      {status === 'running' && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-warning opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-warning" />
        </span>
      )}
      {status}
    </Badge>
  );
};

const STATS = [
  {
    key: 'workflows',
    label: 'Total Workflows',
    icon: GitBranch,
    accent: 'text-info',
    bg: 'from-info/10 to-info/5',
  },
  {
    key: 'executions',
    label: 'Total Executions',
    icon: Activity,
    accent: 'text-primary',
    bg: 'from-primary/10 to-primary/5',
  },
  {
    key: 'success',
    label: 'Success Rate',
    icon: CheckCircle2,
    accent: 'text-success',
    bg: 'from-success/10 to-success/5',
  },
  {
    key: 'duration',
    label: 'Avg Duration',
    icon: Clock,
    accent: 'text-warning',
    bg: 'from-warning/10 to-warning/5',
  },
] as const;

export default function DashboardPage() {
  const dispatch = useAppDispatch();
  const currentWorkspaceId = useAppSelector(selectCurrentWorkspaceId);
  const workflowsLoading = useAppSelector(selectWorkflowLoading);
  const executionsLoading = useAppSelector(selectExecutionLoading);
  const dashboardStats = useAppSelector(selectDashboardStatValues);
  const executions = useAppSelector(selectExecutions);
  const stats = useAppSelector(selectExecutionStats);
  const timeline = useAppSelector(selectExecutionTimeline);
  const workflowStats = useAppSelector(selectExecutionWorkflowStats);

  useExecutionSocket(currentWorkspaceId ?? undefined);

  useEffect(() => {
    if (!currentWorkspaceId) return;
    dispatch(fetchWorkflows({ workspaceId: currentWorkspaceId }));
    dispatch(fetchExecutions({ workspaceId: currentWorkspaceId, params: { limit: '5' } }));
    dispatch(fetchExecutionStats({ workspaceId: currentWorkspaceId }));
    dispatch(fetchExecutionTimeline({ workspaceId: currentWorkspaceId, days: 14 }));
    dispatch(fetchWorkflowExecutionStats({ workspaceId: currentWorkspaceId }));
  }, [currentWorkspaceId, dispatch]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="stagger-fade-in" style={{ animationDelay: '0ms' }}>
        <h1 className="bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-4xl font-bold tracking-tight text-transparent">
          Dashboard
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Overview of your workflow activity</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((stat, i) => {
          const Icon = stat.icon;
          const data =
            stat.key === 'workflows'
              ? {
                  value: dashboardStats.workflowCount,
                  display: <AnimatedNumber value={dashboardStats.workflowCount} />,
                }
              : stat.key === 'executions'
                ? {
                    value: dashboardStats.totalExecutions,
                    display: <AnimatedNumber value={dashboardStats.totalExecutions} />,
                  }
                : stat.key === 'success'
                  ? {
                      value: dashboardStats.successRate,
                      display: <AnimatedNumber value={dashboardStats.successRate} suffix="%" />,
                    }
                  : {
                      value: dashboardStats.avgDurationMs,
                      display: dashboardStats.avgDurationMs
                        ? formatDuration(dashboardStats.avgDurationMs)
                        : '—',
                    };
          return (
            <Card
              key={stat.key}
              className="stagger-fade-in group relative overflow-hidden"
              style={{ animationDelay: `${80 + i * 80}ms` }}
            >
              {/* Gradient blob accent */}
              <div
                className={`absolute -right-8 -top-8 h-24 w-24 rounded-full bg-gradient-to-br ${stat.bg} blur-2xl transition-all duration-500 group-hover:scale-125`}
              />
              <CardHeader className="relative flex flex-row items-center justify-between pb-2">
                <CardTitle className="label-uppercase text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl bg-background/60 backdrop-blur ${stat.accent} ring-1 ring-border/60 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}
                >
                  <Icon className="h-4 w-4" strokeWidth={2.5} />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-3xl font-bold tabular-nums tracking-tight">
                  {executionsLoading || workflowsLoading ? (
                    <Skeleton className="h-9 w-20" />
                  ) : (
                    data.display
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Execution Trend</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="mb-2 text-xs text-muted-foreground">Last 14 days</p>
            <ExecutionTimelineChart data={timeline} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Status Breakdown</CardTitle>
            <PieChartIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="mb-2 text-xs text-muted-foreground">All-time distribution</p>
            {stats ? (
              <ExecutionStatusChart stats={stats} />
            ) : (
              <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
                Loading…
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Workflow Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Top Workflows</CardTitle>
          <p className="text-xs text-muted-foreground">Most active workflows by execution count</p>
        </CardHeader>
        <CardContent>
          <WorkflowPerformanceChart data={workflowStats} />
        </CardContent>
      </Card>

      {/* Recent Executions */}
      <Card className="stagger-fade-in" noHover style={{ animationDelay: '420ms' }}>
        <CardHeader>
          <CardTitle className="text-lg">Recent Executions</CardTitle>
          <p className="text-xs text-muted-foreground">Latest 5 runs across your workflows</p>
        </CardHeader>
        <CardContent>
          {executionsLoading ? (
            <div className="space-y-3">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : executions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 ring-1 ring-border/60">
                <Zap className="h-7 w-7 text-primary" strokeWidth={2} />
              </div>
              <p className="text-sm font-medium">No executions yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Create and run a workflow to see results here.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {executions.map((execution: any, i) => (
                <div
                  key={execution.id || execution._id}
                  style={{ animationDelay: `${500 + i * 60}ms` }}
                  className="stagger-fade-in group flex items-center justify-between rounded-xl border border-border/50 bg-background/40 p-3.5 transition-all duration-200 ease-spring hover:-translate-y-0.5 hover:border-border hover:bg-background/80 hover:shadow-soft"
                >
                  <div className="flex items-center gap-3">
                    {statusBadge(execution.status)}
                    <div>
                      <p className="text-sm font-semibold">
                        {execution.workflowId?.name || 'Workflow'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {execution.trigger?.type} trigger
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium tabular-nums">
                      {execution.durationMs ? formatDuration(execution.durationMs) : '—'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(execution.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
