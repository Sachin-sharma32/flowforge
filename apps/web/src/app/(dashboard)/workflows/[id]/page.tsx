'use client';

import { useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppDispatch, useAppSelector } from '@/stores/hooks';
import {
  fetchWorkflow,
  activateWorkflow,
  pauseWorkflow,
  duplicateWorkflow,
  executeWorkflow,
} from '@/stores/workflow-slice';
import { fetchExecutions } from '@/stores/execution-slice';
import { formatDate, formatDuration } from '@/lib/utils';
import { ArrowLeft, Edit, Play, Pause, Copy } from 'lucide-react';
import { ExecutionTimelineChart } from '@/components/charts/execution-timeline-chart';
import type { IExecutionTimelinePoint } from '@flowforge/shared';

export default function WorkflowDetailPage() {
  const params = useParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const workflowId = params.id as string;
  const { currentWorkspace } = useAppSelector((state) => state.workspace);
  const { currentWorkflow, isLoading } = useAppSelector((state) => state.workflow);
  const { executions } = useAppSelector((state) => state.execution);

  useEffect(() => {
    if (currentWorkspace?.id && workflowId) {
      dispatch(fetchWorkflow({ workspaceId: currentWorkspace.id, workflowId }));
      dispatch(
        fetchExecutions({ workspaceId: currentWorkspace.id, params: { workflowId, limit: '50' } }),
      );
    }
  }, [currentWorkspace?.id, workflowId, dispatch]);

  // Build a 14-day timeline + summary stats from this workflow's executions
  const { workflowTimeline, workflowSummary } = useMemo(() => {
    const days = 14;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const buckets = new Map<string, { total: number; completed: number; failed: number }>();
    for (let i = 0; i <= days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      buckets.set(d.toISOString().split('T')[0], { total: 0, completed: 0, failed: 0 });
    }

    let total = 0;
    let completed = 0;
    let failed = 0;
    let durationSum = 0;
    let durationCount = 0;

    for (const ex of executions) {
      total += 1;
      if (ex.status === 'completed') completed += 1;
      if (ex.status === 'failed') failed += 1;
      if (typeof ex.durationMs === 'number') {
        durationSum += ex.durationMs;
        durationCount += 1;
      }
      if (!ex.createdAt) continue;
      const key = new Date(ex.createdAt).toISOString().split('T')[0];
      const bucket = buckets.get(key);
      if (!bucket) continue;
      bucket.total += 1;
      if (ex.status === 'completed') bucket.completed += 1;
      if (ex.status === 'failed') bucket.failed += 1;
    }

    const timeline: IExecutionTimelinePoint[] = Array.from(buckets.entries()).map(([date, v]) => ({
      date,
      ...v,
    }));

    return {
      workflowTimeline: timeline,
      workflowSummary: {
        total,
        completed,
        failed,
        successRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        avgDurationMs: durationCount > 0 ? Math.round(durationSum / durationCount) : 0,
      },
    };
  }, [executions]);

  if (isLoading || !currentWorkflow) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const handleExecute = async () => {
    if (!currentWorkspace?.id) return;
    const result = await dispatch(
      executeWorkflow({ workspaceId: currentWorkspace.id, workflowId }),
    );
    if (executeWorkflow.fulfilled.match(result)) {
      router.push(`/executions/${result.payload}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/workflows')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{currentWorkflow.name}</h1>
            <Badge
              variant={
                currentWorkflow.status === 'active'
                  ? 'success'
                  : currentWorkflow.status === 'paused'
                    ? 'warning'
                    : 'secondary'
              }
            >
              {currentWorkflow.status}
            </Badge>
          </div>
          <p className="text-muted-foreground">{currentWorkflow.description || 'No description'}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() =>
              currentWorkspace &&
              dispatch(duplicateWorkflow({ workspaceId: currentWorkspace.id, workflowId }))
            }
          >
            <Copy className="mr-2 h-4 w-4" /> Duplicate
          </Button>
          {currentWorkflow.status === 'active' ? (
            <Button
              variant="outline"
              onClick={() =>
                currentWorkspace &&
                dispatch(pauseWorkflow({ workspaceId: currentWorkspace.id, workflowId }))
              }
            >
              <Pause className="mr-2 h-4 w-4" /> Pause
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() =>
                currentWorkspace &&
                dispatch(activateWorkflow({ workspaceId: currentWorkspace.id, workflowId }))
              }
            >
              <Play className="mr-2 h-4 w-4" /> Activate
            </Button>
          )}
          <Button onClick={() => router.push(`/workflows/${workflowId}/edit`)}>
            <Edit className="mr-2 h-4 w-4" /> Edit
          </Button>
          <Button onClick={handleExecute}>
            <Play className="mr-2 h-4 w-4" /> Run Now
          </Button>
        </div>
      </div>

      {/* Execution Stats Row */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Runs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workflowSummary.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workflowSummary.successRate}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{workflowSummary.failed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Duration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {workflowSummary.avgDurationMs > 0
                ? formatDuration(workflowSummary.avgDurationMs)
                : '—'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Execution History Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Execution History</CardTitle>
          <p className="text-xs text-muted-foreground">Last 14 days of runs for this workflow</p>
        </CardHeader>
        <CardContent>
          <ExecutionTimelineChart data={workflowTimeline} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Trigger</span>
              <span className="font-medium">{currentWorkflow.trigger.type}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Steps</span>
              <span className="font-medium">{currentWorkflow.steps.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Version</span>
              <span className="font-medium">v{currentWorkflow.version}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Created</span>
              <span>{formatDate(currentWorkflow.createdAt)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Updated</span>
              <span>{formatDate(currentWorkflow.updatedAt)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Steps</CardTitle>
          </CardHeader>
          <CardContent>
            {currentWorkflow.steps.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No steps defined. Open the editor to add steps.
              </p>
            ) : (
              <div className="space-y-2">
                {currentWorkflow.steps.map((step, i) => (
                  <div key={step.id} className="flex items-center gap-3 rounded-lg border p-2.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{step.name}</p>
                      <p className="text-xs text-muted-foreground">{step.type.replace('_', ' ')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
