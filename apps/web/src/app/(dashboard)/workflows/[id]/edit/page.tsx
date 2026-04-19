'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Canvas } from '@/components/workflow/workflow-builder/canvas';
import { useAppDispatch, useAppSelector } from '@/stores/hooks';
import { fetchWorkflow, updateWorkflow } from '@/stores/workflow-slice';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Spinner } from '@/components/ui/spinner';
import { TypographyH1, TypographyMuted } from '@/components/ui/typography';

export default function WorkflowEditPage() {
  const params = useParams();
  const router = useRouter();
  const workflowId = params.id as string;
  const dispatch = useAppDispatch();
  const { currentWorkspace } = useAppSelector((state) => state.workspace);
  const { currentWorkflow, isLoading } = useAppSelector((state) => state.workflow);
  const latestDraftStepsRef = useRef<unknown[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (currentWorkspace?.id && workflowId) {
      dispatch(fetchWorkflow({ workspaceId: currentWorkspace.id, workflowId }));
    }
  }, [currentWorkspace?.id, workflowId, dispatch]);

  useEffect(() => {
    if (!currentWorkflow) return;
    latestDraftStepsRef.current = currentWorkflow.steps;
  }, [currentWorkflow]);

  const handleSave = async (steps: unknown[]) => {
    if (!currentWorkspace?.id) return;
    latestDraftStepsRef.current = steps;
    try {
      await dispatch(
        updateWorkflow({ workspaceId: currentWorkspace.id, workflowId, input: { steps } }),
      ).unwrap();
    } catch (err: unknown) {
      toast.error('Auto-save failed', {
        description:
          typeof err === 'string'
            ? err
            : err instanceof Error
              ? err.message
              : 'Failed to save workflow',
      });
    }
  };

  const handleSaveAndExit = async () => {
    if (!currentWorkspace?.id || !currentWorkflow) return;

    setIsSaving(true);

    try {
      await dispatch(
        updateWorkflow({
          workspaceId: currentWorkspace.id,
          workflowId,
          input: { steps: latestDraftStepsRef.current },
        }),
      ).unwrap();
      toast.success('Workflow saved');
      router.push('/workflows');
    } catch (err: unknown) {
      toast.error('Failed to save workflow', {
        description:
          typeof err === 'string'
            ? err
            : err instanceof Error
              ? err.message
              : 'Failed to save workflow',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !currentWorkflow) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b border-border px-6 py-4 lg:px-8">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/workflows/${workflowId}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <TypographyH1 className="text-lg">{currentWorkflow.name}</TypographyH1>
          <TypographyMuted className="text-xs">Visual Workflow Editor</TypographyMuted>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="default" size="sm" onClick={handleSaveAndExit} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Workflow'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => router.push('/workflows')}>
            Back To Workflows
          </Button>
        </div>
      </div>
      <div className="relative min-h-0 flex-1">
        <Canvas
          workflow={{
            trigger: currentWorkflow.trigger,
            steps: currentWorkflow.steps,
          }}
          onSave={handleSave}
          onDraftChange={(steps) => {
            latestDraftStepsRef.current = steps;
          }}
        />
      </div>
    </div>
  );
}
