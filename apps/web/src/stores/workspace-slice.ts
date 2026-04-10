import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { api } from '@/lib/api-client';

interface Workspace {
  id: string;
  name: string;
  slug: string;
  members: Array<{ userId: string; role: string; joinedAt: string }>;
  settings?: { defaultTimezone?: string; webhookSecret?: string };
}

interface WorkspaceState {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: WorkspaceState = {
  workspaces: [],
  currentWorkspace: null,
  isLoading: false,
  error: null,
};

export const fetchWorkspaces = createAsyncThunk(
  'workspace/fetchWorkspaces',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get('/workspaces');
      return data.data as Workspace[];
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to fetch workspaces');
    }
  },
);

const workspaceSlice = createSlice({
  name: 'workspace',
  initialState,
  reducers: {
    setCurrentWorkspace(state, action: PayloadAction<Workspace>) {
      state.currentWorkspace = action.payload;
    },
    clearWorkspaceError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWorkspaces.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchWorkspaces.fulfilled, (state, action: PayloadAction<Workspace[]>) => {
        state.workspaces = action.payload;
        state.currentWorkspace = action.payload[0] || null;
        state.isLoading = false;
      })
      .addCase(fetchWorkspaces.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setCurrentWorkspace, clearWorkspaceError } = workspaceSlice.actions;
export const workspaceReducer = workspaceSlice.reducer;
