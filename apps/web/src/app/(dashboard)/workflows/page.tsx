'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import { fetchWorkflows, deleteWorkflow, duplicateWorkflow } from '@/stores/workflow-slice';
import { fetchFolders } from '@/stores/folder-slice';
import { useDebounce } from '@/hooks/use-debounce';
import { formatDate } from '@/lib/utils';
import { ConfirmActionDialog } from '@/components/ui/confirm-action-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Plus,
  Search,
  GitBranch,
  MoreVertical,
  Copy,
  Trash2,
  FolderKanban,
  SlidersHorizontal,
} from 'lucide-react';

const statusColors: Record<string, 'success' | 'warning' | 'secondary' | 'default'> = {
  active: 'success',
  paused: 'warning',
  draft: 'secondary',
  archived: 'default',
};

export default function WorkflowsPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { currentWorkspace } = useAppSelector((state) => state.workspace);
  const { workflows, isLoading, pagination } = useAppSelector((state) => state.workflow);
  const folders = useAppSelector((state) => state.folder.folders);
  const { toast } = useToast();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [folderId, setFolderId] = useState('');
  const [sortBy, setSortBy] = useState('updatedAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [timeRange, setTimeRange] = useState<DateTimeRangeValue>({});
  const [page, setPage] = useState(1);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [workflowToDelete, setWorkflowToDelete] = useState<{ id: string; name: string } | null>(
    null,
  );

  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    if (!currentWorkspace?.id) return;
    dispatch(fetchFolders({ workspaceId: currentWorkspace.id }));
  }, [currentWorkspace?.id, dispatch]);

  useEffect(() => {
    if (!currentWorkspace?.id) return;

    const params: Record<string, string> = {
      limit: '18',
      page: String(page),
      sortBy,
      sortOrder,
    };

    if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
    if (status) params.status = status;
    if (folderId) params.folderId = folderId;
    if (timeRange.from) params.dateFrom = timeRange.from.toISOString();
    if (timeRange.to) params.dateTo = timeRange.to.toISOString();

    dispatch(fetchWorkflows({ workspaceId: currentWorkspace.id, params }));
  }, [
    currentWorkspace?.id,
    debouncedSearch,
    status,
    folderId,
    sortBy,
    sortOrder,
    timeRange.from,
    timeRange.to,
    page,
    dispatch,
  ]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, folderId, sortBy, sortOrder, timeRange.from, timeRange.to]);

  const folderMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const folder of folders) {
      map.set(folder.id, folder.name);
    }
    return map;
  }, [folders]);

  const workflowStats = useMemo(() => {
    const total = workflows.length;
    const active = workflows.filter((workflow) => workflow.status === 'active').length;
    const paused = workflows.filter((workflow) => workflow.status === 'paused').length;
    const draft = workflows.filter((workflow) => workflow.status === 'draft').length;
    return { total, active, paused, draft };
  }, [workflows]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (search.trim()) count += 1;
    if (status) count += 1;
    if (folderId) count += 1;
    if (sortBy !== 'updatedAt') count += 1;
    if (sortOrder !== 'desc') count += 1;
    if (timeRange.from || timeRange.to) count += 1;
    return count;
  }, [search, status, folderId, sortBy, sortOrder, timeRange.from, timeRange.to]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Workflows</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Manage workflow lifecycle with filterable views, folders, and operational context.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.push('/folders')}>
            <FolderKanban className="mr-2 h-4 w-4" /> Manage Folders
          </Button>
          <Button onClick={() => router.push('/workflows/new')}>
            <Plus className="mr-2 h-4 w-4" /> New Workflow
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-2xl font-semibold tabular-nums">{workflowStats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Active</p>
            <p className="text-2xl font-semibold tabular-nums">{workflowStats.active}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Paused</p>
            <p className="text-2xl font-semibold tabular-nums">{workflowStats.paused}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Draft</p>
            <p className="text-2xl font-semibold tabular-nums">{workflowStats.draft}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="flex items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {activeFilterCount > 0 ? `${activeFilterCount} active filters` : 'No filters applied'}
          </div>
          <Button variant="outline" onClick={() => setIsFiltersOpen(true)}>
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            Sort & Filter
          </Button>
        </CardContent>
      </Card>

      <Dialog open={isFiltersOpen} onOpenChange={setIsFiltersOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Sort & Filter Workflows</DialogTitle>
            <DialogDescription>Adjust filters to narrow the workflow list.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-1">
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

              <Select
                value={status || 'all'}
                onValueChange={(value) => setStatus(value === 'all' ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={folderId || 'all'}
                onValueChange={(value) => setFolderId(value === 'all' ? '' : value)}
              >
                <SelectTrigger>
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
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="updatedAt">Sort: Last updated</SelectItem>
                  <SelectItem value="createdAt">Sort: Created date</SelectItem>
                  <SelectItem value="name">Sort: Name</SelectItem>
                  <SelectItem value="lastExecutedAt">Sort: Last executed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortOrder} onValueChange={setSortOrder}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Descending</SelectItem>
                  <SelectItem value="asc">Ascending</SelectItem>
                </SelectContent>
              </Select>

              <DateTimeRangePicker
                value={timeRange}
                onChange={setTimeRange}
                className="xl:col-span-2"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSearch('');
                setStatus('');
                setFolderId('');
                setSortBy('updatedAt');
                setSortOrder('desc');
                setTimeRange({});
                setPage(1);
              }}
            >
              Reset
            </Button>
            <Button type="button" onClick={() => setIsFiltersOpen(false)}>
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Card key={i} noHover className="overflow-hidden">
              <CardContent className="space-y-5 p-7">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
                <div className="flex items-center gap-2 pt-2">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : workflows.length === 0 ? (
        <Card noHover>
          <CardContent className="flex flex-col items-center justify-center py-24">
            <div className="relative mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/10 to-primary/5 ring-1 ring-border/60">
              <div className="absolute inset-0 rounded-3xl bg-primary/5 blur-2xl" />
              <GitBranch className="relative h-11 w-11 text-primary" strokeWidth={2} />
            </div>
            <h3 className="text-xl font-semibold">No workflows in this view</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Broaden your filters or create a new workflow.
            </p>
            <Button className="mt-6" onClick={() => router.push('/workflows/new')}>
              <Plus className="mr-2 h-4 w-4" /> Create Workflow
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {workflows.map((workflow: any) => (
            <Card
              key={workflow.id || workflow._id}
              className="group cursor-pointer overflow-hidden"
              onClick={() => router.push(`/workflows/${workflow.id || workflow._id}`)}
            >
              <div className="h-1 w-full bg-gradient-to-r from-primary/0 via-primary/40 to-primary/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <CardContent className="space-y-4 p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-lg font-semibold tracking-tight transition-colors group-hover:text-primary">
                      {workflow.name}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {workflow.description || 'No description'}
                    </p>
                  </div>

                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenu(
                          openMenu === (workflow.id || workflow._id)
                            ? null
                            : workflow.id || workflow._id,
                        );
                      }}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>

                    {openMenu === (workflow.id || workflow._id) && (
                      <div className="absolute right-0 top-9 z-10 w-44 origin-top-right animate-scale-in overflow-hidden rounded-xl border border-border/60 bg-popover/95 p-1 shadow-soft-lg backdrop-blur-xl">
                        <button
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent"
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (currentWorkspace) {
                              try {
                                await dispatch(
                                  duplicateWorkflow({
                                    workspaceId: currentWorkspace.id,
                                    workflowId: workflow.id || workflow._id,
                                  }),
                                ).unwrap();
                                toast({
                                  variant: 'success',
                                  title: 'Workflow duplicated',
                                  description: `${workflow.name} was duplicated.`,
                                });
                              } catch (error) {
                                toast({
                                  variant: 'destructive',
                                  title: 'Failed to duplicate workflow',
                                  description:
                                    error instanceof Error ? error.message : 'Please try again.',
                                });
                              }
                            }
                            setOpenMenu(null);
                          }}
                        >
                          <Copy className="h-3.5 w-3.5" /> Duplicate
                        </button>
                        <button
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            setWorkflowToDelete({
                              id: workflow.id || workflow._id,
                              name: workflow.name,
                            });
                            setOpenMenu(null);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={statusColors[workflow.status] || 'default'}>
                    {workflow.status}
                  </Badge>
                  <Badge variant="outline">{workflow.steps?.length || 0} steps</Badge>
                  <Badge variant="outline">
                    {workflow.folderId
                      ? folderMap.get(workflow.folderId) || 'Folder'
                      : 'Uncategorized'}
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground">
                  Updated {formatDate(workflow.updatedAt)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {pagination.totalPages > 1 ? (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1}
              />
            </PaginationItem>
            {Array.from({ length: pagination.totalPages }, (_, index) => index + 1)
              .filter((pageNumber) => {
                if (pagination.totalPages <= 7) return true;
                return (
                  pageNumber === 1 ||
                  pageNumber === pagination.totalPages ||
                  Math.abs(pageNumber - page) <= 1
                );
              })
              .map((pageNumber) => (
                <PaginationItem key={pageNumber}>
                  <PaginationLink
                    isActive={page === pageNumber}
                    onClick={() => setPage(pageNumber)}
                  >
                    {pageNumber}
                  </PaginationLink>
                </PaginationItem>
              ))}
            <PaginationItem>
              <PaginationNext
                onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}
                disabled={page >= pagination.totalPages}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      ) : null}

      <ConfirmActionDialog
        open={Boolean(workflowToDelete)}
        onOpenChange={(open) => {
          if (!open) setWorkflowToDelete(null);
        }}
        title="Delete workflow?"
        description={
          workflowToDelete
            ? `This will permanently delete "${workflowToDelete.name}". This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete workflow"
        destructive
        onConfirm={async () => {
          if (!currentWorkspace || !workflowToDelete) return;
          try {
            await dispatch(
              deleteWorkflow({
                workspaceId: currentWorkspace.id,
                workflowId: workflowToDelete.id,
              }),
            ).unwrap();
            toast({
              variant: 'success',
              title: 'Workflow deleted',
              description: `${workflowToDelete.name} was removed.`,
            });
          } catch (error) {
            toast({
              variant: 'destructive',
              title: 'Failed to delete workflow',
              description: error instanceof Error ? error.message : 'Please try again.',
            });
          } finally {
            setWorkflowToDelete(null);
          }
        }}
      />
    </div>
  );
}
