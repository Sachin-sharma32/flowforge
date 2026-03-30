'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useExecutionStore } from '@/stores/execution-store';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { useExecutionSocket } from '@/hooks/use-execution-socket';
import { formatDate, formatDuration } from '@/lib/utils';
import { PlayCircle } from 'lucide-react';

export default function ExecutionsPage() {
  const router = useRouter();
  const { currentWorkspace } = useWorkspaceStore();
  const { executions, isLoading, fetchExecutions } = useExecutionStore();

  useExecutionSocket(currentWorkspace?.id);

  useEffect(() => {
    if (currentWorkspace?.id) {
      fetchExecutions(currentWorkspace.id);
    }
  }, [currentWorkspace?.id, fetchExecutions]);

  const statusVariant = (status: string) => {
    const map: Record<string, 'success' | 'destructive' | 'warning' | 'secondary' | 'default'> = {
      completed: 'success', failed: 'destructive', running: 'warning',
      pending: 'secondary', cancelled: 'default',
    };
    return map[status] || 'default';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Executions</h1>
        <p className="text-muted-foreground">Monitor workflow execution history</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg border bg-muted" />
          ))}
        </div>
      ) : executions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <PlayCircle className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold">No executions yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Run a workflow to see execution history here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Execution History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {executions.map((execution: any) => (
                <div
                  key={execution.id || execution._id}
                  className="flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-colors hover:bg-accent"
                  onClick={() => router.push(`/executions/${execution.id || execution._id}`)}
                >
                  <div className="flex items-center gap-4">
                    <Badge variant={statusVariant(execution.status)}>{execution.status}</Badge>
                    <div>
                      <p className="text-sm font-medium">
                        {execution.workflowId?.name || 'Workflow'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {execution.trigger?.type} trigger &middot; {execution.steps?.length || 0} steps
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {execution.durationMs ? formatDuration(execution.durationMs) : '—'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(execution.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
