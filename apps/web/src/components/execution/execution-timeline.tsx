'use client';

import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Clock, Loader2, SkipForward } from 'lucide-react';
import type { IExecutionStep } from '@flowforge/shared';
import { formatDuration, intervalToDuration } from 'date-fns';
import { TypographySmall, TypographyMuted } from '@/components/ui/typography';

const statusIcons: Record<string, React.ElementType> = {
  completed: CheckCircle2,
  failed: XCircle,
  running: Loader2,
  pending: Clock,
  skipped: SkipForward,
};

const statusColors: Record<string, string> = {
  completed: 'text-foreground',
  failed: 'text-destructive',
  running: 'text-yellow-500 animate-spin',
  pending: 'text-muted-foreground',
  skipped: 'text-muted-foreground',
};

interface ExecutionTimelineProps {
  steps: IExecutionStep[];
  workflowSteps?: Array<{ id: string; name: string; type: string }>;
}

export function ExecutionTimeline({ steps, workflowSteps }: ExecutionTimelineProps) {
  const getStepName = (stepId: string) => {
    const ws = workflowSteps?.find((s) => s.id === stepId);
    return ws?.name || stepId;
  };

  return (
    <div className="space-y-1">
      {steps.map((step, i) => {
        const Icon = statusIcons[step.status] || Clock;
        return (
          <div key={step.stepId} className="flex gap-3">
            <div className="flex flex-col items-center">
              <Icon className={`h-5 w-5 ${statusColors[step.status]}`} />
              {i < steps.length - 1 && <div className="mt-1 h-full w-px bg-border" />}
            </div>
            <div className="flex-1 pb-4">
              <div className="flex items-center justify-between">
                <TypographySmall className="text-sm font-medium">
                  {getStepName(step.stepId)}
                </TypographySmall>
                <div className="flex items-center gap-2">
                  {step.durationMs !== undefined && (
                    <span className="text-xs text-muted-foreground">
                      {formatDuration(intervalToDuration({ start: 0, end: step.durationMs }))}
                    </span>
                  )}
                  <Badge
                    variant={
                      step.status === 'completed'
                        ? 'success'
                        : step.status === 'failed'
                          ? 'destructive'
                          : step.status === 'running'
                            ? 'warning'
                            : 'secondary'
                    }
                  >
                    {step.status}
                  </Badge>
                </div>
              </div>
              {step.error && (
                <TypographyMuted className="mt-1 rounded bg-destructive/10 p-2 text-xs text-destructive">
                  {step.error}
                </TypographyMuted>
              )}
              {step.output && Object.keys(step.output).length > 0 && (
                <details className="mt-1">
                  <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                    View output
                  </summary>
                  <pre className="mt-1 overflow-auto rounded bg-muted p-2 text-xs">
                    {JSON.stringify(step.output, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
