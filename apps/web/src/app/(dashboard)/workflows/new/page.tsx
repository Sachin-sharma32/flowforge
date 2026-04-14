'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAppDispatch, useAppSelector } from '@/stores/hooks';
import { createWorkflow } from '@/stores/workflow-slice';
import {
  Webhook,
  Clock,
  MousePointer,
  Sparkles,
  ArrowRight,
  LayoutTemplate,
  ArrowLeft,
} from 'lucide-react';

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
  const dispatch = useAppDispatch();
  const { currentWorkspace } = useAppSelector((state) => state.workspace);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace?.id || !name.trim()) return;

    setError(null);
    setIsCreating(true);

    try {
      const result = await dispatch(
        createWorkflow({
          workspaceId: currentWorkspace.id,
          input: {
            name: name.trim(),
            description,
            trigger: { type: triggerType, config: {} },
            steps: [],
          },
        }),
      ).unwrap();

      router.push(`/workflows/${result.id || (result as any)._id}/edit`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create workflow');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="grid h-screen grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px]">
      <section className="border-b border-border/60 px-6 py-8 lg:border-b-0 lg:border-r lg:px-10 lg:py-10">
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

            {error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

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

      <aside className="hidden bg-gradient-to-br from-primary/10 via-background to-background px-8 py-10 lg:block">
        <div className="rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur">
          <h2 className="text-lg font-semibold">What changed in the new builder</h2>
          <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
            <li>• Static, vertical step order with predictable execution.</li>
            <li>• Full-screen workspace instead of tiny card-contained editor.</li>
            <li>• Built-in flow checks for missing config and broken branches.</li>
            <li>• New integrations: Google Drive, Google Calendar, Gmail, and Notion.</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
