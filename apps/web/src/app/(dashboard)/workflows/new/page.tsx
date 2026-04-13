'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppDispatch, useAppSelector } from '@/stores/hooks';
import { createWorkflow } from '@/stores/workflow-slice';
import { Webhook, Clock, MousePointer } from 'lucide-react';

const triggerTypes = [
  {
    type: 'manual',
    label: 'Manual Trigger',
    icon: MousePointer,
    description: 'Trigger manually via button or API call',
  },
  {
    type: 'webhook',
    label: 'Webhook',
    icon: Webhook,
    description: 'Trigger via incoming HTTP request',
  },
  { type: 'cron', label: 'Schedule', icon: Clock, description: 'Trigger on a recurring schedule' },
];

export default function NewWorkflowPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerType, setTriggerType] = useState('manual');
  const dispatch = useAppDispatch();
  const { currentWorkspace } = useAppSelector((state) => state.workspace);
  const [isCreating, setIsCreating] = useState(false);

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
            trigger: { type: triggerType, config: {} },
            steps: [],
          },
        }),
      ).unwrap();
      router.push(`/workflows/${result.id || (result as any)._id}/edit`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Create Workflow</h1>
        <p className="text-muted-foreground">Set up a new automation workflow</p>
      </div>

      <form onSubmit={handleCreate} className="space-y-6" data-testid="workflow-create-form">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="name"
                placeholder="e.g., Process New Orders"
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
                placeholder="What does this workflow do?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                data-testid="workflow-description-input"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Trigger</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-3">
              {triggerTypes.map((trigger) => (
                <button
                  key={trigger.type}
                  type="button"
                  onClick={() => setTriggerType(trigger.type)}
                  data-testid={`workflow-trigger-${trigger.type}`}
                  className={`rounded-lg border p-4 text-left transition-colors ${
                    triggerType === trigger.type ? 'border-primary bg-primary/5' : 'hover:bg-accent'
                  }`}
                >
                  <trigger.icon
                    className={`mb-2 h-5 w-5 ${
                      triggerType === trigger.type ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  />
                  <p className="text-sm font-medium">{trigger.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{trigger.description}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
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
          </Button>
        </div>
      </form>
    </div>
  );
}
