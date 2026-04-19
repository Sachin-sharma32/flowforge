'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Canvas } from '@/components/workflow/workflow-builder/canvas';
import { useAppDispatch, useAppSelector } from '@/stores/hooks';
import { createGlobalTemplate, updateGlobalTemplate } from '@/stores/workflow-slice';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Shield, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Spinner } from '@/components/ui/spinner';
import { TypographyH1, TypographyMuted } from '@/components/ui/typography';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface TemplateData {
  name: string;
  description: string;
  category: string;
  trigger: { type: string; config: Record<string, unknown> };
}

export default function NewTemplateEditPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const { currentWorkflow, isLoading } = useAppSelector((state) => state.workflow);
  const { user } = useAppSelector((state) => state.auth);
  const isSuperAdmin = user?.isSuperAdmin ?? false;

  const [templateData, setTemplateData] = useState<TemplateData | null>(null);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const pendingStepsRef = useRef<unknown[]>([]);

  useEffect(() => {
    const dataParam = searchParams.get('data');
    if (dataParam) {
      try {
        const parsed = JSON.parse(decodeURIComponent(dataParam)) as TemplateData;
        setTemplateData(parsed);
      } catch {
        toast.error('Invalid template data');
        router.push('/admin/templates/new');
      }
    } else {
      router.push('/admin/templates/new');
    }
  }, [searchParams, router]);

  const handleSave = async (steps: unknown[]) => {
    pendingStepsRef.current = steps;
  };

  const handleSaveTemplate = async () => {
    if (!isSuperAdmin) {
      toast.error('Only super admins can create global templates');
      return;
    }

    setIsSaving(true);

    try {
      if (!templateId && templateData) {
        const result = await dispatch(
          createGlobalTemplate({
            input: {
              name: templateData.name,
              description: templateData.description,
              category: templateData.category,
              trigger: templateData.trigger,
              steps: pendingStepsRef.current,
              variables: [],
            },
          }),
        ).unwrap();

        setTemplateId(result.id);
        toast.success('Template created successfully');
      } else if (templateId) {
        await dispatch(
          updateGlobalTemplate({
            templateId,
            input: { steps: pendingStepsRef.current },
          }),
        ).unwrap();

        toast.success('Template updated');
      }
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
            Only super admins can create global templates.
          </TypographyMuted>
          <Button className="mt-4" onClick={() => router.push('/templates')}>
            Go to Templates
          </Button>
        </div>
      </div>
    );
  }

  if (!templateData) {
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
            <TypographyH1 className="text-lg">{templateData.name}</TypographyH1>
            <TypographyMuted className="text-xs">Global Template Editor</TypographyMuted>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {isSaving && <TypographyMuted className="text-xs">Saving...</TypographyMuted>}
          <Button variant="default" size="sm" onClick={handleSaveTemplate} disabled={isSaving}>
            Save Template
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/templates')}
            disabled={isSaving}
          >
            Cancel
          </Button>
        </div>
      </div>

      <Alert className="mx-6 mt-4 border-primary/20 bg-primary/5">
        <AlertTriangle className="h-4 w-4 text-primary" />
        <AlertTitle>Super Admin Template Editor</AlertTitle>
        <AlertDescription>
          You are creating a global template that will be available to all users. Define the
          workflow structure and steps here. Click Save Template when finished.
        </AlertDescription>
      </Alert>

      <div className="relative min-h-0 flex-1">
        <Canvas
          workflow={{
            trigger: templateData.trigger,
            steps: [],
          }}
          onSave={handleSave}
          autoSave={false}
        />
      </div>
    </div>
  );
}
