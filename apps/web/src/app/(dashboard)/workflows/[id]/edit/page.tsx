'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Canvas } from '@/components/workflow/workflow-builder/canvas';
import { useWorkflowStore } from '@/stores/workflow-store';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function WorkflowEditPage() {
  const params = useParams();
  const router = useRouter();
  const workflowId = params.id as string;
  const { currentWorkspace } = useWorkspaceStore();
  const { currentWorkflow, fetchWorkflow, updateWorkflow, isLoading } = useWorkflowStore();
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (currentWorkspace?.id && workflowId) {
      fetchWorkflow(currentWorkspace.id, workflowId);
    }
  }, [currentWorkspace?.id, workflowId, fetchWorkflow]);

  const handleSave = async (steps: unknown[]) => {
    if (!currentWorkspace?.id) return;
    setSaveError(null);
    try {
      await updateWorkflow(currentWorkspace.id, workflowId, { steps });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save workflow');
    }
  };

  if (isLoading || !currentWorkflow) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <div className="flex items-center gap-3 border-b pb-3">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/workflows/${workflowId}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-lg font-semibold">{currentWorkflow.name}</h1>
          <p className="text-xs text-muted-foreground">Visual Workflow Editor</p>
        </div>
      </div>
      {saveError && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{saveError}</div>
      )}
      <div className="flex-1 mt-3">
        <Canvas
          workflow={{
            trigger: currentWorkflow.trigger,
            steps: currentWorkflow.steps,
          }}
          onSave={handleSave}
        />
      </div>
    </div>
  );
}
