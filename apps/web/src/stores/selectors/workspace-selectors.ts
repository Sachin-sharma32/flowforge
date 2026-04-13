import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '@/stores/store';

export const selectWorkspaceState = (state: RootState) => state.workspace;

export const selectWorkspaces = createSelector(
  [selectWorkspaceState],
  (workspaceState) => workspaceState.workspaces,
);

export const selectCurrentWorkspace = createSelector(
  [selectWorkspaceState],
  (workspaceState) => workspaceState.currentWorkspace,
);

export const selectCurrentWorkspaceId = createSelector(
  [selectCurrentWorkspace],
  (currentWorkspace) => currentWorkspace?.id ?? null,
);
