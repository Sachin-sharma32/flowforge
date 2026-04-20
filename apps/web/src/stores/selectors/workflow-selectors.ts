import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '@/stores/store';

export const selectWorkflowState = (state: RootState) => state.workflow;

export const selectWorkflows = createSelector(
  [selectWorkflowState],
  (workflowState) => workflowState.workflows,
);

export const selectCurrentWorkflow = createSelector(
  [selectWorkflowState],
  (workflowState) => workflowState.currentWorkflow,
);

export const selectWorkflowLoading = createSelector(
  [selectWorkflowState],
  (workflowState) => workflowState.isLoading,
);

export const selectWorkflowById = createSelector(
  [selectWorkflows, (_: RootState, workflowId: string) => workflowId],
  (workflows, workflowId) => workflows.find((workflow) => workflow.id === workflowId),
);

export const selectWorkflowCount = createSelector(
  [selectWorkflows],
  (workflows) => workflows.length,
);

export const selectTemplates = createSelector(
  [selectWorkflowState],
  (workflowState) => workflowState.templates,
);
