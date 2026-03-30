'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExecutionTimeline } from '@/components/execution/execution-timeline';
import { LiveIndicator } from '@/components/execution/live-indicator';
import { useExecutionStore } from '@/stores/execution-store';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { useExecutionSocket } from '@/hooks/use-execution-socket';
import { formatDate, formatDuration } from '@/lib/utils';
import { ArrowLeft, XCircle } from 'lucide-react';

export default function ExecutionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const executionId = params.id as string;
  const { currentWorkspace } = useWorkspaceStore();
  const { currentExecution, fetchExecution, cancelExecution, isLoading } = useExecutionStore();

  useExecutionSocket(currentWorkspace?.id);

  useEffect(() => {
    if (currentWorkspace?.id && executionId) {
      fetchExecution(currentWorkspace.id, executionId);
    }
  }, [currentWorkspace?.id, executionId, fetchExecution]);

  // Poll for updates when running
  useEffect(() => {
    if (currentExecution?.status !== 'running' || !currentWorkspace?.id) return;
    const interval = setInterval(() => {
      fetchExecution(currentWorkspace.id, executionId);
    }, 2000);
    return () => clearInterval(interval);
  }, [currentExecution?.status, currentWorkspace?.id, executionId, fetchExecution]);

  if (isLoading || !currentExecution) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const isRunning = currentExecution.status === 'running' || currentExecution.status === 'pending';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/executions')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Execution Detail</h1>
            <Badge
              variant={
                currentExecution.status === 'completed' ? 'success' :
                currentExecution.status === 'failed' ? 'destructive' :
                isRunning ? 'warning' : 'default'
              }
            >
              {currentExecution.status}
            </Badge>
            {isRunning && <LiveIndicator />}
          </div>
        </div>
        {isRunning && (
          <Button
            variant="destructive"
            onClick={() => cancelExecution(currentWorkspace!.id, executionId)}
          >
            <XCircle className="mr-2 h-4 w-4" /> Cancel
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Trigger</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">{currentExecution.trigger.type}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Duration</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {currentExecution.durationMs ? formatDuration(currentExecution.durationMs) : isRunning ? 'Running...' : '—'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Started</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {currentExecution.startedAt ? formatDate(currentExecution.startedAt) : '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Step Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <ExecutionTimeline
            steps={currentExecution.steps}
            workflowSteps={(currentExecution as any).workflowId?.steps}
          />
        </CardContent>
      </Card>

      {currentExecution.trigger.payload && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Trigger Payload</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-auto rounded bg-muted p-4 text-xs">
              {JSON.stringify(currentExecution.trigger.payload, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
