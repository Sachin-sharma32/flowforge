'use client';

import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useExecutionStore } from '@/stores/execution-store';
import { useWorkflowStore } from '@/stores/workflow-store';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { useExecutionSocket } from '@/hooks/use-execution-socket';
import { formatDate, formatDuration } from '@/lib/utils';
import { Activity, CheckCircle2, XCircle, Clock, GitBranch, Zap } from 'lucide-react';

const statusBadge = (status: string) => {
  const variants: Record<string, 'success' | 'destructive' | 'warning' | 'default' | 'secondary'> = {
    completed: 'success',
    failed: 'destructive',
    running: 'warning',
    pending: 'secondary',
    cancelled: 'default',
  };
  return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
};

export default function DashboardPage() {
  const { currentWorkspace } = useWorkspaceStore();
  const { workflows, fetchWorkflows } = useWorkflowStore();
  const { executions, stats, fetchExecutions, fetchStats } = useExecutionStore();

  useExecutionSocket(currentWorkspace?.id);

  useEffect(() => {
    if (!currentWorkspace?.id) return;
    fetchWorkflows(currentWorkspace.id);
    fetchExecutions(currentWorkspace.id, { limit: '5' } as any);
    fetchStats(currentWorkspace.id);
  }, [currentWorkspace?.id, fetchWorkflows, fetchExecutions, fetchStats]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your workflow activity</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Workflows</CardTitle>
            <GitBranch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workflows.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Executions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.successRate || 0}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.avgDurationMs ? formatDuration(stats.avgDurationMs) : '—'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Executions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Executions</CardTitle>
        </CardHeader>
        <CardContent>
          {executions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Zap className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No executions yet. Create and run a workflow to see results here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {executions.map((execution: any) => (
                <div
                  key={execution.id || execution._id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    {statusBadge(execution.status)}
                    <div>
                      <p className="text-sm font-medium">
                        {execution.workflowId?.name || 'Workflow'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {execution.trigger?.type} trigger
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm">
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
