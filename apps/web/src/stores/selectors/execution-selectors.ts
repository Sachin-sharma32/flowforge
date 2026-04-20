import { createSelector } from '@reduxjs/toolkit';
import type { IExecutionTimelinePoint } from '@flowforge/shared';
import type { RootState } from '@/stores/store';
import { selectWorkflowState } from './workflow-selectors';

const WORKFLOW_TIMELINE_DAYS = 14;

export const selectExecutionState = (state: RootState) => state.execution;

export const selectExecutions = createSelector(
  [selectExecutionState],
  (executionState) => executionState.executions,
);

export const selectCurrentExecution = createSelector(
  [selectExecutionState],
  (executionState) => executionState.currentExecution,
);

export const selectExecutionLoading = createSelector(
  [selectExecutionState],
  (executionState) => executionState.isLoading,
);

export const selectExecutionStats = createSelector(
  [selectExecutionState],
  (executionState) => executionState.stats,
);

export const selectExecutionTimeline = createSelector(
  [selectExecutionState],
  (executionState) => executionState.timeline,
);

export const selectExecutionWorkflowStats = createSelector(
  [selectExecutionState],
  (executionState) => executionState.workflowStats,
);

export const selectDashboardSummary = createSelector(
  [selectExecutionState],
  (executionState) => executionState.dashboardSummary,
);

export const selectWorkflowRecentActivity = createSelector(
  [selectExecutionState],
  (executionState) => executionState.workflowRecentActivity,
);

export const selectExecutionById = createSelector(
  [selectExecutions, (_: RootState, executionId: string) => executionId],
  (executions, executionId) => executions.find((execution) => execution.id === executionId),
);

export const selectDashboardStatValues = createSelector(
  [selectExecutionStats, selectWorkflowState],
  (stats, workflowState) => ({
    workflowCount: workflowState.workflows.length,
    totalExecutions: stats?.total ?? 0,
    successRate: stats?.successRate ?? 0,
    avgDurationMs: stats?.avgDurationMs ?? 0,
  }),
);

export const selectWorkflowExecutionAnalytics = createSelector([selectExecutions], (executions) => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - WORKFLOW_TIMELINE_DAYS);
  startDate.setHours(0, 0, 0, 0);

  const buckets = new Map<string, { total: number; completed: number; failed: number }>();
  for (let i = 0; i <= WORKFLOW_TIMELINE_DAYS; i += 1) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    buckets.set(date.toISOString().split('T')[0], { total: 0, completed: 0, failed: 0 });
  }

  let total = 0;
  let completed = 0;
  let failed = 0;
  let durationSum = 0;
  let durationCount = 0;

  for (const execution of executions) {
    total += 1;

    if (execution.status === 'completed') {
      completed += 1;
    }

    if (execution.status === 'failed') {
      failed += 1;
    }

    if (typeof execution.durationMs === 'number') {
      durationSum += execution.durationMs;
      durationCount += 1;
    }

    if (!execution.createdAt) {
      continue;
    }

    const bucketKey = new Date(execution.createdAt).toISOString().split('T')[0];
    const bucket = buckets.get(bucketKey);

    if (!bucket) {
      continue;
    }

    bucket.total += 1;

    if (execution.status === 'completed') {
      bucket.completed += 1;
    }

    if (execution.status === 'failed') {
      bucket.failed += 1;
    }
  }

  const timeline: IExecutionTimelinePoint[] = Array.from(buckets.entries()).map(
    ([date, values]) => ({
      date,
      ...values,
    }),
  );

  return {
    timeline,
    summary: {
      total,
      completed,
      failed,
      successRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      avgDurationMs: durationCount > 0 ? Math.round(durationSum / durationCount) : 0,
    },
  };
});
