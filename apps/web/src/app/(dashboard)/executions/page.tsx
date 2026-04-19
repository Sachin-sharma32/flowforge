'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DateTimeRangePicker,
  type DateTimeRangeValue,
} from '@/components/ui/date-time-range-picker';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { useAppDispatch, useAppSelector } from '@/stores/hooks';
import { fetchExecutions } from '@/stores/execution-slice';
import { fetchFolders } from '@/stores/folder-slice';
import { fetchWorkflows } from '@/stores/workflow-slice';
import { useExecutionSocket } from '@/hooks/use-execution-socket';
import { useDebounce } from '@/hooks/use-debounce';
import { PlayCircle, Search, SlidersHorizontal, ExternalLink, X } from 'lucide-react';
import {
  ViewToggle,
  getStoredViewMode,
  storeViewMode,
  type ViewMode,
} from '@/components/ui/view-toggle';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDuration, formatDate, intervalToDuration } from 'date-fns';
import {
  TypographyH1,
  TypographyH3,
  TypographyMuted,
  TypographySmall,
} from '@/components/ui/typography';
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty';

export default function ExecutionsPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { currentWorkspace } = useAppSelector((state) => state.workspace);
  const { executions, isLoading, pagination } = useAppSelector((state) => state.execution);
  const workflows = useAppSelector((state) => state.workflow.workflows);
  const folders = useAppSelector((state) => state.folder.folders);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [workflowId, setWorkflowId] = useState('');
  const [folderId, setFolderId] = useState('');
  const [triggerType, setTriggerType] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [timeRange, setTimeRange] = useState<DateTimeRangeValue>({});
  const [page, setPage] = useState(1);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // Local dialog state — only committed on Apply
  const [dlgStatus, setDlgStatus] = useState('');
  const [dlgWorkflowId, setDlgWorkflowId] = useState('');
  const [dlgFolderId, setDlgFolderId] = useState('');
  const [dlgTriggerType, setDlgTriggerType] = useState('');
  const [dlgSortBy, setDlgSortBy] = useState('createdAt');
  const [dlgSortOrder, setDlgSortOrder] = useState('desc');
  const [dlgTimeRange, setDlgTimeRange] = useState<DateTimeRangeValue>({});
  const [viewMode, setViewMode] = useState<ViewMode>(() => getStoredViewMode('executions'));

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
      limit: '20',
      page: String(page),
      sortBy,
      sortOrder,
    };

    if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
    if (status) params.status = status;
    if (workflowId) params.workflowId = workflowId;
    if (folderId) params.folderId = folderId;
    if (triggerType) params.triggerType = triggerType;
    if (timeRange.from) params.dateFrom = timeRange.from.toISOString();
    if (timeRange.to) params.dateTo = timeRange.to.toISOString();

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
    timeRange.from,
    timeRange.to,
    page,
    dispatch,
  ]);

  useEffect(() => {
    setPage(1);
  }, [
    debouncedSearch,
    status,
    workflowId,
    folderId,
    triggerType,
    sortBy,
    sortOrder,
    timeRange.from,
    timeRange.to,
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

  const workflowMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const workflow of workflows) {
      map.set(workflow.id, workflow.name);
    }
    return map;
  }, [workflows]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (search.trim()) count += 1;
    if (status) count += 1;
    if (workflowId) count += 1;
    if (folderId) count += 1;
    if (triggerType) count += 1;
    if (sortBy !== 'createdAt') count += 1;
    if (sortOrder !== 'desc') count += 1;
    if (timeRange.from || timeRange.to) count += 1;
    return count;
  }, [
    search,
    status,
    workflowId,
    folderId,
    triggerType,
    sortBy,
    sortOrder,
    timeRange.from,
    timeRange.to,
  ]);

  const activeFilters = useMemo(() => {
    const filters: Array<{ key: string; label: string; onRemove: () => void }> = [];
    if (search.trim()) {
      filters.push({
        key: 'search',
        label: `Search: "${search.trim()}"`,
        onRemove: () => setSearch(''),
      });
    }
    if (status) {
      filters.push({
        key: 'status',
        label: `Status: ${status}`,
        onRemove: () => setStatus(''),
      });
    }
    if (workflowId) {
      const workflowName = workflowMap.get(workflowId) || 'Unknown';
      filters.push({
        key: 'workflow',
        label: `Workflow: ${workflowName}`,
        onRemove: () => setWorkflowId(''),
      });
    }
    if (folderId) {
      const folderName = folderMap.get(folderId) || 'Unknown';
      filters.push({
        key: 'folder',
        label: `Folder: ${folderName}`,
        onRemove: () => setFolderId(''),
      });
    }
    if (triggerType) {
      const triggerLabels: Record<string, string> = {
        manual: 'Manual',
        webhook: 'Webhook',
        cron: 'Schedule',
      };
      filters.push({
        key: 'trigger',
        label: `Trigger: ${triggerLabels[triggerType] || triggerType}`,
        onRemove: () => setTriggerType(''),
      });
    }
    if (sortBy !== 'createdAt') {
      const sortLabels: Record<string, string> = {
        status: 'Status',
        durationMs: 'Duration',
      };
      filters.push({
        key: 'sortBy',
        label: `Sort: ${sortLabels[sortBy] || sortBy}`,
        onRemove: () => setSortBy('createdAt'),
      });
    }
    if (sortOrder !== 'desc') {
      filters.push({
        key: 'sortOrder',
        label: 'Order: Ascending',
        onRemove: () => setSortOrder('desc'),
      });
    }
    if (timeRange.from || timeRange.to) {
      const fromStr = timeRange.from ? timeRange.from.toLocaleDateString() : '...';
      const toStr = timeRange.to ? timeRange.to.toLocaleDateString() : '...';
      filters.push({
        key: 'timeRange',
        label: `Date: ${fromStr} - ${toStr}`,
        onRemove: () => setTimeRange({}),
      });
    }
    return filters;
  }, [
    search,
    status,
    workflowId,
    workflowMap,
    folderId,
    folderMap,
    triggerType,
    sortBy,
    sortOrder,
    timeRange,
  ]);

  return (
    <div className="space-y-8">
      <div>
        <TypographyH1>Executions</TypographyH1>
        <TypographyMuted className="mt-1.5">
          Inspect execution runs with advanced filtering and operational visibility.
        </TypographyMuted>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2 p-4">
            <CardTitle className="text-xs text-muted-foreground font-normal">Total Runs</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-4">
            <TypographyH3 className="text-2xl font-semibold tabular-nums">
              {summary.total}
            </TypographyH3>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 p-4">
            <CardTitle className="text-xs text-muted-foreground font-normal">Completed</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-4">
            <TypographyH3 className="text-2xl font-semibold tabular-nums">
              {summary.completed}
            </TypographyH3>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 p-4">
            <CardTitle className="text-xs text-muted-foreground font-normal">Failed</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-4">
            <TypographyH3 className="text-2xl font-semibold tabular-nums">
              {summary.failed}
            </TypographyH3>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 p-4">
            <CardTitle className="text-xs text-muted-foreground font-normal">Running</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-4">
            <TypographyH3 className="text-2xl font-semibold tabular-nums">
              {summary.running}
            </TypographyH3>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="flex items-center justify-between gap-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {activeFilterCount > 0 ? `${activeFilterCount} active filters` : 'No filters applied'}
            </div>
            {activeFilters.map((filter) => (
              <Badge key={filter.key} variant="secondary" className="max-w-full gap-1 pr-1">
                <span className="truncate">{filter.label}</span>
                <button
                  onClick={filter.onRemove}
                  className="ml-1 shrink-0 rounded-full p-0.5 hover:bg-muted-foreground/20"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <ViewToggle
              value={viewMode}
              onChange={(mode) => {
                setViewMode(mode);
                storeViewMode('executions', mode);
              }}
            />
            <Button
              variant="outline"
              onClick={() => {
                setDlgStatus(status);
                setDlgWorkflowId(workflowId);
                setDlgFolderId(folderId);
                setDlgTriggerType(triggerType);
                setDlgSortBy(sortBy);
                setDlgSortOrder(sortOrder);
                setDlgTimeRange(timeRange);
                setIsFiltersOpen(true);
              }}
            >
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Sort & Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
        <DialogContent className="flex max-h-[85vh] w-[calc(100vw-2rem)] flex-col overflow-hidden p-4 sm:max-w-lg">
          <DialogHeader className="shrink-0">
            <DialogTitle>Sort & Filter Executions</DialogTitle>
            <DialogDescription>Adjust filters to narrow the execution list.</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 pr-2">
            <div className="grid gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by workflow name"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Select
                  value={dlgStatus || 'all'}
                  onValueChange={(value) => setDlgStatus(value === 'all' ? '' : value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="running">Running</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Select
                  value={dlgTriggerType || 'all'}
                  onValueChange={(value) => setDlgTriggerType(value === 'all' ? '' : value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All triggers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All triggers</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="webhook">Webhook</SelectItem>
                    <SelectItem value="cron">Schedule</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={dlgWorkflowId || 'all'}
                  onValueChange={(value) => setDlgWorkflowId(value === 'all' ? '' : value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All workflows" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All workflows</SelectItem>
                    {workflows.map((workflow) => (
                      <SelectItem key={workflow.id} value={workflow.id}>
                        {workflow.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Select
                  value={dlgFolderId || 'all'}
                  onValueChange={(value) => setDlgFolderId(value === 'all' ? '' : value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="All folders" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All folders</SelectItem>
                    {folders.map((folder) => (
                      <SelectItem key={folder.id} value={folder.id}>
                        {folder.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={dlgSortBy} onValueChange={setDlgSortBy}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="createdAt">Sort: Created at</SelectItem>
                    <SelectItem value="status">Sort: Status</SelectItem>
                    <SelectItem value="durationMs">Sort: Duration</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Select value={dlgSortOrder} onValueChange={setDlgSortOrder}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Sort order" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desc">Descending</SelectItem>
                    <SelectItem value="asc">Ascending</SelectItem>
                  </SelectContent>
                </Select>

                <DateTimeRangePicker value={dlgTimeRange} onChange={setDlgTimeRange} />
              </div>
            </div>
          </div>

          <DialogFooter className="shrink-0">
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
                setTimeRange({});
                setPage(1);
                setIsFiltersOpen(false);
              }}
            >
              Reset
            </Button>
            <Button
              onClick={() => {
                setStatus(dlgStatus);
                setWorkflowId(dlgWorkflowId);
                setFolderId(dlgFolderId);
                setTriggerType(dlgTriggerType);
                setSortBy(dlgSortBy);
                setSortOrder(dlgSortOrder);
                setTimeRange(dlgTimeRange);
                setIsFiltersOpen(false);
              }}
            >
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      ) : executions.length === 0 ? (
        <Card>
          <CardContent className="py-24">
            <Empty>
              <EmptyMedia>
                <PlayCircle className="h-11 w-11" strokeWidth={2} />
              </EmptyMedia>
              <EmptyTitle>No executions in this view</EmptyTitle>
              <EmptyDescription>
                Adjust filters or run a workflow to populate this feed.
              </EmptyDescription>
            </Empty>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Execution History</CardTitle>
            <TypographySmall>{executions.length} visible runs</TypographySmall>
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
                        <TypographyMuted className="text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                          {workflowName}
                        </TypographyMuted>
                        <TypographySmall>
                          {folderName} · {execution.trigger?.type} trigger
                        </TypographySmall>
                      </div>
                    </div>

                    <div className="text-right">
                      <TypographyMuted className="text-sm font-semibold tabular-nums text-foreground">
                        {execution.durationMs
                          ? formatDuration(
                              intervalToDuration({ start: 0, end: execution.durationMs }),
                            )
                          : '—'}
                      </TypographyMuted>
                      <TypographySmall></TypographySmall>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Execution History</CardTitle>
            <TypographySmall>{executions.length} visible runs</TypographySmall>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workflow</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Started At</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {executions.map((execution: any) => {
                  const workflow = execution.workflowId as
                    | { id?: string; _id?: string; name?: string }
                    | undefined;
                  const executionId = execution.id || execution._id;
                  const workflowName = workflow?.name || 'Workflow';

                  return (
                    <TableRow
                      key={executionId}
                      className="cursor-pointer"
                      onClick={() => router.push(`/executions/${executionId}`)}
                    >
                      <TableCell>
                        <span className="font-medium">{workflowName}</span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={statusVariant(execution.status)}
                          className={execution.status === 'running' ? 'pulse-soft' : ''}
                        >
                          {execution.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="tabular-nums text-muted-foreground">
                          {execution.createdAt
                            ? formatDate(new Date(execution.createdAt), 'PPp')
                            : '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="tabular-nums text-muted-foreground">
                          {execution.durationMs
                            ? formatDuration(
                                intervalToDuration({ start: 0, end: execution.durationMs }),
                              )
                            : '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
