'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useWorkflowStore } from '@/stores/workflow-store';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { formatDate } from '@/lib/utils';
import { ArrowLeft, Edit, Play, Pause, Copy } from 'lucide-react';

export default function WorkflowDetailPage() {
  const params = useParams();
  const router = useRouter();
  const workflowId = params.id as string;
  const { currentWorkspace } = useWorkspaceStore();
  const {
    currentWorkflow,
    fetchWorkflow,
    activateWorkflow,
    pauseWorkflow,
    duplicateWorkflow,
    executeWorkflow,
    isLoading,
  } = useWorkflowStore();

  useEffect(() => {
    if (currentWorkspace?.id && workflowId) {
      fetchWorkflow(currentWorkspace.id, workflowId);
    }
  }, [currentWorkspace?.id, workflowId, fetchWorkflow]);

  if (isLoading || !currentWorkflow) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const handleExecute = async () => {
    if (!currentWorkspace?.id) return;
    const executionId = await executeWorkflow(currentWorkspace.id, workflowId);
    router.push(`/executions/${executionId}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/workflows')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{currentWorkflow.name}</h1>
            <Badge
              variant={
                currentWorkflow.status === 'active'
                  ? 'success'
                  : currentWorkflow.status === 'paused'
                    ? 'warning'
                    : 'secondary'
              }
            >
              {currentWorkflow.status}
            </Badge>
          </div>
          <p className="text-muted-foreground">{currentWorkflow.description || 'No description'}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => currentWorkspace && duplicateWorkflow(currentWorkspace.id, workflowId)}
          >
            <Copy className="mr-2 h-4 w-4" /> Duplicate
          </Button>
          {currentWorkflow.status === 'active' ? (
            <Button
              variant="outline"
              onClick={() => currentWorkspace && pauseWorkflow(currentWorkspace.id, workflowId)}
            >
              <Pause className="mr-2 h-4 w-4" /> Pause
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => currentWorkspace && activateWorkflow(currentWorkspace.id, workflowId)}
            >
              <Play className="mr-2 h-4 w-4" /> Activate
            </Button>
          )}
          <Button onClick={() => router.push(`/workflows/${workflowId}/edit`)}>
            <Edit className="mr-2 h-4 w-4" /> Edit
          </Button>
          <Button onClick={handleExecute}>
            <Play className="mr-2 h-4 w-4" /> Run Now
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Trigger</span>
              <span className="font-medium">{currentWorkflow.trigger.type}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Steps</span>
              <span className="font-medium">{currentWorkflow.steps.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Version</span>
              <span className="font-medium">v{currentWorkflow.version}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Created</span>
              <span>{formatDate(currentWorkflow.createdAt)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Updated</span>
              <span>{formatDate(currentWorkflow.updatedAt)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Steps</CardTitle>
          </CardHeader>
          <CardContent>
            {currentWorkflow.steps.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No steps defined. Open the editor to add steps.
              </p>
            ) : (
              <div className="space-y-2">
                {currentWorkflow.steps.map((step, i) => (
                  <div key={step.id} className="flex items-center gap-3 rounded-lg border p-2.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{step.name}</p>
                      <p className="text-xs text-muted-foreground">{step.type.replace('_', ' ')}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
