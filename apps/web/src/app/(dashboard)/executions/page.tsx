'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppDispatch, useAppSelector } from '@/stores/hooks';
import { fetchExecutions } from '@/stores/execution-slice';
import { useExecutionSocket } from '@/hooks/use-execution-socket';
import { formatDate, formatDuration } from '@/lib/utils';
import { PlayCircle } from 'lucide-react';

export default function ExecutionsPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { currentWorkspace } = useAppSelector((state) => state.workspace);
  const { executions, isLoading } = useAppSelector((state) => state.execution);

  useExecutionSocket(currentWorkspace?.id);

  useEffect(() => {
    if (currentWorkspace?.id) {
      dispatch(fetchExecutions({ workspaceId: currentWorkspace.id }));
    }
  }, [currentWorkspace?.id, dispatch]);

  const statusVariant = (status: string) => {
    const map: Record<string, 'success' | 'destructive' | 'warning' | 'secondary' | 'default'> = {
      completed: 'success',
      failed: 'destructive',
      running: 'warning',
      pending: 'secondary',
      cancelled: 'default',
    };
    return map[status] || 'default';
  };

  return (
    <div className="space-y-8">
      <div className="stagger-fade-in" style={{ animationDelay: '0ms' }}>
        <h1 className="bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-4xl font-bold tracking-tight text-transparent">
          Executions
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Monitor workflow execution history</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      ) : executions.length === 0 ? (
        <Card noHover className="stagger-fade-in" style={{ animationDelay: '80ms' }}>
          <CardContent className="flex flex-col items-center justify-center py-20">
            <div className="relative mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 ring-1 ring-border/60">
              <div className="absolute inset-0 rounded-2xl bg-primary/5 blur-2xl" />
              <PlayCircle className="relative h-9 w-9 text-primary" strokeWidth={2} />
            </div>
            <h3 className="text-lg font-semibold">No executions yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Run a workflow to see execution history here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card noHover className="stagger-fade-in" style={{ animationDelay: '80ms' }}>
          <CardHeader>
            <CardTitle className="text-lg">Execution History</CardTitle>
            <p className="text-xs text-muted-foreground">
              {executions.length} {executions.length === 1 ? 'run' : 'runs'}
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {executions.map((execution: any, i) => (
                <div
                  key={execution.id || execution._id}
                  style={{ animationDelay: `${120 + i * 40}ms` }}
                  className="stagger-fade-in group flex cursor-pointer items-center justify-between rounded-xl border border-border/50 bg-background/40 p-4 transition-colors duration-200 ease-spring hover:border-border hover:bg-background/80"
                  onClick={() => router.push(`/executions/${execution.id || execution._id}`)}
                >
                  <div className="flex items-center gap-4">
                    <Badge
                      variant={statusVariant(execution.status)}
                      className={execution.status === 'running' ? 'pulse-soft' : ''}
                    >
                      {execution.status === 'running' && (
                        <span className="relative flex h-1.5 w-1.5">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-warning opacity-75" />
                          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-warning" />
                        </span>
                      )}
                      {execution.status}
                    </Badge>
                    <div>
                      <p className="text-sm font-semibold transition-colors group-hover:text-primary">
                        {execution.workflowId?.name || 'Workflow'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {execution.trigger?.type} trigger &middot; {execution.steps?.length || 0}{' '}
                        steps
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums">
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
