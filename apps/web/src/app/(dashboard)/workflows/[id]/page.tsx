'use client';

import { useEffect } from 'react';
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
import {
  TypographyH1,
  TypographyH3,
  TypographyMuted,
  TypographySmall,
} from '@/components/ui/typography';
import { Empty, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { ArrowLeft, Edit, Play, Pause, Copy } from 'lucide-react';
import { formatDuration, intervalToDuration } from 'date-fns';
import { toast } from 'sonner';

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
    const result = await dispatch(executeWorkflow({ workspaceId: currentWorkspaceId, workflowId }));
    if (executeWorkflow.fulfilled.match(result)) {
      toast.success('Execution queued', {
        description: 'Workflow execution started successfully.',
      });
      router.push(`/executions/${result.payload}`);
      return;
    }

    toast.error('Failed to run workflow', {
      description:
        (typeof result.payload === 'string' && result.payload) ||
        'Failed to run workflow. Please try again.',
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/workflows')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <TypographyH1>{currentWorkflow.name}</TypographyH1>
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
          <TypographyMuted className="mt-1">
            {currentWorkflow.description || 'No description'}
          </TypographyMuted>
        </div>
        <div className="flex gap-3">
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

      {/* Execution Stats Row */}
      <div className="grid gap-6 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Runs</CardTitle>
          </CardHeader>
          <CardContent>
            <TypographyH3 className="text-2xl font-bold">
              {workflowExecutionAnalytics.summary.total}
            </TypographyH3>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TypographyH3 className="text-2xl font-bold">
              {workflowExecutionAnalytics.summary.successRate}%
            </TypographyH3>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <TypographyH3 className="text-2xl font-bold text-destructive">
              {workflowExecutionAnalytics.summary.failed}
            </TypographyH3>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Duration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TypographyH3 className="text-2xl font-bold">
              {workflowExecutionAnalytics.summary.avgDurationMs > 0
                ? formatDuration(
                    intervalToDuration({
                      start: 0,
                      end: workflowExecutionAnalytics.summary.avgDurationMs,
                    }),
                  )
                : '—'}
            </TypographyH3>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
              {/* <span>{formatDate(currentWorkflow.createdAt)}</span> */}
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Updated</span>
              {/* <span>{formatDate(currentWorkflow.updatedAt)}</span> */}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Steps</CardTitle>
          </CardHeader>
          <CardContent>
            {currentWorkflow.steps.length === 0 ? (
              <Empty>
                <EmptyTitle>No steps defined</EmptyTitle>
                <EmptyDescription>Open the editor to add steps.</EmptyDescription>
              </Empty>
            ) : (
              <div className="space-y-2">
                {currentWorkflow.steps.map((step, i) => (
                  <div
                    key={step.id}
                    className="flex items-center gap-4 rounded-lg border border-border p-3.5"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                      {i + 1}
                    </span>
                    <div>
                      <TypographyMuted className="text-sm font-medium text-foreground">
                        {step.name}
                      </TypographyMuted>
                      <TypographySmall>{step.type.replace('_', ' ')}</TypographySmall>
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
