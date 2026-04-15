'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useAppDispatch, useAppSelector } from '@/stores/hooks';
import { fetchExecutions } from '@/stores/execution-slice';
import { fetchFolders } from '@/stores/folder-slice';
import { fetchWorkflows } from '@/stores/workflow-slice';
import { useExecutionSocket } from '@/hooks/use-execution-socket';
import { useDebounce } from '@/hooks/use-debounce';
import { formatDate, formatDuration } from '@/lib/utils';
import { PlayCircle, Search, SlidersHorizontal } from 'lucide-react';

export default function ExecutionsPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { currentWorkspace } = useAppSelector((state) => state.workspace);
  const { executions, isLoading } = useAppSelector((state) => state.execution);
  const workflows = useAppSelector((state) => state.workflow.workflows);
  const folders = useAppSelector((state) => state.folder.folders);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [workflowId, setWorkflowId] = useState('');
  const [folderId, setFolderId] = useState('');
  const [triggerType, setTriggerType] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const debouncedSearch = useDebounce(search, 300);

  useExecutionSocket(currentWorkspace?.id);

  useEffect(() => {
    if (!currentWorkspace?.id) return;
    dispatch(fetchFolders({ workspaceId: currentWorkspace.id }));
    dispatch(fetchWorkflows({ workspaceId: currentWorkspace.id, params: { limit: '200' } }));
  }, [currentWorkspace?.id, dispatch]);

  useEffect(() => {
    if (!currentWorkspace?.id) return;

    const params: Record<string, string> = {
      limit: '120',
      sortBy,
      sortOrder,
    };

    if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
    if (status) params.status = status;
    if (workflowId) params.workflowId = workflowId;
    if (folderId) params.folderId = folderId;
    if (triggerType) params.triggerType = triggerType;
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;

    dispatch(fetchExecutions({ workspaceId: currentWorkspace.id, params }));
  }, [
    currentWorkspace?.id,
    debouncedSearch,
    status,
    workflowId,
    folderId,
    triggerType,
    sortBy,
    sortOrder,
    dateFrom,
    dateTo,
    dispatch,
  ]);

  const statusVariant = (executionStatus: string) => {
    const map: Record<string, 'success' | 'destructive' | 'warning' | 'secondary' | 'default'> = {
      completed: 'success',
      failed: 'destructive',
      running: 'warning',
      pending: 'secondary',
      cancelled: 'default',
    };
    return map[executionStatus] || 'default';
  };

  const summary = useMemo(() => {
    const total = executions.length;
    const completed = executions.filter((execution) => execution.status === 'completed').length;
    const failed = executions.filter((execution) => execution.status === 'failed').length;
    const running = executions.filter((execution) => execution.status === 'running').length;
    return { total, completed, failed, running };
  }, [executions]);

  const folderMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const folder of folders) {
      map.set(folder.id, folder.name);
    }
    return map;
  }, [folders]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-4xl font-bold tracking-tight text-transparent">
          Executions
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Inspect execution runs with advanced filtering and operational visibility.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total Runs</p>
            <p className="text-2xl font-semibold tabular-nums">{summary.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Completed</p>
            <p className="text-2xl font-semibold tabular-nums">{summary.completed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Failed</p>
            <p className="text-2xl font-semibold tabular-nums">{summary.failed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Running</p>
            <p className="text-2xl font-semibold tabular-nums">{summary.running}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters & Sorting
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="relative xl:col-span-2">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by workflow name"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <select
              className="h-12 rounded-xl border border-input bg-background/60 px-3 text-sm"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="running">Running</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>

            <select
              className="h-12 rounded-xl border border-input bg-background/60 px-3 text-sm"
              value={triggerType}
              onChange={(event) => setTriggerType(event.target.value)}
            >
              <option value="">All triggers</option>
              <option value="manual">Manual</option>
              <option value="webhook">Webhook</option>
              <option value="cron">Schedule</option>
            </select>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <select
              className="h-12 rounded-xl border border-input bg-background/60 px-3 text-sm"
              value={workflowId}
              onChange={(event) => setWorkflowId(event.target.value)}
            >
              <option value="">All workflows</option>
              {workflows.map((workflow) => (
                <option key={workflow.id} value={workflow.id}>
                  {workflow.name}
                </option>
              ))}
            </select>

            <select
              className="h-12 rounded-xl border border-input bg-background/60 px-3 text-sm"
              value={folderId}
              onChange={(event) => setFolderId(event.target.value)}
            >
              <option value="">All folders</option>
              {folders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>

            <select
              className="h-12 rounded-xl border border-input bg-background/60 px-3 text-sm"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
            >
              <option value="createdAt">Sort: Created at</option>
              <option value="status">Sort: Status</option>
              <option value="durationMs">Sort: Duration</option>
            </select>

            <select
              className="h-12 rounded-xl border border-input bg-background/60 px-3 text-sm"
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>

            <Input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
            />
            <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
          </div>

          <Button
            variant="outline"
            onClick={() => {
              setSearch('');
              setStatus('');
              setWorkflowId('');
              setFolderId('');
              setTriggerType('');
              setSortBy('createdAt');
              setSortOrder('desc');
              setDateFrom('');
              setDateTo('');
            }}
          >
            Reset Filters
          </Button>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      ) : executions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-24">
            <div className="relative mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/10 to-primary/5 ring-1 ring-border/60">
              <div className="absolute inset-0 rounded-3xl bg-primary/5 blur-2xl" />
              <PlayCircle className="relative h-11 w-11 text-primary" strokeWidth={2} />
            </div>
            <h3 className="text-xl font-semibold">No executions in this view</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Adjust filters or run a workflow to populate this feed.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Execution History</CardTitle>
            <p className="text-xs text-muted-foreground">{executions.length} visible runs</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {executions.map((execution: any) => {
                const workflow = execution.workflowId as
                  | {
                      id?: string;
                      _id?: string;
                      name?: string;
                      folderId?: string;
                    }
                  | undefined;

                const executionId = execution.id || execution._id;
                const workflowName = workflow?.name || 'Workflow';
                const workflowFolderId = workflow?.folderId ? String(workflow.folderId) : null;
                const folderName = workflow?.folderId
                  ? folderMap.get(workflowFolderId || '') || 'Folder'
                  : 'Uncategorized';

                return (
                  <div
                    key={executionId}
                    className="group flex cursor-pointer items-center justify-between rounded-2xl border border-border/50 bg-background/40 p-5 transition-colors duration-200 hover:border-border hover:bg-background/80"
                    onClick={() => router.push(`/executions/${executionId}`)}
                  >
                    <div className="flex items-center gap-5">
                      <Badge
                        variant={statusVariant(execution.status)}
                        className={execution.status === 'running' ? 'pulse-soft' : ''}
                      >
                        {execution.status}
                      </Badge>

                      <div>
                        <p className="text-sm font-semibold transition-colors group-hover:text-primary">
                          {workflowName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {folderName} · {execution.trigger?.type} trigger
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
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
