'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TypographyH1, TypographyMuted, TypographyH3 } from '@/components/ui/typography';
import {
  Empty,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from '@/components/ui/empty';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { ConfirmActionDialog } from '@/components/ui/confirm-action-dialog';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  GitBranch,
  MoreVertical,
  Copy,
  Trash2,
  FolderKanban,
  SlidersHorizontal,
  BadgeCheckIcon,
  BellIcon,
  CreditCardIcon,
  LogOutIcon,
  TrashIcon,
} from 'lucide-react';
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

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [folderId, setFolderId] = useState('');
  const [sortBy, setSortBy] = useState('updatedAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [timeRange, setTimeRange] = useState<DateTimeRangeValue>({});
  const [page, setPage] = useState(1);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // Local dialog state — only committed on Apply
  const [dlgStatus, setDlgStatus] = useState('');
  const [dlgFolderId, setDlgFolderId] = useState('');
  const [dlgSortBy, setDlgSortBy] = useState('updatedAt');
  const [dlgSortOrder, setDlgSortOrder] = useState('desc');
  const [dlgTimeRange, setDlgTimeRange] = useState<DateTimeRangeValue>({});
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [workflowToDelete, setWorkflowToDelete] = useState<{ id: string; name: string } | null>(
    null,
  );
  const [viewMode, setViewMode] = useState<ViewMode>(() => getStoredViewMode('workflows'));

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
          <TypographyH1>Workflows</TypographyH1>
          <TypographyMuted className="mt-1.5">
            Manage workflow lifecycle with filterable views, folders, and operational context.
          </TypographyMuted>
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
          <CardHeader className="pb-2 p-4">
            <CardTitle className="text-xs text-muted-foreground font-normal">Total</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-4">
            <TypographyH3 className="text-2xl font-semibold tabular-nums">
              {workflowStats.total}
            </TypographyH3>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 p-4">
            <CardTitle className="text-xs text-muted-foreground font-normal">Active</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-4">
            <TypographyH3 className="text-2xl font-semibold tabular-nums">
              {workflowStats.active}
            </TypographyH3>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 p-4">
            <CardTitle className="text-xs text-muted-foreground font-normal">Paused</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-4">
            <TypographyH3 className="text-2xl font-semibold tabular-nums">
              {workflowStats.paused}
            </TypographyH3>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 p-4">
            <CardTitle className="text-xs text-muted-foreground font-normal">Draft</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 px-4 pb-4">
            <TypographyH3 className="text-2xl font-semibold tabular-nums">
              {workflowStats.draft}
            </TypographyH3>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="flex items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-normal text-muted-foreground">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {activeFilterCount > 0 ? `${activeFilterCount} active filters` : 'No filters applied'}
          </div>
          <div className="flex items-center gap-2">
            <ViewToggle
              value={viewMode}
              onChange={(mode) => {
                setViewMode(mode);
                storeViewMode('workflows', mode);
              }}
            />
            <Button
              variant="outline"
              onClick={() => {
                // Sync local dialog state from committed filters
                setDlgStatus(status);
                setDlgFolderId(folderId);
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
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sort & Filter Workflows</DialogTitle>
            <DialogDescription>Adjust filters to narrow the workflow list.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-1">
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
              value={dlgStatus || 'all'}
              onValueChange={(value) => setDlgStatus(value === 'all' ? '' : value)}
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
              value={dlgFolderId || 'all'}
              onValueChange={(value) => setDlgFolderId(value === 'all' ? '' : value)}
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

            <Select value={dlgSortBy} onValueChange={setDlgSortBy}>
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

            <Select value={dlgSortOrder} onValueChange={setDlgSortOrder}>
              <SelectTrigger>
                <SelectValue placeholder="Sort order" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Descending</SelectItem>
                <SelectItem value="asc">Ascending</SelectItem>
              </SelectContent>
            </Select>

            <DateTimeRangePicker
              value={dlgTimeRange}
              onChange={setDlgTimeRange}
              className="xl:col-span-2"
            />
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
                setIsFiltersOpen(false);
              }}
            >
              Reset
            </Button>
            <Button
              type="button"
              onClick={() => {
                setStatus(dlgStatus);
                setFolderId(dlgFolderId);
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
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="overflow-hidden">
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
        <Card>
          <CardContent className="py-24">
            <Empty>
              <EmptyMedia>
                <GitBranch className="h-11 w-11" strokeWidth={2} />
              </EmptyMedia>
              <EmptyTitle>No workflows in this view</EmptyTitle>
              <EmptyDescription>Broaden your filters or create a new workflow.</EmptyDescription>
              <EmptyContent>
                <Button onClick={() => router.push('/workflows/new')}>
                  <Plus className="mr-2 h-4 w-4" /> Create Workflow
                </Button>
              </EmptyContent>
            </Empty>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {workflows.map((workflow) => (
            <Card
              key={workflow.id}
              className="group cursor-pointer"
              onClick={() => router.push(`/workflows/${workflow.id}`)}
            >
              <div className="h-1 w-full bg-muted    opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <CardContent className="space-y-4 p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <TypographyH3 className="truncate transition-colors group-hover:text-primary">
                      {workflow.name}
                    </TypographyH3>
                    <TypographyMuted className="mt-1 line-clamp-2">
                      {workflow.description || 'No description'}
                    </TypographyMuted>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenuGroup>
                        <DropdownMenuItem
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (currentWorkspace) {
                              try {
                                await dispatch(
                                  duplicateWorkflow({
                                    workspaceId: currentWorkspace.id,
                                    workflowId: workflow.id,
                                  }),
                                ).unwrap();
                                toast.success('Workflow duplicated', {
                                  description: `${workflow.name} was duplicated.`,
                                });
                              } catch (error) {
                                toast.error('Failed to duplicate workflow', {
                                  description:
                                    error instanceof Error ? error.message : 'Please try again.',
                                });
                              }
                            }
                            setOpenMenu(null);
                          }}
                        >
                          <Copy />
                          Duplicate
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                      <DropdownMenuSeparator />
                      <DropdownMenuGroup>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setWorkflowToDelete({
                              id: workflow.id,
                              name: workflow.name,
                            });
                            setOpenMenu(null);
                          }}
                          variant="destructive"
                        >
                          <TrashIcon />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={statusColors[workflow.status] || 'default'}>
                    {workflow.status}
                  </Badge>
                  <Badge variant="outline">{workflow.stepCount || 0} steps</Badge>
                  <Badge variant="outline">
                    {workflow.folderId
                      ? folderMap.get(workflow.folderId) || 'Folder'
                      : 'Uncategorized'}
                  </Badge>
                </div>

                <TypographyMuted className="text-xs">
                  {/* Updated {formatDate(workflow.updatedAt)} */}
                </TypographyMuted>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Steps</TableHead>
                <TableHead>Folder</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {workflows.map((workflow) => (
                <TableRow
                  key={workflow.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/workflows/${workflow.id}`)}
                >
                  <TableCell>
                    <div className="min-w-0">
                      <span className="font-medium">{workflow.name}</span>
                      <TypographyMuted className="mt-0.5 line-clamp-1 text-xs">
                        {workflow.description || 'No description'}
                      </TypographyMuted>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusColors[workflow.status] || 'default'}>
                      {workflow.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{workflow.stepCount || 0}</TableCell>
                  <TableCell>
                    {workflow.folderId
                      ? folderMap.get(workflow.folderId) || 'Folder'
                      : 'Uncategorized'}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="rounded-full"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuGroup>
                          <DropdownMenuItem
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (currentWorkspace) {
                                try {
                                  await dispatch(
                                    duplicateWorkflow({
                                      workspaceId: currentWorkspace.id,
                                      workflowId: workflow.id,
                                    }),
                                  ).unwrap();
                                  toast.success('Workflow duplicated', {
                                    description: `${workflow.name} was duplicated.`,
                                  });
                                } catch (error) {
                                  toast.error('Failed to duplicate workflow', {
                                    description:
                                      error instanceof Error ? error.message : 'Please try again.',
                                  });
                                }
                              }
                            }}
                          >
                            <Copy />
                            Duplicate
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setWorkflowToDelete({
                                id: workflow.id,
                                name: workflow.name,
                              });
                            }}
                            variant="destructive"
                          >
                            <TrashIcon />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

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
            toast.success('Workflow deleted', {
              description: `${workflowToDelete.name} was removed.`,
            });
          } catch (error) {
            toast.error('Failed to delete workflow', {
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
