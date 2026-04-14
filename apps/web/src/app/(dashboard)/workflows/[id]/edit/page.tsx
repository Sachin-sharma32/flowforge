'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Canvas } from '@/components/workflow/workflow-builder/canvas';
import { useAppDispatch, useAppSelector } from '@/stores/hooks';
import { fetchWorkflow, updateWorkflow } from '@/stores/workflow-slice';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function WorkflowEditPage() {
  const params = useParams();
  const router = useRouter();
  const workflowId = params.id as string;
  const dispatch = useAppDispatch();
  const { currentWorkspace } = useAppSelector((state) => state.workspace);
  const { currentWorkflow, isLoading } = useAppSelector((state) => state.workflow);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (currentWorkspace?.id && workflowId) {
      dispatch(fetchWorkflow({ workspaceId: currentWorkspace.id, workflowId }));
    }
  }, [currentWorkspace?.id, workflowId, dispatch]);

  const handleSave = async (steps: unknown[]) => {
    if (!currentWorkspace?.id) return;
    setSaveError(null);
    try {
      await dispatch(
        updateWorkflow({ workspaceId: currentWorkspace.id, workflowId, input: { steps } }),
      ).unwrap();
    } catch (err: unknown) {
      if (typeof err === 'string') {
        setSaveError(err);
        return;
      }
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
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b border-border/60 px-6 py-4 lg:px-8">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/workflows/${workflowId}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-lg font-semibold">{currentWorkflow.name}</h1>
          <p className="text-xs text-muted-foreground">Visual Workflow Editor</p>
        </div>
        <div className="ml-auto">
          <Button variant="outline" size="sm" onClick={() => router.push('/workflows')}>
            Back To Workflows
          </Button>
        </div>
      </div>
      {saveError && (
        <div className="mx-6 mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive lg:mx-8">
          {saveError}
        </div>
      )}
      <div className="min-h-0 flex-1">
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
