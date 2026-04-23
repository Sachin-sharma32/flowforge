'use client';

import { useState } from 'react';
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
import { useAppSelector } from '@/stores/hooks';
import {
  Webhook,
  Clock,
  MousePointer,
  ArrowRight,
  LayoutTemplate,
  ArrowLeft,
  Lightbulb,
  Shield,
  Sparkles,
} from 'lucide-react';
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

const TemplateCategory = {
  FEATURED: 'featured',
  RECOMMENDED: 'recommended',
  PRODUCTIVITY: 'productivity',
  MARKETING: 'marketing',
  SALES: 'sales',
  OPERATIONS: 'operations',
  DEVELOPER: 'developer',
  OTHER: 'other',
} as const;

const TEMPLATE_CATEGORY_LABELS: Record<string, string> = {
  featured: 'Featured',
  recommended: 'Recommended',
  productivity: 'Productivity',
  marketing: 'Marketing',
  sales: 'Sales',
  operations: 'Operations',
  developer: 'Developer',
  other: 'Other',
};

const categories = Object.values(TemplateCategory).map((key) => ({
  value: key,
  label: TEMPLATE_CATEGORY_LABELS[key],
}));

export default function NewTemplatePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerType, setTriggerType] = useState('manual');
  const [category, setCategory] = useState('other');
  const { user } = useAppSelector((state) => state.auth);

  // Only super admins can access this page
  if (!user?.isSuperAdmin) {
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const templateData = {
      name: name.trim(),
      description,
      category,
      trigger: { type: triggerType, config: {} },
    };

    // Navigate to edit page with template data - template will be created on save
    const encodedData = encodeURIComponent(JSON.stringify(templateData));
    router.push(`/admin/templates/new/edit?data=${encodedData}`);
  };

  return (
    <div className="relative grid h-screen grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px]">
      <section className="bg-muted/30 relative border-b border-border px-6 py-8 lg:border-b-0 lg:border-r lg:px-10 lg:py-10">
        <div className="mx-auto flex h-full w-full max-w-4xl flex-col">
          <div className="mb-5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => router.push('/templates')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back To Templates
            </Button>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <TypographySmall className="text-xs font-semibold uppercase tracking-normal text-primary">
                Super Admin - Global Template Creation
              </TypographySmall>
            </div>
            <TypographyH1 className="mt-3">Create a workflow template</TypographyH1>
            <TypographyMuted className="mt-3 max-w-2xl">
              Create a global template that will be available to all users across all workspaces.
              Define the basic structure now, then add steps in the editor.
            </TypographyMuted>
          </div>

          <form
            onSubmit={handleCreate}
            className="mt-8 space-y-8"
            data-testid="template-create-form"
          >
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold">
                <LayoutTemplate className="h-4 w-4 text-primary" />
                Basic Details
              </div>

              <div className="space-y-4">
                <Field>
                  <FieldLabel htmlFor="name">Template Name</FieldLabel>
                  <Input
                    id="name"
                    placeholder="e.g., Route New Leads To Sales"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    data-testid="template-name-input"
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="description">Description</FieldLabel>
                  <Input
                    id="description"
                    placeholder="Describe what this template does and when users should use it"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    data-testid="template-description-input"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="category">Category</FieldLabel>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger id="category" className="h-12 rounded-xl bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
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
                    data-testid={`template-trigger-${trigger.type}`}
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
                data-testid="template-create-cancel"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!name.trim()} data-testid="template-create-submit">
                Open Editor
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>
      </section>

      <aside className="relative hidden bg-muted px-8 py-10 lg:block">
        <div className="space-y-4">
          <Alert className="flex items-start gap-3 border-primary/20 bg-primary/5">
            <Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div>
              <AlertTitle>Super Admin Template</AlertTitle>
              <AlertDescription>
                This template will be visible to all users across all workspaces. Choose a clear
                category so users can find it easily.
              </AlertDescription>
            </div>
          </Alert>
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
              <AlertTitle>Users can customize steps</AlertTitle>
              <AlertDescription>
                When users create workflows from this template, they will be able to customize all
                step configurations to match their needs.
              </AlertDescription>
            </div>
          </Alert>
        </div>
      </aside>
    </div>
  );
}
