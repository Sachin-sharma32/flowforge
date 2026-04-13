'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppDispatch, useAppSelector } from '@/stores/hooks';
import {
  selectCurrentWorkspaceId,
  selectCurrentWorkflow,
  selectExecutionLoading,
  selectWorkflowExecutionAnalytics,
  selectWorkflowLoading,
} from '@/stores/selectors';
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

export default function WorkflowDetailPage() {
  const params = useParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const workflowId = params.id as string;
  const currentWorkspaceId = useAppSelector(selectCurrentWorkspaceId);
  const currentWorkflow = useAppSelector(selectCurrentWorkflow);
  const workflowLoading = useAppSelector(selectWorkflowLoading);
  const executionLoading = useAppSelector(selectExecutionLoading);
  const workflowExecutionAnalytics = useAppSelector(selectWorkflowExecutionAnalytics);
  const [runMessage, setRunMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(
    null,
  );

  useEffect(() => {
    if (currentWorkspaceId && workflowId) {
      dispatch(fetchWorkflow({ workspaceId: currentWorkspaceId, workflowId }));
      dispatch(
        fetchExecutions({ workspaceId: currentWorkspaceId, params: { workflowId, limit: '50' } }),
      );
    }
  }, [currentWorkspaceId, workflowId, dispatch]);

  if (workflowLoading || executionLoading || !currentWorkflow) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const handleExecute = async () => {
    if (!currentWorkspaceId) return;
    setRunMessage(null);
    const result = await dispatch(executeWorkflow({ workspaceId: currentWorkspaceId, workflowId }));
    if (executeWorkflow.fulfilled.match(result)) {
      setRunMessage({ type: 'success', text: 'Execution queued successfully.' });
      router.push(`/executions/${result.payload}`);
      return;
    }

    setRunMessage({
      type: 'error',
      text:
        (typeof result.payload === 'string' && result.payload) ||
        'Failed to run workflow. Please try again.',
    });
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
              currentWorkspaceId &&
              dispatch(duplicateWorkflow({ workspaceId: currentWorkspaceId, workflowId }))
            }
          >
            <Copy className="mr-2 h-4 w-4" /> Duplicate
          </Button>
          {currentWorkflow.status === 'active' ? (
            <Button
              variant="outline"
              onClick={() =>
                currentWorkspaceId &&
                dispatch(pauseWorkflow({ workspaceId: currentWorkspaceId, workflowId }))
              }
            >
              <Pause className="mr-2 h-4 w-4" /> Pause
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() =>
                currentWorkspaceId &&
                dispatch(activateWorkflow({ workspaceId: currentWorkspaceId, workflowId }))
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

      {runMessage && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            runMessage.type === 'error'
              ? 'border-destructive/30 bg-destructive/10 text-destructive'
              : 'border-success/30 bg-success/10 text-success'
          }`}
        >
          {runMessage.text}
        </div>
      )}

      {/* Execution Stats Row */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Runs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workflowExecutionAnalytics.summary.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {workflowExecutionAnalytics.summary.successRate}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {workflowExecutionAnalytics.summary.failed}
            </div>
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
              {workflowExecutionAnalytics.summary.avgDurationMs > 0
                ? formatDuration(workflowExecutionAnalytics.summary.avgDurationMs)
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
          <ExecutionTimelineChart data={workflowExecutionAnalytics.timeline} />
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
