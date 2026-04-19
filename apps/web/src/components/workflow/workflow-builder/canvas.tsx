'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  CircleDot,
  Plus,
  Trash2,
  ArrowDown,
  ArrowUp,
  ChevronsUpDown,
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ConfirmActionDialog } from '@/components/ui/confirm-action-dialog';
import { TypographyH2, TypographyMuted, TypographySmall } from '@/components/ui/typography';
import { toast } from 'sonner';
import {
  STEP_TEMPLATES,
  STEP_TEMPLATE_BY_TYPE,
  type BuilderStepType,
  validateStepConfig,
} from './step-catalog';

interface WorkflowStep {
  id: string;
  type: string;
  name: string;
  config: Record<string, unknown>;
  position: { x: number; y: number };
  connections: Array<{ targetStepId: string; label: string }>;
}

interface CanvasProps {
  workflow: {
    trigger: { type: string; config: Record<string, unknown> };
    steps: WorkflowStep[];
  };
  onSave: (steps: unknown[]) => Promise<void>;
  onDraftChange?: (steps: unknown[]) => void;
  autoSave?: boolean;
}

interface BuilderStep {
  id: string;
  type: BuilderStepType;
  name: string;
  config: Record<string, unknown>;
  trueStepId: string | null;
  falseStepId: string | null;
}

function toBuilderSteps(steps: WorkflowStep[]): BuilderStep[] {
  return steps.map((step) => {
    const template = STEP_TEMPLATE_BY_TYPE[step.type as BuilderStepType];
    const trueConnection = step.connections.find((connection) => connection.label === 'true');
    const falseConnection = step.connections.find((connection) => connection.label === 'false');

    return {
      id: step.id,
      type: template ? (step.type as BuilderStepType) : 'http_request',
      name: step.name || template?.defaultName || 'Step',
      config: step.config || {},
      trueStepId: trueConnection?.targetStepId || null,
      falseStepId: falseConnection?.targetStepId || null,
    };
  });
}

function fromBuilderSteps(steps: BuilderStep[]): WorkflowStep[] {
  return steps.map((step, index) => {
    const connections: Array<{ targetStepId: string; label: string }> = [];

    if (step.type === 'condition') {
      if (step.trueStepId) {
        connections.push({ targetStepId: step.trueStepId, label: 'true' });
      }
      if (step.falseStepId) {
        connections.push({ targetStepId: step.falseStepId, label: 'false' });
      }
    } else if (steps[index + 1]) {
      connections.push({ targetStepId: steps[index + 1].id, label: 'next' });
    }

    return {
      id: step.id,
      type: step.type,
      name: step.name,
      config: normalizeStepConfig(step),
      position: { x: 0, y: index * 160 },
      connections,
    };
  });
}

function normalizeStepConfig(step: BuilderStep): Record<string, unknown> {
  if (step.type !== 'delay') {
    return step.config;
  }

  const durationMs = Number(step.config.durationMs);
  return {
    ...step.config,
    durationMs: Number.isFinite(durationMs) ? durationMs : 1000,
  };
}

function getStepDisplayName(step: BuilderStep): string {
  return step.name.trim() || STEP_TEMPLATE_BY_TYPE[step.type].defaultName;
}

