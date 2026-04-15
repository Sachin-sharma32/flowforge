'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { createWorkflow } from '@/stores/workflow-slice';
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
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerType, setTriggerType] = useState('manual');
  const [folderId, setFolderId] = useState('');
  const dispatch = useAppDispatch();
  const { currentWorkspace } = useAppSelector((state) => state.workspace);
  const folders = useAppSelector((state) => state.folder.folders);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (currentWorkspace?.id) {
      dispatch(fetchFolders({ workspaceId: currentWorkspace.id }));
    }
  }, [currentWorkspace?.id, dispatch]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace?.id || !name.trim()) return;

    setIsCreating(true);

    try {
      const result = await dispatch(
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

      router.push(`/workflows/${result.id || (result as any)._id}/edit`);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Failed to create workflow',
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="relative grid h-screen grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px]">
      <div className="dot-grid pointer-events-none absolute inset-0 opacity-40" />
      <section className="relative border-b border-border/60 px-6 py-8 lg:border-b-0 lg:border-r lg:px-10 lg:py-10">
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
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-primary">
              Workflow Creation
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight">
              Create a production-ready automation
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
              Define the trigger now, then we open a full-screen static step builder where you can
              configure every step without draggable chaos.
            </p>
          </div>

          <form
            onSubmit={handleCreate}
            className="mt-8 space-y-8"
            data-testid="workflow-create-form"
          >
            <div className="rounded-2xl border border-border/60 bg-card/40 p-6">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
                <LayoutTemplate className="h-4 w-4 text-primary" />
                Basic Details
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium">
                    Workflow Name
                  </label>
                  <Input
                    id="name"
                    placeholder="e.g., Route New Leads To Sales"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    data-testid="workflow-name-input"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="description" className="text-sm font-medium">
                    Description
                  </label>
                  <Input
                    id="description"
                    placeholder="Describe what success looks like for this flow"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    data-testid="workflow-description-input"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="folder" className="text-sm font-medium">
                    Folder
                  </label>
                  <Select
                    value={folderId || 'uncategorized'}
                    onValueChange={(value) => setFolderId(value === 'uncategorized' ? '' : value)}
                  >
                    <SelectTrigger id="folder" className="h-12 rounded-xl bg-background/60">
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
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border/60 bg-card/40 p-6">
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
                        : 'border-border/70 hover:border-primary/30 hover:bg-accent/40'
                    }`}
                  >
                    <trigger.icon
                      className={`mb-2 h-5 w-5 ${
                        triggerType === trigger.type ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    />
                    <p className="text-sm font-semibold">{trigger.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{trigger.description}</p>
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
                disabled={isCreating || !name.trim()}
                data-testid="workflow-create-submit"
              >
                {isCreating ? 'Creating...' : 'Create & Open Editor'}
                {!isCreating && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            </div>
          </form>
        </div>
      </section>

      <aside className="relative hidden bg-gradient-to-br from-primary/10 via-background to-background px-8 py-10 lg:block">
        <div className="space-y-4">
          <Alert>
            <Lightbulb className="h-4 w-4" />
            <AlertTitle>Start with a clear trigger</AlertTitle>
            <AlertDescription>
              Choose how the flow starts first, then add steps in order. Trigger choice affects what
              inputs are available in later steps.
            </AlertDescription>
          </Alert>
          <Alert>
            <Lightbulb className="h-4 w-4" />
            <AlertTitle>Keep step names action-oriented</AlertTitle>
            <AlertDescription>
              Use names like “Fetch New Lead” and “Send Slack Alert” so debugging and handoffs stay
              fast for your team.
            </AlertDescription>
          </Alert>
          <Alert>
            <Lightbulb className="h-4 w-4" />
            <AlertTitle>Validate branch paths early</AlertTitle>
            <AlertDescription>
              If you add condition steps, set true/false branches right away to prevent broken flow
              checks when autosave runs.
            </AlertDescription>
          </Alert>
        </div>
      </aside>
    </div>
  );
}
