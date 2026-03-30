'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useWorkflowStore } from '@/stores/workflow-store';
import { useWorkspaceStore } from '@/stores/workspace-store';
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
  const { currentWorkspace } = useWorkspaceStore();
  const { workflows, isLoading, fetchWorkflows, deleteWorkflow, duplicateWorkflow } = useWorkflowStore();
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  useEffect(() => {
    if (!currentWorkspace?.id) return;
    fetchWorkflows(currentWorkspace.id, debouncedSearch ? { search: debouncedSearch } : undefined);
  }, [currentWorkspace?.id, debouncedSearch, fetchWorkflows]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Workflows</h1>
          <p className="text-muted-foreground">Create and manage automation workflows</p>
        </div>
        <Button onClick={() => router.push('/workflows/new')}>
          <Plus className="mr-2 h-4 w-4" /> New Workflow
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search workflows..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 w-2/3 rounded bg-muted" />
                <div className="mt-2 h-3 w-1/3 rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : workflows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <GitBranch className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold">No workflows yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your first workflow to start automating tasks.
            </p>
            <Button className="mt-4" onClick={() => router.push('/workflows/new')}>
              <Plus className="mr-2 h-4 w-4" /> Create Workflow
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workflows.map((workflow: any) => (
            <Card
              key={workflow.id || workflow._id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => router.push(`/workflows/${workflow.id || workflow._id}`)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold">{workflow.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {workflow.description || 'No description'}
                    </p>
                  </div>
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenu(openMenu === (workflow.id || workflow._id) ? null : (workflow.id || workflow._id));
                      }}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                    {openMenu === (workflow.id || workflow._id) && (
                      <div className="absolute right-0 top-8 z-10 w-40 rounded-md border bg-card p-1 shadow-lg">
                        <button
                          className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm hover:bg-accent"
                          onClick={(e) => {
                            e.stopPropagation();
                            duplicateWorkflow(currentWorkspace!.id, workflow.id || workflow._id);
                            setOpenMenu(null);
                          }}
                        >
                          <Copy className="h-3 w-3" /> Duplicate
                        </button>
                        <button
                          className="flex w-full items-center gap-2 rounded px-3 py-2 text-sm text-destructive hover:bg-accent"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteWorkflow(currentWorkspace!.id, workflow.id || workflow._id);
                            setOpenMenu(null);
                          }}
                        >
                          <Trash2 className="h-3 w-3" /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <Badge variant={statusColors[workflow.status] || 'default'}>
                    {workflow.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {workflow.steps?.length || 0} steps
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
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