function detectCycle(steps: WorkflowStep[]): boolean {
  const adjacency = new Map<string, string[]>();
  for (const step of steps) {
    adjacency.set(
      step.id,
      step.connections.map((connection) => connection.targetStepId),
    );
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();

  const dfs = (node: string): boolean => {
    if (visiting.has(node)) {
      return true;
    }
    if (visited.has(node)) {
      return false;
    }

    visiting.add(node);
    for (const next of adjacency.get(node) || []) {
      if (!adjacency.has(next)) {
        continue;
      }
      if (dfs(next)) {
        return true;
      }
    }
    visiting.delete(node);
    visited.add(node);
    return false;
  };

  for (const step of steps) {
    if (dfs(step.id)) {
      return true;
    }
  }

  return false;
}

function collectFlowIssues(builderSteps: BuilderStep[]): string[] {
  const issues: string[] = [];

  if (builderSteps.length === 0) {
    issues.push('Add at least one step to save a workflow.');
    return issues;
  }

  const ids = new Set<string>();
  for (const step of builderSteps) {
    if (ids.has(step.id)) {
      issues.push(`Duplicate step id detected for "${getStepDisplayName(step)}".`);
    }
    ids.add(step.id);

    if (!step.name.trim()) {
      issues.push(`Step "${STEP_TEMPLATE_BY_TYPE[step.type].label}" needs a name.`);
    }

    const configErrors = validateStepConfig(step.type, step.config);
    for (const error of configErrors) {
      issues.push(`${getStepDisplayName(step)}: ${error}`);
    }
  }

  for (let index = 0; index < builderSteps.length; index += 1) {
    const step = builderSteps[index];
    if (step.type !== 'condition') {
      continue;
    }

    if (!step.trueStepId && !step.falseStepId) {
      issues.push(`${getStepDisplayName(step)}: choose at least one branch target.`);
    }

    const conditionTargets = [step.trueStepId, step.falseStepId].filter(Boolean) as string[];

    for (const targetId of conditionTargets) {
      if (!ids.has(targetId)) {
        issues.push(`${getStepDisplayName(step)} points to a missing branch step.`);
      }

      const targetIndex = builderSteps.findIndex((candidate) => candidate.id === targetId);
      if (targetIndex !== -1 && targetIndex <= index) {
        issues.push(
          `${getStepDisplayName(step)} branches must point to a later step to keep flow deterministic.`,
        );
      }
    }
  }

  const persistedSteps = fromBuilderSteps(builderSteps);
  if (detectCycle(persistedSteps)) {
    issues.push('Workflow contains a circular connection.');
  }

  return issues;
}

function createStepId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `step-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const SELECT_NONE_VALUE = '__flowforge_none__';

export function Canvas({ workflow, onSave, onDraftChange, autoSave = true }: CanvasProps) {
  const [steps, setSteps] = useState<BuilderStep[]>(() => toBuilderSteps(workflow.steps));
  const [selectedStepId, setSelectedStepId] = useState<string | null>(
    workflow.steps[0]?.id || null,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>(
    'idle',
  );
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingDeleteStepId, setPendingDeleteStepId] = useState<string | null>(null);
  const [draggedStepId, setDraggedStepId] = useState<string | null>(null);
  const [dragOverStepId, setDragOverStepId] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const isSavingRef = useRef(false);
  const latestStepsRef = useRef(steps);

  const selectedStep = steps.find((step) => step.id === selectedStepId) || null;

  const issues = useMemo(() => collectFlowIssues(steps), [steps]);

  const groupedTemplates = useMemo(() => {
    return {
      core: STEP_TEMPLATES.filter((template) => template.category === 'core'),
      communication: STEP_TEMPLATES.filter((template) => template.category === 'communication'),
      integrations: STEP_TEMPLATES.filter((template) => template.category === 'integrations'),
    };
  }, []);

  const addStep = (type: BuilderStepType) => {
    const template = STEP_TEMPLATE_BY_TYPE[type];
    const newStep: BuilderStep = {
      id: createStepId(),
      type,
      name: template.defaultName,
      config: { ...template.defaultConfig },
      trueStepId: null,
      falseStepId: null,
    };

    setSteps((current) => {
      const next = [...current, newStep];
      return next;
    });
    setSelectedStepId(newStep.id);
    setHasUnsavedChanges(true);
  };

  const removeStep = (stepId: string) => {
    setSteps((current) => {
      const filtered = current.filter((step) => step.id !== stepId);
      return filtered.map((step) => ({
        ...step,
        trueStepId: step.trueStepId === stepId ? null : step.trueStepId,
        falseStepId: step.falseStepId === stepId ? null : step.falseStepId,
      }));
    });

    if (selectedStepId === stepId) {
      const nextSelected = steps.find((step) => step.id !== stepId);
      setSelectedStepId(nextSelected?.id || null);
    }

    setHasUnsavedChanges(true);
  };

  const moveStep = (stepId: string, direction: 'up' | 'down') => {
    setSteps((current) => {
      const index = current.findIndex((step) => step.id === stepId);
      if (index === -1) {
        return current;
      }

      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= current.length) {
        return current;
      }

      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(targetIndex, 0, item);
      return next;
    });

    setHasUnsavedChanges(true);
  };

  const updateStep = (stepId: string, updater: (step: BuilderStep) => BuilderStep) => {
    setSteps((current) => current.map((step) => (step.id === stepId ? updater(step) : step)));
    setHasUnsavedChanges(true);
  };

  const reorderSteps = (sourceStepId: string, targetStepId: string) => {
    if (sourceStepId === targetStepId) return;
    setSteps((current) => {
      const sourceIndex = current.findIndex((step) => step.id === sourceStepId);
      const targetIndex = current.findIndex((step) => step.id === targetStepId);
      if (sourceIndex === -1 || targetIndex === -1) return current;
      const next = [...current];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
    setHasUnsavedChanges(true);
  };

  const persistSteps = useCallback(
    async (nextSteps: BuilderStep[]) => {
      if (isSavingRef.current) return;

      isSavingRef.current = true;
      if (mountedRef.current) {
        setIsSaving(true);
        setAutoSaveStatus('saving');
      }

      try {
        const payload = fromBuilderSteps(nextSteps);
        await onSave(payload);
        if (mountedRef.current) {
          setAutoSaveStatus('saved');
          setHasUnsavedChanges(false);
        }
      } catch (error) {
        if (mountedRef.current) {
          setAutoSaveStatus('error');
          toast.error('Auto-save failed', {
            description: error instanceof Error ? error.message : 'Failed to save workflow.',
          });
        }
      } finally {
        isSavingRef.current = false;
        if (mountedRef.current) {
          setIsSaving(false);
        }
      }
    },
    [onSave],
  );

  useEffect(() => {
    latestStepsRef.current = steps;
    onDraftChange?.(fromBuilderSteps(steps));
  }, [steps, onDraftChange]);

  useEffect(() => {
    if (!autoSave) return;
    if (!hasUnsavedChanges) return;

    const timeout = window.setTimeout(() => {
      void persistSteps(latestStepsRef.current);
    }, 900);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [hasUnsavedChanges, persistSteps, autoSave]);

  useEffect(() => {
    if (!autoSave) return;
    const flushOnLeave = () => {
      if (!hasUnsavedChanges || isSavingRef.current) return;
      void persistSteps(latestStepsRef.current);
    };

    window.addEventListener('beforeunload', flushOnLeave);
    window.addEventListener('pagehide', flushOnLeave);
    return () => {
      window.removeEventListener('beforeunload', flushOnLeave);
      window.removeEventListener('pagehide', flushOnLeave);
    };
  }, [hasUnsavedChanges, persistSteps, autoSave]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (!autoSave) return;
      if (hasUnsavedChanges && !isSavingRef.current) {
        void persistSteps(latestStepsRef.current);
      }
    };
  }, [hasUnsavedChanges, persistSteps, autoSave]);

  const selectedIndex = selectedStep ? steps.findIndex((step) => step.id === selectedStep.id) : -1;
  const branchTargets =
    selectedIndex === -1
      ? []
      : steps.filter((step, index) => step.id !== selectedStep?.id && index > selectedIndex);

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

  return (
    <div className="grid h-full min-h-0 grid-cols-1 overflow-hidden lg:grid-cols-[300px_minmax(0,1fr)_380px]">
      <aside className="border-b border-border bg-card p-4 lg:border-b-0 lg:border-r lg:p-6">
        <div className="mb-5">
          <TypographySmall className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
            Step Library
          </TypographySmall>
          <TypographyH2 className="mt-2 text-xl">Build Your Flow</TypographyH2>
          <TypographyMuted className="mt-1">
            Steps run top-. Reorder cleanly with drag-and-drop.
          </TypographyMuted>
        </div>

        <div className="no-scrollbar space-y-5 overflow-y-auto lg:max-h-[calc(100vh-16rem)]">
          {(['core', 'communication', 'integrations'] as const).map((category) => (
            <Collapsible key={category} defaultOpen>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="mb-2 flex w-full items-center justify-between text-xs font-semibold uppercase tracking-normal text-muted-foreground"
                >
                  {category}
                  <ChevronsUpDown className="h-3.5 w-3.5" />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-2">
                {groupedTemplates[category].map((template) => (
                  <button
                    key={template.type}
                    type="button"
                    onClick={() => addStep(template.type)}
                    className="w-full rounded-xl border border-border bg-background p-3 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
                  >
                    <div className="flex items-center gap-2.5">
                      <template.icon className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">{template.label}</span>
                    </div>
                    <TypographyMuted className="mt-1 text-xs">
                      {template.description}
                    </TypographyMuted>
                  </button>
                ))}
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </aside>

      <section className="relative flex min-h-0 flex-col border-b border-border lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between border-b border-border px-5 py-4 lg:px-8">
          <div>
            <TypographySmall className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
              Workflow Flow
            </TypographySmall>
            <TypographyH2 className="mt-1 text-lg">Trigger + Steps</TypographyH2>
          </div>

          <TypographyMuted className="text-xs">
            {isSaving
              ? 'Saving...'
              : autoSaveStatus === 'saved'
                ? 'Auto-saved'
                : autoSaveStatus === 'error'
                  ? 'Auto-save failed'
                  : hasUnsavedChanges
                    ? 'Unsaved changes'
                    : 'All changes saved'}
          </TypographyMuted>
        </div>

        <div
          className="bg-muted/30 relative min-h-0 flex-1 overflow-y-auto px-5 py-4 lg:px-8 lg:py-6"
          onMouseMove={handleBuilderSpotlightMove}
          onMouseLeave={handleBuilderSpotlightLeave}
        >
          <div className="mx-auto max-w-3xl space-y-4">
            <div className="rounded-lg border border-primary/30 bg-primary/5 px-5 py-4">
              <TypographySmall className="text-xs font-semibold uppercase tracking-normal text-primary">
                Trigger
              </TypographySmall>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold">{workflow.trigger.type} trigger</span>
                </div>
                <span className="text-xs text-muted-foreground">always starts the flow</span>
              </div>
            </div>

            {steps.map((step, index) => {
              const template = STEP_TEMPLATE_BY_TYPE[step.type];
              const isSelected = step.id === selectedStepId;

              return (
                <button
                  key={step.id}
                  type="button"
                  draggable
                  onClick={() => setSelectedStepId(step.id)}
                  onDragStart={() => setDraggedStepId(step.id)}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragOverStepId(step.id);
                  }}
                  onDragEnd={() => {
                    setDraggedStepId(null);
                    setDragOverStepId(null);
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    if (draggedStepId) {
                      reorderSteps(draggedStepId, step.id);
                    }
                    setDraggedStepId(null);
                    setDragOverStepId(null);
                  }}
                  className={cn(
                    'w-full rounded-lg border p-4 text-left transition-colors',
                    isSelected
                      ? 'border-primary/50 bg-primary/5 ring-2 ring-primary/15'
                      : 'border-border bg-card hover:border-primary/30 hover:bg-accent/30',
                    draggedStepId === step.id && 'opacity-60',
                    dragOverStepId === step.id &&
                      draggedStepId !== step.id &&
                      'border-primary/60 ring-2 ring-primary/20',
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-background text-xs font-semibold">
                        {index + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <template.icon className="h-4 w-4 text-primary" />
                          <TypographySmall className="text-sm font-semibold">
                            {getStepDisplayName(step)}
                          </TypographySmall>
                        </div>
                        <TypographyMuted className="mt-1 text-xs">{template.label}</TypographyMuted>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="px-1 text-muted-foreground" aria-hidden>
                        ⋮⋮
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(event) => {
                          event.stopPropagation();
                          moveStep(step.id, 'up');
                        }}
                        disabled={index === 0}
                        aria-label="Move step up"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(event) => {
                          event.stopPropagation();
                          moveStep(step.id, 'down');
                        }}
                        disabled={index === steps.length - 1}
                        aria-label="Move step down"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={(event) => {
                          event.stopPropagation();
                          setPendingDeleteStepId(step.id);
                        }}
                        aria-label="Delete step"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                    <CircleDot className="h-3.5 w-3.5" />
                    {step.type === 'condition'
                      ? `Branches: true ${step.trueStepId ? 'set' : 'not set'} / false ${
                          step.falseStepId ? 'set' : 'not set'
                        }`
                      : index === steps.length - 1
                        ? 'Last step: flow ends here'
                        : `Automatically continues to step ${index + 2}`}
                  </div>
                </button>
              );
            })}

            <div className="rounded-lg border border-dashed border-border bg-card p-5 text-center">
              <TypographySmall className="text-sm font-medium">
                Add another step from the library
              </TypographySmall>
              <TypographyMuted className="mt-1 text-xs">
                Drag steps up or down to reorder execution.
              </TypographyMuted>
              <div className="mt-3 flex justify-center">
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs">
                  <Plus className="h-3.5 w-3.5" /> Order snaps after drop
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <aside className="min-h-0 bg-card p-4 lg:p-6">
        <div className="flex h-full min-h-0 flex-col">
          <div>
            <TypographySmall className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
              Step Config
            </TypographySmall>
            <TypographyH2 className="mt-1 text-lg">
              {selectedStep ? getStepDisplayName(selectedStep) : 'Select a step'}
            </TypographyH2>
          </div>

          <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
            {!selectedStep ? (
              <div className="rounded-lg border border-dashed border-border bg-background p-5 text-sm text-muted-foreground">
                Choose a step to edit name, settings, and branch behavior.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                    Step Name
                  </label>
                  <Input
                    value={selectedStep.name}
                    onChange={(event) =>
                      updateStep(selectedStep.id, (current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Describe this step"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                    Step Type
                  </label>
                  <div className="rounded-xl border border-border bg-background px-4 py-3 text-sm">
                    {STEP_TEMPLATE_BY_TYPE[selectedStep.type].label}
                  </div>
                </div>

                {selectedStep.type === 'http_request' && (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                        URL
                      </label>
                      <Input
                        value={String(selectedStep.config.url || '')}
                        onChange={(event) =>
                          updateStep(selectedStep.id, (current) => ({
                            ...current,
                            config: { ...current.config, url: event.target.value },
                          }))
                        }
                        placeholder="https://api.example.com/data"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                        Method
                      </label>
                      <Select
                        value={String(selectedStep.config.method || 'GET')}
                        onValueChange={(value) =>
                          updateStep(selectedStep.id, (current) => ({
                            ...current,
                            config: { ...current.config, method: value },
                          }))
                        }
                      >
                        <SelectTrigger className="h-12 rounded-xl bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="GET">GET</SelectItem>
                          <SelectItem value="POST">POST</SelectItem>
                          <SelectItem value="PUT">PUT</SelectItem>
                          <SelectItem value="PATCH">PATCH</SelectItem>
                          <SelectItem value="DELETE">DELETE</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {selectedStep.type === 'condition' && (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                        Field
                      </label>
                      <Input
                        value={String(selectedStep.config.field || '')}
                        onChange={(event) =>
                          updateStep(selectedStep.id, (current) => ({
                            ...current,
                            config: { ...current.config, field: event.target.value },
                          }))
                        }
                        placeholder="body.status"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                        Operator
                      </label>
                      <Select
                        value={String(selectedStep.config.operator || 'equals')}
                        onValueChange={(value) =>
                          updateStep(selectedStep.id, (current) => ({
                            ...current,
                            config: { ...current.config, operator: value },
                          }))
                        }
                      >
                        <SelectTrigger className="h-12 rounded-xl bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="equals">Equals</SelectItem>
                          <SelectItem value="not_equals">Not equals</SelectItem>
                          <SelectItem value="contains">Contains</SelectItem>
                          <SelectItem value="greater_than">Greater than</SelectItem>
                          <SelectItem value="less_than">Less than</SelectItem>
                          <SelectItem value="exists">Exists</SelectItem>
                          <SelectItem value="not_exists">Not exists</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                        Value
                      </label>
                      <Input
                        value={String(selectedStep.config.value || '')}
                        onChange={(event) =>
                          updateStep(selectedStep.id, (current) => ({
                            ...current,
                            config: { ...current.config, value: event.target.value },
                          }))
                        }
                        placeholder="active"
                      />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                          True Branch
                        </label>
                        <Select
                          value={selectedStep.trueStepId || SELECT_NONE_VALUE}
                          onValueChange={(value) =>
                            updateStep(selectedStep.id, (current) => ({
                              ...current,
                              trueStepId: value === SELECT_NONE_VALUE ? null : value,
                            }))
                          }
                        >
                          <SelectTrigger className="h-12 rounded-xl bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={SELECT_NONE_VALUE}>End flow</SelectItem>
                            {branchTargets.map((target) => (
                              <SelectItem key={target.id} value={target.id}>
                                {getStepDisplayName(target)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                          False Branch
                        </label>
                        <Select
                          value={selectedStep.falseStepId || SELECT_NONE_VALUE}
                          onValueChange={(value) =>
                            updateStep(selectedStep.id, (current) => ({
                              ...current,
                              falseStepId: value === SELECT_NONE_VALUE ? null : value,
                            }))
                          }
                        >
                          <SelectTrigger className="h-12 rounded-xl bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={SELECT_NONE_VALUE}>End flow</SelectItem>
                            {branchTargets.map((target) => (
                              <SelectItem key={target.id} value={target.id}>
                                {getStepDisplayName(target)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </>
                )}

                {selectedStep.type === 'transform' && (
                  <>
                    <TypographyMuted className="text-xs">
                      Quick mapping editor for one mapping entry.
                    </TypographyMuted>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                          Source Path
                        </label>
                        <Input
                          value={String((selectedStep.config.mappings as any)?.[0]?.source || '')}
                          onChange={(event) =>
                            updateStep(selectedStep.id, (current) => {
                              const previous =
                                (current.config.mappings as Array<Record<string, string>>) || [];
                              const mapping = {
                                ...(previous[0] || {}),
                                source: event.target.value,
                              };
                              return {
                                ...current,
                                config: { ...current.config, mappings: [mapping] },
                              };
                            })
                          }
                          placeholder="body.email"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                          Target Path
                        </label>
                        <Input
                          value={String((selectedStep.config.mappings as any)?.[0]?.target || '')}
                          onChange={(event) =>
                            updateStep(selectedStep.id, (current) => {
                              const previous =
                                (current.config.mappings as Array<Record<string, string>>) || [];
                              const mapping = {
                                ...(previous[0] || {}),
                                target: event.target.value,
                              };
                              return {
                                ...current,
                                config: { ...current.config, mappings: [mapping] },
                              };
                            })
                          }
                          placeholder="contact.email"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                        Transform
                      </label>
                      <Select
                        value={String(
                          (selectedStep.config.mappings as any)?.[0]?.transform ||
                            SELECT_NONE_VALUE,
                        )}
                        onValueChange={(value) =>
                          updateStep(selectedStep.id, (current) => {
                            const previous =
                              (current.config.mappings as Array<Record<string, string>>) || [];
                            const mapping = { ...(previous[0] || {}) };
                            if (value !== SELECT_NONE_VALUE) {
                              mapping.transform = value;
                            } else {
                              delete mapping.transform;
                            }
                            return {
                              ...current,
                              config: { ...current.config, mappings: [mapping] },
                            };
                          })
                        }
                      >
                        <SelectTrigger className="h-12 rounded-xl bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={SELECT_NONE_VALUE}>No transform</SelectItem>
                          <SelectItem value="lowercase">lowercase</SelectItem>
                          <SelectItem value="uppercase">uppercase</SelectItem>
                          <SelectItem value="trim">trim</SelectItem>
                          <SelectItem value="number">number</SelectItem>
                          <SelectItem value="boolean">boolean</SelectItem>
                          <SelectItem value="json_parse">json_parse</SelectItem>
                          <SelectItem value="stringify">stringify</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {selectedStep.type === 'delay' && (
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                      Duration (milliseconds)
                    </label>
                    <Input
                      type="number"
                      min={1}
                      value={String(selectedStep.config.durationMs || 1000)}
                      onChange={(event) =>
                        updateStep(selectedStep.id, (current) => ({
                          ...current,
                          config: {
                            ...current.config,
                            durationMs: Number(event.target.value || '0'),
                          },
                        }))
                      }
                    />
                  </div>
                )}

                {(selectedStep.type === 'send_email' || selectedStep.type === 'gmail') && (
                  <div className="space-y-3">
                    {selectedStep.type === 'gmail' && (
                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                          Gmail Operation
                        </label>
                        <Select
                          value={String(selectedStep.config.operation || 'send_email')}
                          onValueChange={(value) =>
                            updateStep(selectedStep.id, (current) => ({
                              ...current,
                              config: { ...current.config, operation: value },
                            }))
                          }
                        >
                          <SelectTrigger className="h-12 rounded-xl bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="send_email">send_email</SelectItem>
                            <SelectItem value="create_draft">create_draft</SelectItem>
                            <SelectItem value="list_messages">list_messages</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {selectedStep.type === 'gmail' && (
                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                          Access Token
                        </label>
                        <Input
                          type="password"
                          value={String(selectedStep.config.accessToken || '')}
                          onChange={(event) =>
                            updateStep(selectedStep.id, (current) => ({
                              ...current,
                              config: { ...current.config, accessToken: event.target.value },
                            }))
                          }
                          placeholder="ya29..."
                        />
                      </div>
                    )}

                    {String(selectedStep.config.operation || 'send_email') !== 'list_messages' && (
                      <>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                            To
                          </label>
                          <Input
                            value={String(selectedStep.config.to || '')}
                            onChange={(event) =>
                              updateStep(selectedStep.id, (current) => ({
                                ...current,
                                config: { ...current.config, to: event.target.value },
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                            Subject
                          </label>
                          <Input
                            value={String(selectedStep.config.subject || '')}
                            onChange={(event) =>
                              updateStep(selectedStep.id, (current) => ({
                                ...current,
                                config: { ...current.config, subject: event.target.value },
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                            Body
                          </label>
                          <Textarea
                            className="min-h-[110px] rounded-xl bg-background"
                            value={String(selectedStep.config.body || '')}
                            onChange={(event) =>
                              updateStep(selectedStep.id, (current) => ({
                                ...current,
                                config: { ...current.config, body: event.target.value },
                              }))
                            }
                          />
                        </div>
                      </>
                    )}

                    {selectedStep.type === 'gmail' &&
                      String(selectedStep.config.operation || 'send_email') === 'list_messages' && (
                        <>
                          <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                              Search Query
                            </label>
                            <Input
                              value={String(selectedStep.config.query || '')}
                              onChange={(event) =>
                                updateStep(selectedStep.id, (current) => ({
                                  ...current,
                                  config: { ...current.config, query: event.target.value },
                                }))
                              }
                              placeholder="from:customer@example.com"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                              Max Results
                            </label>
                            <Input
                              type="number"
                              min={1}
                              max={50}
                              value={String(selectedStep.config.maxResults || 10)}
                              onChange={(event) =>
                                updateStep(selectedStep.id, (current) => ({
                                  ...current,
                                  config: {
                                    ...current.config,
                                    maxResults: Number(event.target.value || '10'),
                                  },
                                }))
                              }
                            />
                          </div>
                        </>
                      )}
                  </div>
                )}

                {selectedStep.type === 'slack_message' && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                        Webhook URL
                      </label>
                      <Input
                        value={String(selectedStep.config.webhookUrl || '')}
                        onChange={(event) =>
                          updateStep(selectedStep.id, (current) => ({
                            ...current,
                            config: { ...current.config, webhookUrl: event.target.value },
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                        Message
                      </label>
                      <Textarea
                        className="min-h-[110px] rounded-xl bg-background"
                        value={String(selectedStep.config.message || '')}
                        onChange={(event) =>
                          updateStep(selectedStep.id, (current) => ({
                            ...current,
                            config: { ...current.config, message: event.target.value },
                          }))
                        }
                      />
                    </div>
                  </div>
                )}

                {selectedStep.type === 'google_drive' && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                        Access Token
                      </label>
                      <Input
                        type="password"
                        value={String(selectedStep.config.accessToken || '')}
                        onChange={(event) =>
                          updateStep(selectedStep.id, (current) => ({
                            ...current,
                            config: { ...current.config, accessToken: event.target.value },
                          }))
                        }
                        placeholder="ya29..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                        Operation
                      </label>
                      <Select
                        value={String(selectedStep.config.operation || 'list_files')}
                        onValueChange={(value) =>
                          updateStep(selectedStep.id, (current) => ({
                            ...current,
                            config: { ...current.config, operation: value },
                          }))
                        }
                      >
                        <SelectTrigger className="h-12 rounded-xl bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="list_files">list_files</SelectItem>
                          <SelectItem value="create_folder">create_folder</SelectItem>
                          <SelectItem value="upload_text_file">upload_text_file</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                        Folder ID (optional)
                      </label>
                      <Input
                        value={String(selectedStep.config.folderId || '')}
                        onChange={(event) =>
                          updateStep(selectedStep.id, (current) => ({
                            ...current,
                            config: { ...current.config, folderId: event.target.value },
                          }))
                        }
                      />
                    </div>

                    {String(selectedStep.config.operation || 'list_files') === 'list_files' && (
                      <>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                            Query (optional)
                          </label>
                          <Input
                            value={String(selectedStep.config.query || '')}
                            onChange={(event) =>
                              updateStep(selectedStep.id, (current) => ({
                                ...current,
                                config: { ...current.config, query: event.target.value },
                              }))
                            }
                            placeholder="mimeType contains 'spreadsheet'"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                            Page Size
                          </label>
                          <Input
                            type="number"
                            min={1}
                            max={100}
                            value={String(selectedStep.config.pageSize || 10)}
                            onChange={(event) =>
                              updateStep(selectedStep.id, (current) => ({
                                ...current,
                                config: {
                                  ...current.config,
                                  pageSize: Number(event.target.value || '10'),
                                },
                              }))
                            }
                          />
                        </div>
                      </>
                    )}

                    {String(selectedStep.config.operation || 'list_files') !== 'list_files' && (
                      <>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                            Name
                          </label>
                          <Input
                            value={String(selectedStep.config.name || '')}
                            onChange={(event) =>
                              updateStep(selectedStep.id, (current) => ({
                                ...current,
                                config: { ...current.config, name: event.target.value },
                              }))
                            }
                          />
                        </div>
                        {String(selectedStep.config.operation || 'list_files') ===
                          'upload_text_file' && (
                          <>
                            <div className="space-y-2">
                              <label className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                                MIME Type
                              </label>
                              <Input
                                value={String(selectedStep.config.mimeType || 'text/plain')}
                                onChange={(event) =>
                                  updateStep(selectedStep.id, (current) => ({
                                    ...current,
                                    config: { ...current.config, mimeType: event.target.value },
                                  }))
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                                Content
                              </label>
                              <Textarea
                                className="min-h-[110px] rounded-xl bg-background"
                                value={String(selectedStep.config.content || '')}
                                onChange={(event) =>
                                  updateStep(selectedStep.id, (current) => ({
                                    ...current,
                                    config: { ...current.config, content: event.target.value },
                                  }))
                                }
                              />
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>
                )}

                {selectedStep.type === 'google_calendar' && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                        Access Token
                      </label>
                      <Input
                        type="password"
                        value={String(selectedStep.config.accessToken || '')}
                        onChange={(event) =>
                          updateStep(selectedStep.id, (current) => ({
                            ...current,
                            config: { ...current.config, accessToken: event.target.value },
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                        Operation
                      </label>
                      <Select
                        value={String(selectedStep.config.operation || 'create_event')}
                        onValueChange={(value) =>
                          updateStep(selectedStep.id, (current) => ({
                            ...current,
                            config: { ...current.config, operation: value },
                          }))
                        }
                      >
                        <SelectTrigger className="h-12 rounded-xl bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="create_event">create_event</SelectItem>
                          <SelectItem value="list_events">list_events</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                        Calendar ID
                      </label>
                      <Input
                        value={String(selectedStep.config.calendarId || 'primary')}
                        onChange={(event) =>
                          updateStep(selectedStep.id, (current) => ({
                            ...current,
                            config: { ...current.config, calendarId: event.target.value },
                          }))
                        }
                      />
                    </div>

                    {String(selectedStep.config.operation || 'create_event') === 'create_event' ? (
                      <>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                            Summary
                          </label>
                          <Input
                            value={String(selectedStep.config.summary || '')}
                            onChange={(event) =>
                              updateStep(selectedStep.id, (current) => ({
                                ...current,
                                config: { ...current.config, summary: event.target.value },
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                            Start (ISO)
                          </label>
                          <Input
                            value={String(selectedStep.config.start || '')}
                            onChange={(event) =>
                              updateStep(selectedStep.id, (current) => ({
                                ...current,
                                config: { ...current.config, start: event.target.value },
                              }))
                            }
                            placeholder="2026-06-10T14:00:00Z"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                            End (ISO)
                          </label>
                          <Input
                            value={String(selectedStep.config.end || '')}
                            onChange={(event) =>
                              updateStep(selectedStep.id, (current) => ({
                                ...current,
                                config: { ...current.config, end: event.target.value },
                              }))
                            }
                            placeholder="2026-06-10T15:00:00Z"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                            Time Zone
                          </label>
                          <Input
                            value={String(selectedStep.config.timeZone || 'UTC')}
                            onChange={(event) =>
                              updateStep(selectedStep.id, (current) => ({
                                ...current,
                                config: { ...current.config, timeZone: event.target.value },
                              }))
                            }
                            placeholder="America/New_York"
                          />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                            Time Min (ISO)
                          </label>
                          <Input
                            value={String(selectedStep.config.timeMin || '')}
                            onChange={(event) =>
                              updateStep(selectedStep.id, (current) => ({
                                ...current,
                                config: { ...current.config, timeMin: event.target.value },
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                            Time Max (ISO)
                          </label>
                          <Input
                            value={String(selectedStep.config.timeMax || '')}
                            onChange={(event) =>
                              updateStep(selectedStep.id, (current) => ({
                                ...current,
                                config: { ...current.config, timeMax: event.target.value },
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                            Max Results
                          </label>
                          <Input
                            type="number"
                            min={1}
                            max={50}
                            value={String(selectedStep.config.maxResults || 10)}
                            onChange={(event) =>
                              updateStep(selectedStep.id, (current) => ({
                                ...current,
                                config: {
                                  ...current.config,
                                  maxResults: Number(event.target.value || '10'),
                                },
                              }))
                            }
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}

                {selectedStep.type === 'notion' && (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                        Access Token
                      </label>
                      <Input
                        type="password"
                        value={String(selectedStep.config.accessToken || '')}
                        onChange={(event) =>
                          updateStep(selectedStep.id, (current) => ({
                            ...current,
                            config: { ...current.config, accessToken: event.target.value },
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                        Operation
                      </label>
                      <Select
                        value={String(selectedStep.config.operation || 'create_page')}
                        onValueChange={(value) =>
                          updateStep(selectedStep.id, (current) => ({
                            ...current,
                            config: { ...current.config, operation: value },
                          }))
                        }
                      >
                        <SelectTrigger className="h-12 rounded-xl bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="create_page">create_page</SelectItem>
                          <SelectItem value="append_block">append_block</SelectItem>
                          <SelectItem value="query_database">query_database</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {String(selectedStep.config.operation || 'create_page') === 'create_page' && (
                      <>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                            Parent Type
                          </label>
                          <Select
                            value={String(selectedStep.config.parentType || 'page_id')}
                            onValueChange={(value) =>
                              updateStep(selectedStep.id, (current) => ({
                                ...current,
                                config: { ...current.config, parentType: value },
                              }))
                            }
                          >
                            <SelectTrigger className="h-12 rounded-xl bg-background">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="page_id">page_id</SelectItem>
                              <SelectItem value="database_id">database_id</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                            Parent ID
                          </label>
                          <Input
                            value={String(selectedStep.config.parentId || '')}
                            onChange={(event) =>
                              updateStep(selectedStep.id, (current) => ({
                                ...current,
                                config: { ...current.config, parentId: event.target.value },
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                            Title
                          </label>
                          <Input
                            value={String(selectedStep.config.title || '')}
                            onChange={(event) =>
                              updateStep(selectedStep.id, (current) => ({
                                ...current,
                                config: { ...current.config, title: event.target.value },
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                            Content
                          </label>
                          <Textarea
                            className="min-h-[110px] rounded-xl bg-background"
                            value={String(selectedStep.config.content || '')}
                            onChange={(event) =>
                              updateStep(selectedStep.id, (current) => ({
                                ...current,
                                config: { ...current.config, content: event.target.value },
                              }))
                            }
                          />
                        </div>
                      </>
                    )}

                    {String(selectedStep.config.operation || 'create_page') === 'append_block' && (
                      <>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                            Block ID
                          </label>
                          <Input
                            value={String(selectedStep.config.blockId || '')}
                            onChange={(event) =>
                              updateStep(selectedStep.id, (current) => ({
                                ...current,
                                config: { ...current.config, blockId: event.target.value },
                              }))
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                            Content
                          </label>
                          <Textarea
                            className="min-h-[110px] rounded-xl bg-background"
                            value={String(selectedStep.config.content || '')}
                            onChange={(event) =>
                              updateStep(selectedStep.id, (current) => ({
                                ...current,
                                config: { ...current.config, content: event.target.value },
                              }))
                            }
                          />
                        </div>
                      </>
                    )}

                    {String(selectedStep.config.operation || 'create_page') ===
                      'query_database' && (
                      <div className="space-y-2">
                        <label className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                          Database ID
                        </label>
                        <Input
                          value={String(selectedStep.config.databaseId || '')}
                          onChange={(event) =>
                            updateStep(selectedStep.id, (current) => ({
                              ...current,
                              config: { ...current.config, databaseId: event.target.value },
                            }))
                          }
                        />
                      </div>
                    )}
                  </div>
                )}

                <div className="rounded-xl border border-border bg-background p-3 text-xs text-muted-foreground">
                  Tip: You can reference workflow variables with {'`{{variableName}}`'} in supported
                  text fields.
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 rounded-lg border border-border bg-background p-4">
            <TypographySmall className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
              Flow Checks
            </TypographySmall>
            {issues.length === 0 ? (
              <TypographyMuted className="mt-2 text-sm text-foreground">
                No issues found. Workflow is ready to save.
              </TypographyMuted>
            ) : (
              <ul className="mt-2 space-y-1 text-sm text-destructive">
                {issues.slice(0, 6).map((issue) => (
                  <li key={issue}>• {issue}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </aside>

      <ConfirmActionDialog
        open={Boolean(pendingDeleteStepId)}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteStepId(null);
        }}
        title="Delete step?"
        description="This step will be permanently removed from the workflow."
        confirmLabel="Delete step"
        destructive
        onConfirm={() => {
          if (!pendingDeleteStepId) return;
          removeStep(pendingDeleteStepId);
          setPendingDeleteStepId(null);
        }}
      />
    </div>
  );
}
