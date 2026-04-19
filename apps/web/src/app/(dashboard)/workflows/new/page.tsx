'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAppDispatch, useAppSelector } from '@/stores/hooks';
import { createFromTemplate, createWorkflow, updateWorkflow } from '@/stores/workflow-slice';
import { fetchFolders } from '@/stores/folder-slice';
import {
  Webhook,
  Clock,
  MousePointer,
  Sparkles,
  ArrowRight,
  LayoutTemplate,
  ArrowLeft,
  Lightbulb,
  Shield,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { TypographyH1, TypographyMuted, TypographySmall } from '@/components/ui/typography';
import { Field, FieldLabel } from '@/components/ui/field';

const triggerTypes = [
  {
    type: 'manual',
    label: 'Manual Trigger',
    icon: MousePointer,
    description: 'Run manually from FlowForge or via API execution call.',
  },
  {
    type: 'webhook',
    label: 'Webhook',
    icon: Webhook,
    description: 'Start from incoming HTTP requests for external event ingestion.',
  },
  {
    type: 'cron',
    label: 'Schedule',
    icon: Clock,
    description: 'Run on time-based intervals for recurring automations.',
  },
] as const;

export default function NewWorkflowPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get('templateId')?.trim() || null;
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerType, setTriggerType] = useState('manual');
  const [folderId, setFolderId] = useState('');
  const dispatch = useAppDispatch();
  const { currentWorkspace } = useAppSelector((state) => state.workspace);
  const { user } = useAppSelector((state) => state.auth);
  const templateOptions = useAppSelector((state) => state.workflow.templates);
  const selectedTemplate = useMemo(
    () => templateOptions.find((template) => template.id === templateId) || null,
    [templateId, templateOptions],
  );
  const folders = useAppSelector((state) => state.folder.folders);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!selectedTemplate) return;
    setName((current) => (current.trim() ? current : selectedTemplate.name));
    setDescription((current) => (current.trim() ? current : selectedTemplate.description));
    setTriggerType(selectedTemplate.triggerType || 'manual');
  }, [selectedTemplate]);

  const handleBuilderSpotlightMove = useCallback((event: React.MouseEvent<HTMLElement>) => {
    const surface = event.currentTarget;
    const rect = surface.getBoundingClientRect();
    surface.style.setProperty('--builder-spot-x', `${event.clientX - rect.left}px`);
    surface.style.setProperty('--builder-spot-y', `${event.clientY - rect.top}px`);
    surface.style.setProperty('--builder-spot-opacity', '0.55');
  }, []);

  const handleBuilderSpotlightLeave = useCallback((event: React.MouseEvent<HTMLElement>) => {
    event.currentTarget.style.setProperty('--builder-spot-opacity', '0');
  }, []);

  useEffect(() => {
    if (currentWorkspace?.id) {
      dispatch(fetchFolders({ workspaceId: currentWorkspace.id }));
    }
  }, [currentWorkspace?.id, dispatch]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace?.id) return;
    if (!templateId && !name.trim()) return;

    setIsCreating(true);

    try {
      if (templateId) {
        const created = await dispatch(
          createFromTemplate({
            workspaceId: currentWorkspace.id,
            templateId,
          }),
        ).unwrap();

        const hasNameOverride = Boolean(name.trim()) && name.trim() !== created.name;
        const hasDescriptionOverride = description !== created.description;
        const hasFolderOverride = Boolean(folderId);
        const hasTriggerOverride = triggerType !== created.trigger.type;

        if (hasNameOverride || hasDescriptionOverride || hasFolderOverride || hasTriggerOverride) {
          await dispatch(
            updateWorkflow({
              workspaceId: currentWorkspace.id,
              workflowId: created.id,
              input: {
                ...(hasNameOverride ? { name: name.trim() } : {}),
                ...(hasDescriptionOverride ? { description } : {}),
                ...(hasFolderOverride ? { folderId } : {}),
                ...(hasTriggerOverride ? { trigger: { type: triggerType, config: {} } } : {}),
              },
            }),
          ).unwrap();
        }
      } else {
        await dispatch(
          createWorkflow({
            workspaceId: currentWorkspace.id,
            input: {
              name: name.trim(),
              description,
              folderId: folderId || undefined,
              trigger: { type: triggerType, config: {} },
              steps: [],
            },
          }),
        ).unwrap();
      }

      toast.success('Workflow saved');
      router.push('/workflows');
    } catch (err) {
      toast.error('Failed to save workflow', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="relative grid h-screen grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px]">
      <section
        className="bg-muted/30 relative border-b border-border px-6 py-8 lg:border-b-0 lg:border-r lg:px-10 lg:py-10"
        onMouseMove={handleBuilderSpotlightMove}
        onMouseLeave={handleBuilderSpotlightLeave}
      >
        <div className="mx-auto flex h-full w-full max-w-4xl flex-col">
          <div className="mb-5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => router.push('/workflows')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back To Workflows
            </Button>
          </div>
          <div>
            <TypographySmall className="text-xs font-semibold uppercase tracking-normal text-primary">
              Workflow Creation
            </TypographySmall>
            <TypographyH1 className="mt-3">Create a production-ready automation</TypographyH1>
            <TypographyMuted className="mt-3 max-w-2xl">
              Define the trigger now, then we open a full-screen static step builder where you can
              configure every step without draggable chaos.
            </TypographyMuted>
          </div>

          <form
            onSubmit={handleCreate}
            className="mt-8 space-y-8"
            data-testid="workflow-create-form"
          >
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
                <LayoutTemplate className="h-4 w-4 text-primary" />
                Basic Details
              </div>

              <div className="space-y-4">
                <Field>
                  <FieldLabel htmlFor="name">Workflow Name</FieldLabel>
                  <Input
                    id="name"
                    placeholder="e.g., Route New Leads To Sales"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    data-testid="workflow-name-input"
                    required={!templateId}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="description">Description</FieldLabel>
                  <Input
                    id="description"
                    placeholder="Describe what success looks like for this flow"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    data-testid="workflow-description-input"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="folder">Folder</FieldLabel>
                  <Select
                    value={folderId || 'uncategorized'}
                    onValueChange={(value) => setFolderId(value === 'uncategorized' ? '' : value)}
                  >
                    <SelectTrigger id="folder" className="h-12 rounded-xl bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="uncategorized">Uncategorized</SelectItem>
                      {folders.map((folder) => (
                        <SelectItem key={folder.id} value={folder.id}>
                          {folder.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
                <Sparkles className="h-4 w-4 text-primary" />
                Select Trigger
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {triggerTypes.map((trigger) => (
                  <button
                    key={trigger.type}
                    type="button"
                    onClick={() => setTriggerType(trigger.type)}
                    data-testid={`workflow-trigger-${trigger.type}`}
                    className={`rounded-xl border p-4 text-left transition-colors ${
                      triggerType === trigger.type
                        ? 'border-primary/60 bg-primary/10'
                        : 'border-border hover:border-primary/30 hover:bg-accent/40'
                    }`}
                  >
                    <trigger.icon
                      className={`mb-2 h-5 w-5 ${
                        triggerType === trigger.type ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    />
                    <TypographySmall className="text-sm font-semibold">
                      {trigger.label}
                    </TypographySmall>
                    <TypographyMuted className="mt-1 text-xs">
                      {trigger.description}
                    </TypographyMuted>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                data-testid="workflow-create-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isCreating || (!templateId && !name.trim())}
                data-testid="workflow-create-submit"
              >
                {isCreating ? 'Saving...' : 'Save Workflow'}
                {!isCreating && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            </div>
          </form>
        </div>
      </section>

      <aside className="relative hidden bg-muted    px-8 py-10 lg:block">
        <div className="space-y-4">
          <Alert className="flex items-start gap-3">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <AlertTitle>Start with a clear trigger</AlertTitle>
              <AlertDescription>
                Choose how the flow starts first, then add steps in order. Trigger choice affects
                what inputs are available in later steps.
              </AlertDescription>
            </div>
          </Alert>
          <Alert className="flex items-start gap-3">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <AlertTitle>Keep step names action-oriented</AlertTitle>
              <AlertDescription>
                Use names like “Fetch New Lead” and “Send Slack Alert” so debugging and handoffs
                stay fast for your team.
              </AlertDescription>
            </div>
          </Alert>
          <Alert className="flex items-start gap-3">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <AlertTitle>Validate branch paths early</AlertTitle>
              <AlertDescription>
                If you add condition steps, set true/false branches right away to prevent broken
                flow checks when autosave runs.
              </AlertDescription>
            </div>
          </Alert>
          {user?.isSuperAdmin && (
            <Alert className="flex items-start gap-3 border-primary/20 bg-primary/5">
              <Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <AlertTitle>Create a Template</AlertTitle>
                <AlertDescription className="flex flex-col gap-2">
                  <span>
                    Want to share this workflow as a reusable template for your team or all users?
                  </span>
                  <Link
                    href="/admin/templates/new"
                    className="inline-flex items-center text-primary hover:underline"
                  >
                    Create Template
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </AlertDescription>
              </div>
            </Alert>
          )}
        </div>
      </aside>
    </div>
  );
}
