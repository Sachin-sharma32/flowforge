'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExecutionTimeline } from '@/components/execution/execution-timeline';
import { LiveIndicator } from '@/components/execution/live-indicator';
import { ConfirmActionDialog } from '@/components/ui/confirm-action-dialog';
import { useAppDispatch, useAppSelector } from '@/stores/hooks';
import { fetchExecution, cancelExecution } from '@/stores/execution-slice';
import type { IExecution } from '@flowforge/shared';
import { useExecutionSocket } from '@/hooks/use-execution-socket';
import { getSocket } from '@/lib/socket-client';
import { TypographyH1, TypographyMuted } from '@/components/ui/typography';
import { ArrowLeft, XCircle } from 'lucide-react';
import { useState } from 'react';
import { formatDuration, intervalToDuration } from 'date-fns';
import { toast } from 'sonner';
export default function ExecutionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const executionId = params.id as string;
  const dispatch = useAppDispatch();
  const { currentWorkspace } = useAppSelector((state) => state.workspace);
  const { currentExecution, isLoading } = useAppSelector((state) => state.execution);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);

  useExecutionSocket(currentWorkspace?.id);

  useEffect(() => {
    if (currentWorkspace?.id && executionId) {
      dispatch(fetchExecution({ workspaceId: currentWorkspace.id, executionId }));
    }
  }, [currentWorkspace?.id, executionId, dispatch]);

  // Poll as fallback only when socket is disconnected and execution is running
  useEffect(() => {
    if (currentExecution?.status !== 'running' || !currentWorkspace?.id) return;

    const socket = getSocket();
    if (socket.connected) return; // Socket handles real-time updates

    const interval = setInterval(() => {
      dispatch(fetchExecution({ workspaceId: currentWorkspace.id, executionId }));
    }, 3000);
    return () => clearInterval(interval);
  }, [currentExecution?.status, currentWorkspace?.id, executionId, dispatch]);

  if (isLoading || !currentExecution) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const isRunning = currentExecution.status === 'running' || currentExecution.status === 'pending';

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/executions')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <TypographyH1>Execution Detail</TypographyH1>
            <Badge
              variant={
                currentExecution.status === 'completed'
                  ? 'success'
                  : currentExecution.status === 'failed'
                    ? 'destructive'
                    : isRunning
                      ? 'warning'
                      : 'default'
              }
            >
              {currentExecution.status}
            </Badge>
            {isRunning && <LiveIndicator />}
          </div>
        </div>
        {isRunning && (
          <Button variant="destructive" onClick={() => setConfirmCancelOpen(true)}>
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
            <TypographyMuted className="text-lg font-semibold text-foreground">
              {currentExecution.trigger.type}
            </TypographyMuted>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Duration</CardTitle>
          </CardHeader>
          <CardContent>
            <TypographyMuted className="text-lg font-semibold text-foreground">
              {currentExecution.durationMs
                ? formatDuration(intervalToDuration({ start: 0, end: currentExecution.durationMs }))
                : isRunning
                  ? 'Running...'
                  : '—'}
            </TypographyMuted>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Started</CardTitle>
          </CardHeader>
          <CardContent>
            <TypographyMuted className="text-lg font-semibold text-foreground">
              {/* {currentExecution.startedAt ? formatDate(currentExecution.startedAt) : '—'} */}
            </TypographyMuted>
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
            workflowSteps={
              (
                currentExecution as IExecution & {
                  workflowId?: { steps?: Array<{ id: string; name: string; type: string }> };
                }
              ).workflowId?.steps
            }
          />
        </CardContent>
      </Card>

      {currentExecution.trigger.payload && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Trigger Payload</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-auto rounded-xl bg-muted p-5 text-xs">
              {JSON.stringify(currentExecution.trigger.payload, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      <ConfirmActionDialog
        open={confirmCancelOpen}
        onOpenChange={setConfirmCancelOpen}
        title="Cancel execution?"
        description="The running execution will stop and any pending steps will not run."
        confirmLabel="Cancel execution"
        destructive
        onConfirm={async () => {
          if (!currentWorkspace) return;
          try {
            await dispatch(
              cancelExecution({ workspaceId: currentWorkspace.id, executionId }),
            ).unwrap();
            toast.error('Execution cancelled', {
              description: 'The workflow run was cancelled.',
            });
          } catch (error) {
            toast.error('Failed to cancel execution', {
              description: error instanceof Error ? error.message : 'Please try again.',
            });
          } finally {
            setConfirmCancelOpen(false);
          }
        }}
      />
    </div>
  );
}
