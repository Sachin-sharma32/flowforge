import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '@/stores/store';

export const selectFolderState = (state: RootState) => state.folder;

export const selectFolders = createSelector(
  [selectFolderState],
  (folderState) => folderState.folders,
);

export const selectFolderLoading = createSelector(
  [selectFolderState],
  (folderState) => folderState.isLoading,
);

export const selectFolderById = createSelector(
  [selectFolders, (_: RootState, folderId: string | null | undefined) => folderId],
  (folders, folderId) => folders.find((folder) => folder.id === folderId),
);
