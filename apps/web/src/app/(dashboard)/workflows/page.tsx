'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppDispatch, useAppSelector } from '@/stores/hooks';
import { fetchWorkflows, deleteWorkflow, duplicateWorkflow } from '@/stores/workflow-slice';
import { useDebounce } from '@/hooks/use-debounce';
import { formatDate } from '@/lib/utils';
import { Plus, Search, GitBranch, MoreVertical, Play, Pause, Copy, Trash2 } from 'lucide-react';

const statusColors: Record<string, 'success' | 'warning' | 'secondary' | 'default'> = {
  active: 'success',
  paused: 'warning',
  draft: 'secondary',
  archived: 'default',
};

export default function WorkflowsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const dispatch = useAppDispatch();
  const { currentWorkspace } = useAppSelector((state) => state.workspace);
  const { workflows, isLoading } = useAppSelector((state) => state.workflow);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  useEffect(() => {
    if (!currentWorkspace?.id) return;
    dispatch(
      fetchWorkflows({
        workspaceId: currentWorkspace.id,
        params: debouncedSearch ? { search: debouncedSearch } : undefined,
      }),
    );
  }, [currentWorkspace?.id, debouncedSearch, dispatch]);

  return (
    <div className="space-y-10">
      <div
        className="flex items-center justify-between stagger-fade-in"
        style={{ animationDelay: '0ms' }}
      >
        <div>
          <h1 className="bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-4xl font-bold tracking-tight text-transparent">
            Workflows
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Create and manage automation workflows
          </p>
        </div>
        <Button onClick={() => router.push('/workflows/new')}>
          <Plus className="mr-2 h-4 w-4" /> New Workflow
        </Button>
      </div>

      <div className="stagger-fade-in flex items-center gap-4" style={{ animationDelay: '80ms' }}>
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground transition-colors" />
          <Input
            placeholder="Search workflows..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Card key={i} noHover className="overflow-hidden">
              <CardContent className="space-y-5 p-7">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
                <div className="flex items-center gap-2 pt-2">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-3 w-12" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : workflows.length === 0 ? (
        <Card noHover className="stagger-fade-in" style={{ animationDelay: '160ms' }}>
          <CardContent className="flex flex-col items-center justify-center py-24">
            <div className="relative mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/10 to-primary/5 ring-1 ring-border/60">
              <div className="absolute inset-0 rounded-3xl bg-primary/5 blur-2xl" />
              <GitBranch className="relative h-11 w-11 text-primary" strokeWidth={2} />
            </div>
            <h3 className="text-xl font-semibold">No workflows yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Create your first workflow to start automating tasks.
            </p>
            <Button className="mt-6" onClick={() => router.push('/workflows/new')}>
              <Plus className="mr-2 h-4 w-4" /> Create Workflow
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {workflows.map((workflow: any, i) => (
            <Card
              key={workflow.id || workflow._id}
              style={{ animationDelay: `${160 + i * 60}ms` }}
              className="stagger-fade-in group cursor-pointer overflow-hidden"
              onClick={() => router.push(`/workflows/${workflow.id || workflow._id}`)}
            >
              {/* Top accent bar */}
              <div className="h-1 w-full bg-gradient-to-r from-primary/0 via-primary/40 to-primary/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <CardContent className="p-7">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold tracking-tight transition-colors group-hover:text-primary">
                      {workflow.name}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
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
                          onClick={(e) => {
                            e.stopPropagation();
                            if (currentWorkspace)
                              dispatch(
                                duplicateWorkflow({
                                  workspaceId: currentWorkspace.id,
                                  workflowId: workflow.id || workflow._id,
                                }),
                              );
                            setOpenMenu(null);
                          }}
                        >
                          <Copy className="h-3.5 w-3.5" /> Duplicate
                        </button>
                        <button
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (currentWorkspace)
                              dispatch(
                                deleteWorkflow({
                                  workspaceId: currentWorkspace.id,
                                  workflowId: workflow.id || workflow._id,
                                }),
                              );
                            setOpenMenu(null);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-5 flex items-center gap-3">
                  <Badge variant={statusColors[workflow.status] || 'default'}>
                    {workflow.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {workflow.steps?.length || 0} steps
                  </span>
                </div>
                <p className="mt-4 text-xs text-muted-foreground">
                  Updated {formatDate(workflow.updatedAt)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
