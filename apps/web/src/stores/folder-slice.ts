import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { IFolder } from '@flowforge/shared';
import { api } from '@/lib/api-client';
import { getApiErrorMessage } from '@/lib/api-error';

interface FolderState {
  folders: IFolder[];
  isLoading: boolean;
  error: string | null;
}

const initialState: FolderState = {
  folders: [],
  isLoading: false,
  error: null,
};

export const fetchFolders = createAsyncThunk(
  'folder/fetchFolders',
  async ({ workspaceId }: { workspaceId: string }, { rejectWithValue }) => {
    try {
      const { data } = await api.get(`/workspaces/${workspaceId}/folders`);
      return data.data as IFolder[];
    } catch (err: unknown) {
      return rejectWithValue(getApiErrorMessage(err, 'Failed to fetch folders'));
    }
  },
);

export const createFolder = createAsyncThunk(
  'folder/createFolder',
  async (
    {
      workspaceId,
      input,
    }: {
      workspaceId: string;
      input: Record<string, unknown>;
    },
    { dispatch, rejectWithValue },
  ) => {
    try {
      const { data } = await api.post(`/workspaces/${workspaceId}/folders`, input);
      dispatch(fetchFolders({ workspaceId }));
      return data.data as IFolder;
    } catch (err: unknown) {
      return rejectWithValue(getApiErrorMessage(err, 'Failed to create folder'));
    }
  },
);

export const updateFolder = createAsyncThunk(
  'folder/updateFolder',
  async (
    {
      workspaceId,
      folderId,
      input,
    }: {
      workspaceId: string;
      folderId: string;
      input: Record<string, unknown>;
    },
    { dispatch, rejectWithValue },
  ) => {
    try {
      const { data } = await api.patch(`/workspaces/${workspaceId}/folders/${folderId}`, input);
      dispatch(fetchFolders({ workspaceId }));
      return data.data as IFolder;
    } catch (err: unknown) {
      return rejectWithValue(getApiErrorMessage(err, 'Failed to update folder'));
    }
  },
);

export const deleteFolder = createAsyncThunk(
  'folder/deleteFolder',
  async (
    { workspaceId, folderId }: { workspaceId: string; folderId: string },
    { dispatch, rejectWithValue },
  ) => {
    try {
      await api.delete(`/workspaces/${workspaceId}/folders/${folderId}`);
      dispatch(fetchFolders({ workspaceId }));
      return folderId;
    } catch (err: unknown) {
      return rejectWithValue(getApiErrorMessage(err, 'Failed to delete folder'));
    }
  },
);

const folderSlice = createSlice({
  name: 'folder',
  initialState,
  reducers: {
    clearFolderError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFolders.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchFolders.fulfilled, (state, action: PayloadAction<IFolder[]>) => {
        state.isLoading = false;
        state.folders = action.payload;
      })
      .addCase(fetchFolders.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(createFolder.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      .addCase(updateFolder.rejected, (state, action) => {
        state.error = action.payload as string;
      })
      .addCase(deleteFolder.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export const { clearFolderError } = folderSlice.actions;
export const folderReducer = folderSlice.reducer;
