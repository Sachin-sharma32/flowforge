'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Canvas } from '@/components/workflow/workflow-builder/canvas';
import { useAppDispatch, useAppSelector } from '@/stores/hooks';
import { fetchGlobalTemplate, updateGlobalTemplate } from '@/stores/workflow-slice';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shield, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Spinner } from '@/components/ui/spinner';
import { TypographyH1, TypographyMuted } from '@/components/ui/typography';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function TemplateEditPage() {
  const params = useParams();
  const router = useRouter();
  const templateId = params.id as string;
  const dispatch = useAppDispatch();
  const { currentWorkflow, isLoading } = useAppSelector((state) => state.workflow);
  const { user } = useAppSelector((state) => state.auth);
  const isSuperAdmin = user?.isSuperAdmin ?? false;

  const pendingStepsRef = useRef<unknown[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isSuperAdmin && templateId) {
      dispatch(fetchGlobalTemplate({ templateId }));
    }
  }, [isSuperAdmin, templateId, dispatch]);

  const handleSave = async (steps: unknown[]) => {
    pendingStepsRef.current = steps;
  };

  const handleSaveTemplate = async () => {
    if (!isSuperAdmin) {
      toast.error('Only super admins can edit global templates');
      return;
    }

    setIsSaving(true);

    try {
      await dispatch(
        updateGlobalTemplate({
          templateId,
          input: { steps: pendingStepsRef.current },
        }),
      ).unwrap();
      toast.success('Template saved');
    } catch (err: unknown) {
      toast.error('Failed to save template', {
        description:
          typeof err === 'string'
            ? err
            : err instanceof Error
              ? err.message
              : 'Failed to save template',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <Shield className="mx-auto h-16 w-16 text-muted-foreground" />
          <TypographyH1 className="mt-4">Access Denied</TypographyH1>
          <TypographyMuted className="mt-2">
            Only super admins can edit global templates.
          </TypographyMuted>
          <Button className="mt-4" onClick={() => router.push('/templates')}>
            Go to Templates
          </Button>
        </div>
      </div>
    );
  }

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
        <Button variant="ghost" size="icon" onClick={() => router.push('/templates')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <div>
            <TypographyH1 className="text-lg">{currentWorkflow.name}</TypographyH1>
            <TypographyMuted className="text-xs">Global Template Editor</TypographyMuted>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={handleSaveTemplate}
            disabled={isSaving || isLoading}
          >
            {isSaving ? 'Saving...' : 'Save Template'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => router.push('/templates')}>
            Back To Templates
          </Button>
        </div>
      </div>

      <Alert className="mx-6 mt-4 border-primary/20 bg-primary/5">
        <AlertTriangle className="h-4 w-4 text-primary" />
        <AlertTitle>Super Admin Template Editor</AlertTitle>
        <AlertDescription>
          You are editing a global template that will be available to all users. Define the workflow
          structure and steps here. Click Save when finished.
        </AlertDescription>
      </Alert>

      <div className="relative min-h-0 flex-1">
        <Canvas
          workflow={{
            trigger: currentWorkflow.trigger,
            steps: currentWorkflow.steps,
          }}
          onSave={handleSave}
          autoSave={false}
        />
      </div>
    </div>
  );
}
